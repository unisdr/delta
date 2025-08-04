import {dr, Tx} from "~/db.server";

import {
	firstError,
	FormError,
	FormInputDef,
} from "~/frontend/form";

import {
	CreateResult,
	ObjectWithImportId,
	SaveResult,
	UpdateResult,
} from "./form";

import {
	upsertApiImportIdMissingError,
	updateMissingIDError,
	ErrorWithCode,
	RowError
} from "./form_utils";

import {validateFromMap, validateFromMapFull} from "~/frontend/form_validate";

export interface CsvCreateArgs<T> {
	data: string[][];
	fieldsDef: FormInputDef<T>[];
	create: (tx: Tx, data: T, countryAccountsId: string) => Promise<SaveResult<T>>;
}

export interface CsvCreateRes {
	ok: boolean;
	res?: string[][];
	error?: ErrorWithCode;
	rowError?: RowError;
}

export async function csvCreate<T>(
	args: CsvCreateArgs<T>,
	countryAccountsId: string
): Promise<CsvCreateRes> {
	if (args.data.length <= 1) {
		return {ok: false, error: {code: "no_data", message: "Empty file"}};
	}

	const headers = args.data[0];
	const rows = args.data.slice(1);
	const res: string[][] = [];

	res.push(["id", ...headers]);

	const fail = () => {
		throw "fail";
	};

	let rowError: RowError | undefined;
	try {
		await dr.transaction(async (tx) => {
			for (const [i, row] of rows.entries()) {
				const rerr = (fe: FormError | string) => {
					rowError =
						typeof fe === "string"
							? {row: i, code: "unknown_error", message: fe}
							: {row: i, ...fe};
					return fail();
				};

				const obj = Object.fromEntries(headers.map((key, i) => [key, row[i]]));
				const validateRes = validateFromMapFull(obj, args.fieldsDef, true);
				if (!validateRes.ok) {
					return rerr(firstError(validateRes.errors)!);
				}
				const one = await args.create(tx, validateRes.resOk!,countryAccountsId);
				if (!one.ok) {
					return rerr(firstError(one.errors)!);
				}
				res.push([one.id, ...row]);
			}
		});
	} catch (error) {
		if (error === "fail") {
			return {ok: false, rowError};
		} else {
			throw error;
		}
	}
	return {ok: true, res};
}

export interface CsvUpdateArgs<T> {
	data: string[][];
	fieldsDef: FormInputDef<T>[];
	update: (tx: Tx, id: string, data: Partial<T>, countryAccountsId: string) => Promise<SaveResult<T>>;
}

export interface CsvUpdateRes {
	ok: boolean;
	error?: ErrorWithCode;
	rowError?: RowError;
}


export async function csvUpdate<T>(
	args: CsvUpdateArgs<T>,
	countryAccountsId: string,
): Promise<CsvUpdateRes> {
	if (args.data.length <= 1) {
		return {ok: false, error: {code: "no_data", message: "Empty file"}};
	}
	const headers = args.data[0];
	const rows = args.data.slice(1);

	const fail = () => {
		throw "fail";
	};

	let rowError: RowError | undefined;
	try {
		await dr.transaction(async (tx) => {
			for (const [i, row] of rows.entries()) {
				const rerr = (fe: FormError | string) => {
					rowError =
						typeof fe === "string"
							? {row: i, code: "unknown_error", message: fe}
							: {row: i, ...fe};
					return fail();
				};
				const item = Object.fromEntries(headers.map((key, i) => [key, row[i]]));
				if (!item.id) {
					return rerr(updateMissingIDError);
				}
				let id = item.id
				delete item.id;
				const validateRes = validateFromMap(item, args.fieldsDef, true, true);
				if (!validateRes.ok) {
					return rerr(firstError(validateRes.errors)!);
				}
				const one = await args.update(tx, id, validateRes.resOk!,countryAccountsId);
				if (!one.ok) {
					return rerr(firstError(one.errors)!);
				}
			}
		});
	} catch (error) {
		if (error === "fail") {
			return {ok: false, rowError};
		} else {
			throw error;
		}
	}
	return {ok: true};
}

export interface CsvUpsertArgs<T extends ObjectWithImportId> {
	data: string[][];
	fieldsDef: FormInputDef<T>[];
	create: (tx: Tx, data: T, countryAccountsId: string) => Promise<CreateResult<T>>;
	update: (tx: Tx, id: string, data: Partial<T>, countryAccountsId: string) => Promise<UpdateResult<T>>;
	idByImportId: (tx: Tx, importId: string) => Promise<string | null>;
}

export interface CsvUpsertRes {
	ok: boolean;
	error?: ErrorWithCode;
	rowError?: RowError;
}

export async function csvUpsert<T extends ObjectWithImportId>(
	args: CsvUpsertArgs<T>,
	countryAccountsId: string,
): Promise<CsvUpsertRes> {
	if (args.data.length <= 1) {
		return {ok: false, error: {code: "no_data", message: "Empty file"}};
	}

	const headers = args.data[0];
	const rows = args.data.slice(1);

	const fail = () => {
		throw "fail";
	};

	let rowError: RowError | undefined;

	try {
		await dr.transaction(async (tx) => {
			for (const [i, row] of rows.entries()) {
				const rerr = (fe: FormError | string) => {
					rowError =
						typeof fe === "string"
							? {row: i, code: "unknown_error", message: fe}
							: {row: i, ...fe};
					return fail();
				};
				const item = Object.fromEntries(headers.map((key, i) => [key, row[i]]));
				if (!item.apiImportId) {
					return rerr(upsertApiImportIdMissingError);
				}
				const validateRes = validateFromMapFull(item, args.fieldsDef, true);
				if (!validateRes.ok) {
					return rerr(firstError(validateRes.errors)!);
				}
				const existingId = await args.idByImportId(tx, item.apiImportId);
				if (existingId) {
					const updateRes = await args.update(
						tx,
						existingId,
						validateRes.resOk!,
						countryAccountsId
					);
					if (!updateRes.ok) {
						return rerr(firstError(updateRes.errors)!);
					}
				} else {
					const createRes = await args.create(tx, validateRes.resOk!,countryAccountsId);
					if (!createRes.ok) {
						return rerr(firstError(createRes.errors)!);
					}
				}
			}
		});
	} catch (error) {
		if (error === "fail") {
			return {ok: false, rowError};
		} else {
			throw error;
		}
	}
	return {ok: true};
}

export interface CsvImportExampleArgs<T> {
	fieldsDef: FormInputDef<T>[];
	importType: ImportType;
}

export interface CsvImportExampleRes {
	ok: boolean;
	res?: string[][];
	error?: string;
}

export type ImportType = "create" | "update" | "upsert";

export async function csvImportExample<T>(
	args: CsvImportExampleArgs<T>
): Promise<CsvImportExampleRes> {
	const {fieldsDef} = args;
	const fieldsDefsNoImportId = fieldsDef.filter(
		(field) => field.key !== "apiImportId"
	);
	const headers = fieldsDefsNoImportId.map((field) => field.key);
	const exampleRow = fieldsDefsNoImportId.map((field) => {
		switch (field.type) {
			case "text":
			case "textarea":
				return "text example";
			case "number":
				return "1";
			case "bool":
				return "true";
			case "date":
				return "2025-01-01";
			case "enum":
			case "enum-flex":
				return field.enumData && field.enumData.length > 0
					? field.enumData[0].key
					: "";
			case "json":
				return JSON.stringify({"k": "any json"})
			case "uuid":
				return "f41bd013-23cc-41ba-91d2-4e325f785171"
			default:
				return "";
		}
	});
	let data = [headers, exampleRow, exampleRow];
	let dataWithID = function (name: string) {
		let res: string[][] = [];
		res.push([name, ...data[0]]);
		for (let i = 1; i < data.length; i++) {
			res.push(["id" + i, ...data[i]]);
		}
		return res;
	};
	switch (args.importType) {
		case "create":
			break;
		case "update":
			data = dataWithID("id");
			break;
		case "upsert":
			data = dataWithID("apiImportId");
			break;
	}

	return {
		ok: true,
		res: data,
	};
}
