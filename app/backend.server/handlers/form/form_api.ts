import { dr, Tx } from "~/db.server";

import { Errors, FormInputDef } from "~/frontend/form";

import {
	validateFromJson,
	validateFromJsonFull,
} from "~/frontend/form_validate";

import {
	CreateResult,
	ObjectWithImportId,
	SaveResult,
	UpdateResult,
	UpsertResult,
} from "./form";

import {
	upsertApiImportIdMissingError,
	updateMissingIDError,
	errorForForm,
} from "./form_utils";

export interface JsonCreateArgs<T> {
	data: any;
	fieldsDef: FormInputDef<T>[];
	create: (tx: Tx, data: T) => Promise<SaveResult<T>>;
}

export interface JsonCreateRes<T> {
	ok: boolean;
	res: {
		id: string | null;
		errors?: Errors<T>;
	}[];
	error?: string;
}

export async function jsonCreate<T>(
	args: JsonCreateArgs<T>
): Promise<JsonCreateRes<T>> {
	if (!Array.isArray(args.data)) {
		return {
			ok: false,
			res: [],
			error: "Data must be an array of objects",
		};
	}

	const res: { id: string | null; errors?: Errors<T> }[] = [];

	const fail = function () {
		throw "fail";
	};

	try {
		await dr.transaction(async (tx) => {
			for (const item of args.data) {
				const validateRes = validateFromJsonFull(item, args.fieldsDef, true);
				if (!validateRes.ok) {
					res.push({ id: null, errors: validateRes.errors });
					return fail();
				}
				const one = await args.create(tx, validateRes.resOk!);
				if (!one.ok) {
					res.push({ id: null, errors: one.errors });
					return fail();
				}
				res.push({ id: one.id });
			}
		});
	} catch (error) {
		if (error == "fail") {
			return { ok: false, res: res };
		} else {
			throw error;
		}
	}

	return {
		ok: true,
		res,
	};
}

export interface JsonUpsertArgs<T extends ObjectWithImportId> {
	data: any;
	fieldsDef: FormInputDef<T>[];
	create: (tx: Tx, data: T) => Promise<CreateResult<T>>;
	update: (tx: Tx, id: string, data: Partial<T>) => Promise<UpdateResult<T>>;
	idByImportIdAndCountryAccountsId: (tx: Tx, importId: string, countryAccountsId: string) => Promise<string | null>;
	countryAccountsId: string;
}

export interface JsonUpsertRes<T> {
	ok: boolean;
	res: UpsertResult<T>[];
	error?: string;
}

export async function jsonUpsert<T extends ObjectWithImportId>(
	args: JsonUpsertArgs<T>
): Promise<JsonUpsertRes<T>> {
	if (!Array.isArray(args.data)) {
		return {
			ok: false,
			res: [],
			error: "Data must be an array of objects",
		};
	}

	const res: UpsertResult<T>[] = [];

	try {
		await dr.transaction(async (tx) => {
			const fail = function () {
				throw "fail";
			};

			for (const item of args.data) {
				if (!item.apiImportId) {
					res.push(errorForForm(upsertApiImportIdMissingError));
					return fail();
				}

				const validateRes = validateFromJsonFull(item, args.fieldsDef, true);
				if (!validateRes.ok) {
					res.push({ ok: false, errors: validateRes.errors });
					return fail();
				}

				const existingId = await args.idByImportIdAndCountryAccountsId(tx, item.apiImportId, args.countryAccountsId);

				if (existingId) {
					const updateRes = await args.update(
						tx,
						existingId,
						validateRes.resOk!
					);
					if (!updateRes.ok) {
						res.push({ ok: false, errors: updateRes.errors });
						return fail();
					}
					res.push({ ok: true, status: "update", id: existingId });
				} else {
					const createRes = await args.create(tx, validateRes.resOk!);
					if (!createRes.ok) {
						res.push({ ok: false, errors: createRes.errors });
						return fail();
					}
					res.push({ ok: true, status: "create", id: createRes.id });
				}
			}
		});
	} catch (error) {
		if (error == "fail") {
			return { ok: false, res };
		} else {
			throw error;
		}
	}

	return {
		ok: true,
		res,
	};
}

export interface JsonUpdateArgs<T> {
	data: any;
	fieldsDef: FormInputDef<T>[];
	update: (
		tx: Tx,
		id: string,
		countryAccountsId: string,
		data: Partial<T>
	) => Promise<SaveResult<T>>;
	countryAccountsId: string;
}

export interface JsonUpdateRes<T> {
	ok: boolean;
	res: {
		errors?: Errors<T>;
	}[];
	error?: string;
}

export async function jsonUpdate<T>(
	args: JsonUpdateArgs<T>
): Promise<JsonUpdateRes<T>> {
	if (!Array.isArray(args.data)) {
		return {
			ok: false,
			res: [],
			error: "Data must be an array of objects",
		};
	}

	const res: { ok: boolean; errors?: Errors<T> }[] = [];

	try {
		await dr.transaction(async (tx) => {
			const fail = function () {
				throw "fail";
			};

			for (const item of args.data) {
				if (
					typeof item !== "object" ||
					!item.id ||
					typeof item.id !== "string"
				) {
					res.push({
						ok: false,
						errors: {
							form: [updateMissingIDError],
						} as Errors<T>,
					});
					return fail();
				}

				let id = item.id;
				delete item.id;

				const validateRes = validateFromJson(item, args.fieldsDef, true, true);

				if (!validateRes.ok) {
					res.push({ ok: false, errors: validateRes.errors });
					return fail();
				}

				const one = await args.update(tx, id, args.countryAccountsId, validateRes.resOk!);

				if (!one.ok) {
					res.push({ ok: false, errors: one.errors });
					return fail();
				}
				res.push({ ok: true });
			}
		});
	} catch (error) {
		if (error == "fail") {
			return { ok: false, res };
		} else {
			throw error;
		}
	}

	return {
		ok: true,
		res,
	};
}

export interface JsonApiDocsArgs<T> {
	baseUrl: string;
	fieldsDef: FormInputDef<T>[];
	siteUrl: string;
}

function jsonPayloadExample<T>(
	fieldsDef: FormInputDef<T>[]
): Record<string, any> {
	let data: Record<string, any> = {};

	for (let item of fieldsDef) {
		let val: any;
		switch (item.type) {
			case "text":
			case "textarea":
			case "other":
				val = "example string";
				break;
			case "uuid":
				val = "f41bd013-23cc-41ba-91d2-4e325f785171";
				break;
			case "date":
				val = new Date().toISOString();
				break;
			case "date_optional_precision":
				val = "2025-12-30";
				break;
			case "number":
				val = 123;
				break;
			case "bool":
				val = true;
				break;
			case "enum":
			case "enum-flex":
				if (item.enumData!.length) {
					val = item.enumData![0].key;
				} else {
					val = "";
				}
				break;
			case "approval_status":
				val = "draft";
				break;
			case "json":
				val = { k: "any json" };
				break;
			case "money":
				val = "100.01"
				break
			default:
				val = null;
		}

		data[item.key as string] = val;
	}

	return data;
}

export async function jsonApiDocs<T>(
	args: JsonApiDocsArgs<T>
): Promise<string> {
	let parts: string[] = [];
	let line = function (s: string) {
		parts.push(s);
		parts.push("\n");
	};

	let docForEndpoint = function (
		name: string,
		urlPart: string,
		desc: string,
		list?: boolean
	) {
		line("");
		line("## " + name);
		let path = "/api/" + args.baseUrl + "/" + urlPart;
		line(path);
		line(desc);
		line("# Example ");
		let url = args.siteUrl + path;

		line(`export DTS_KEY=YOUR_KEY`);

		if (list) {
			url += "?page=1";
			line(`curl -H "X-Auth:$DTS_KEY" '${url}'`);
		} else {
			let payload = jsonPayloadExample(args.fieldsDef);
			if (urlPart == "update") {
				payload = {
					id: "01308f4d-a94e-41c9-8410-0321f7032d7c",
					...payload,
				};
			}
			let payloadJSON = JSON.stringify(payload, null, 2);
			line(`curl -H "X-Auth:$DTS_KEY" ${url} -d '[${payloadJSON}]'`);
		}
	};

	line("# Endpoints");
	docForEndpoint(
		"Add",
		"add",
		"Adds new records and returns ids, pass all required fields. Use for initial import only."
	);
	docForEndpoint(
		"Update",
		"update",
		"Updates records by id, id is required, only fields that are passed are updated. Use for updates once initial import is done."
	);
	docForEndpoint(
		"Upsert",
		"upsert",
		"Based on apiImportId either creates a new record or updates existing one, pass all fields. Use for initial import only, more convenient that update if you want to import multiple times or for development."
	);
	docForEndpoint("List", "list", "List records.", true);

	line("");
	line("# Fields");
	let fieldsDefJSON = JSON.stringify(args.fieldsDef, null, 2);
	line(fieldsDefJSON);

	return parts.join("");
}
