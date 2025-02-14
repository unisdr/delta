import {SQL, sql, eq, isNull} from 'drizzle-orm';

import {selectTranslated} from './common';

import {
	divisionTable,
	DivitionInsert,
} from '~/drizzle/schema';

import {dr, Tx} from '~/db.server';

import {parse} from 'csv-parse';

import JSZip from "jszip";

export class UserError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "UserError";
	}
}

export async function divisionsAllLanguages(parentId: number | null): Promise<Record<string, number>> {
	const q = dr
		.select({
			key: sql<string>`jsonb_object_keys(${divisionTable.name})`,
			count: sql<number>`COUNT(*)`,
		})
		.from(divisionTable)
		.where(parentId ? eq(divisionTable.parentId, parentId) : isNull(divisionTable.parentId))
		.groupBy(sql`jsonb_object_keys(${divisionTable.name})`);

	const rows = await q;

	const counts: Record<string, number> = {};
	rows.forEach((row) => {
		counts[row.key] = Number(row.count);
	});

	return counts;
}

export type DivisionBreadcrumbRow = {
	id: number;
	name: string;
	nameLang: string;
	parentId: number | null;
};


export async function divisionBreadcrumb(
	langs: string[],
	divisionId: number,
) {
	const tr = selectTranslated(divisionTable.name, "name", langs);

	const breadcrumbs: DivisionBreadcrumbRow[] = [];

	let currentId: number | null = divisionId;

	while (currentId !== null) {
		const select: {
			id: typeof divisionTable.id
			parentId: typeof divisionTable.parentId
			name: SQL<string>
			nameLang: SQL<string>
		} = {
			id: divisionTable.id,
			parentId: divisionTable.parentId,
			name: tr.name,
			nameLang: tr.nameLang
		};

		const res: DivisionBreadcrumbRow[] = await dr
			.select(select)
			.from(divisionTable)
			.where(eq(divisionTable.id, currentId))
			.limit(1)
		const division = res[0];
		if (!division) break;
		breadcrumbs.unshift(division)
		currentId = division.parentId;
	}

	return breadcrumbs;
}




export function divisionSelect(langs: string[]) {
	let tr = selectTranslated(divisionTable.name, "name", langs)
	let select: {
		id: typeof divisionTable.id,
		name: SQL<string>
		nameLang: SQL<string>
	} = {
		id: divisionTable.id,
		name: tr.name,
		nameLang: tr.nameLang
	};
	return dr.select(select).from(divisionTable)
}

async function parseCSV(data: string): Promise<string[][]> {
	return new Promise((resolve, reject) => {
		const parser = parse({
			delimiter: ",",
		});
		const records: string[][] = [];
		parser.on("readable", function () {
			let record;
			while ((record = parser.read()) !== null) {
				record = record.map((field: string) => field.trim())
				records.push(record);
			}
		});
		parser.on("error", function (err) {
			reject(new UserError(String(err)));
		});

		parser.on("end", function () {
			resolve(records);
		});

		parser.write(data);
		parser.end();
	});
}

export async function importZip(zipBytes: Uint8Array) {
	const zip = await JSZip.loadAsync(zipBytes);
	const divisionsFileName = "divisions-v1.csv"
	const file = zip.files[divisionsFileName];
	const csvStr = await file.async("string");
	const importRes = await importCSV(csvStr);

	for (const [_, v] of importRes) {
		let gf = v.GeodataFileName;
		let file = zip.files["geodata/" + gf]
		if (!file) {
			throw new UserError(`CSV has {gf} in geodata column, but no file with the same name found in geodata folder in ZIP archive.`)
		}
		const geodataStr = await file.async("string")

		await dr
			.update(divisionTable)
			.set({
				geojson: geodataStr,
			})
			.where(eq(divisionTable.id, v.DBID));
	}

	return importRes;
}

export type ImportRes = {
	ImportID: string;
	DBID: number;
	GeodataFileName: string;
};

type DivisionMap = Record<
	string,
	{
		parent: string;
		geodata: string;
		name: Record<string, string>;
	}
>;

export async function importCSV(csvStr: string): Promise<Map<string, ImportRes>> {
	csvStr = csvStr.trim()
	if (!csvStr) {
		throw (new UserError("Empty CSV"))
	}
	let all = await parseCSV(csvStr)
	if (!all.length) {
		throw (new UserError("Empty CSV"))
	}
	let headers = all[0]
	if (headers.length < 3) {
		throw (new UserError("Got less than 3 columns"))
	}
	if (headers[0] != "id") {
		throw (new UserError("Column 1 must have name 'id'"))
	}
	if (headers[1] != "parent") {
		throw (new UserError("Column 2 must have name 'parent'"))
	}
	if (headers[2] != "geodata") {
		throw (new UserError("Column 3 must have name 'geodata'"))
	}
	let langs = headers.slice(3)
	let rows = all.slice(1)

	let byID: DivisionMap = {}

	for (const row of rows) {
		if (row.length != headers.length) {
			throw (new Error("Row length does not match header length"))
		}

		let id = row[0];
		let parent = row[1];
		let geodata = row[2]
		let name: Record<string, string> = {};
		langs.forEach((lang, i) => {
			let v = row[3 + i];
			if (v) {
				name[lang] = row[3 + i];
			}
		});
		byID[id] = {geodata, parent, name}
	}

	const idMap = new Map<string, number>();
	for (const id of Object.keys(byID)) {
		await importDivision(byID, id, idMap);
	}

	let res = new Map<string, ImportRes>();

	for (const [k, v] of idMap) {
		res.set(k, {
			ImportID: k,
			DBID: v,
			GeodataFileName: byID[k].geodata
		})
	}

	return res
}




async function importDivision(
	divisions: DivisionMap,
	importId: string,
	idMap: Map<string, number>
) {
	if (idMap.get(importId)) {
		return null;
	}

	const division = divisions[importId];

	if (!division) {
		throw new UserError(`Division with ID ${importId} not found.`);
	}

	if (division.parent) {
		await importDivision(divisions, division.parent, idMap);
	}

	let parentDbId: number | null = null;
	let parentLevel: number = 1;

	if (division.parent) {
		const res = await dr
			.select({
				id: divisionTable.id,
				parentLevel: divisionTable.level,
			})
			.from(divisionTable)
			.where(eq(divisionTable.importId, division.parent));

		if (res.length == 0) {
			throw new Error(`App error. Imported division not found`)
		}
		parentDbId = res[0].id;
		parentLevel = (res[0].parentLevel) ? res[0].parentLevel + 1 : 1;
	}

	let dbId = await upsertDivision({
		importId: importId,
		parentId: parentDbId,
		name: division.name,
		level: parentLevel,
	});
	idMap.set(importId, dbId);
}

async function upsertDivision(division: DivitionInsert): Promise<number> {
	let parentLevel: number | null = null;


	if (division.parentId == null) {
		parentLevel = 1;
		// console.log('PARENT_ID NULL', division);
	}
	else {
		parentLevel = division.level || 1;
		// console.log('PARENT_ID NOT NULL', division);
	}

	const [res] = await dr.insert(divisionTable)
		.values({
			importId: division.importId,
			parentId: division.parentId,
			name: division.name,
			level: parentLevel,
		})
		.onConflictDoUpdate({
			target: divisionTable.importId,
			set: {
				parentId: division.parentId,
				name: sql`${divisionTable.name} || ${JSON.stringify(division.name)}::jsonb`,
				level: parentLevel,
			},
		})
		.returning({id: divisionTable.id});

	if (!res) throw new Error("Failed to upsert division");
	return res.id;
}


export function fromForm(formData: Record<string, string>): DivitionInsert {
	const {parentId, ...nameFields} = formData;

	const names = Object.entries(nameFields)
		.filter(([key]) => key.startsWith("names[") && key.endsWith("]"))
		.reduce((acc, [key, value]) => {
			const lang = key.slice(6, -1);
			acc[lang] = value;
			return acc;
		}, {} as {[key: string]: string});

	return {
		parentId: parentId ? Number(parentId) : null,
		name: names,
	};
}

export async function update(id: number, data: DivitionInsert): Promise<{ok: boolean; errors?: string[]}> {
	try {
		await dr
			.update(divisionTable)
			.set({
				parentId: data.parentId,
				name: data.name,
				level: data.level,
			})
			.where(eq(divisionTable.id, id));
		return {ok: true};
	} catch (error) {
		return {ok: false, errors: ["Failed to update the division"]};
	}
}


export async function divisionById(id: number) {
	const res = await dr.query.divisionTable.findFirst({
		where: eq(divisionTable.id, id),
		with: {
			divisionParent: true
		}
	});
	return res
}
