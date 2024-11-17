import {SQL, asc, sql, eq, isNull} from 'drizzle-orm';

import {selectTranslated} from './common';

import {
	country1Table,
	divisionTable,
	DivitionInsert,
} from '~/drizzle/schema';

import {dr} from '~/db.server';

import {parse} from 'csv-parse';

export async function getCountries(langs: string[]) {
	let tr = selectTranslated(country1Table.name, "name", langs)
	let select: {
		id: typeof country1Table.id
		name: SQL<string>
		nameLang: SQL<string>
	} = {
		id: country1Table.id,
		name: tr.name,
		nameLang: tr.nameLang
	};
	const res = await dr
		.select(select)
		.from(country1Table)
		.orderBy(asc(tr.name));

	return res;
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

type DivisionMap = Record<
	string,
	{
		parent: string;
		name: Record<string, string>;
	}
>;

export async function importCSV(csvStr: string): Promise<Map<string, number>> {
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
	let langs = headers.slice(2)
	let rows = all.slice(1)

	let byID: DivisionMap = {}

	for (const row of rows) {
		if (row.length != headers.length) {
			throw (new Error("Row length does not match header length"))
		}

		let id = row[0];
		let parent = row[1];
		let name: Record<string, string> = {};
		langs.forEach((lang, i) => {
			let v = row[2 + i];
			if (v) {
				name[lang] = row[2 + i];
			}
		});
		byID[id] = {parent: parent, name: name}
	}


	const idMap = new Map<string, number>();
	for (const id of Object.keys(byID)) {
		await importDivision(byID, id, idMap);
	}
	return idMap
}


export class UserError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "UserError";
	}
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

	let parentDbId: number | null = null

	if (division.parent) {
		const res = await dr
			.select({id: divisionTable.id})
			.from(divisionTable)
			.where(eq(divisionTable.importId, division.parent));

		if (res.length == 0) {
			throw new Error(`App error. Imported division not found`)
		}
		parentDbId = res[0].id;
	}
	let dbId = await upsertDivision({
		importId: importId,
		parentId: parentDbId,
		name: division.name,
	});
	idMap.set(importId, dbId);
}

async function upsertDivision(division: DivitionInsert): Promise<number> {
	const [res] = await dr.insert(divisionTable)
		.values({
			importId: division.importId,
			parentId: division.parentId,
			name: division.name,
		})
		.onConflictDoUpdate({
			target: divisionTable.importId,
			set: {
				parentId: division.parentId,
				name: sql`${divisionTable.name} || ${JSON.stringify(division.name)}::jsonb`,
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
			})
			.where(eq(divisionTable.id, id));
		return {ok: true};
	} catch (error) {
		return {ok: false, errors: ["Failed to update the division"]};
	}
}
