import {dr, Tx} from "~/db.server";

import {
	LoaderFunctionArgs,
	ActionFunctionArgs,
	TypedResponse,
} from "@remix-run/node";

import {
	Errors,
	FormResponse,
	FormResponse2,
	FormInputDef,
	FormError,
	firstError,
} from "~/frontend/form";

import {
	validateFromMap,
	validateFromMapFull,
	validateFromJson,
	validateFromJsonFull,
} from "~/frontend/form_validate";

import {formStringData} from "~/util/httputil";
import {redirectWithMessage} from "~/util/session";

import {
	authActionWithPerm,
	authLoaderWithPerm,
	authLoaderIsPublic,
	authLoaderPublicOrWithPerm,
	authActionGetAuth,
} from "~/util/auth";

import {getItem2} from "~/backend.server/handlers/view";
import {configApprovedRecordsArePublic, configSiteURL} from "~/util/config";

import {PermissionId} from "~/frontend/user/roles";
import {logAudit} from "../models/auditLogs";
import {auditLogsTable, userTable} from "~/drizzle/schema";
import {and, desc, eq} from "drizzle-orm";

export type ErrorResult<T> = {ok: false; errors: Errors<T>};

export type CreateResult<T> = {ok: true; id: any} | ErrorResult<T>;

export type UpdateResult<T> = {ok: true} | ErrorResult<T>;

export function errorForForm<T>(err: FormError): ErrorResult<T> {
	return {
		ok: false,
		errors: {
			form: [err],
		},
	};
}

export function errorForField<T extends Record<string, any>>(
	field: keyof T,
	err: FormError
): ErrorResult<T> {
	return {
		ok: false,
		errors: {
			fields: createFields(field, err),
		},
	};
}

function createFields<T extends Record<string, any>>(
	field: keyof T,
	err: string | FormError
): Partial<Record<keyof T, (string | FormError)[]>> {
	return {[field]: [err]} as Partial<Record<keyof T, (string | FormError)[]>>;
}

interface FormCreateArgs<T> {
	queryParams?: string[];
	fieldsDef: FormInputDef<T>[] | (() => Promise<FormInputDef<T>[]>)
	actionArgs: ActionFunctionArgs;
	fieldsFromMap: (
		formData: Record<string, string>,
		def: FormInputDef<T>[]
	) => T;
	create: (data: T) => Promise<CreateResult<T>>;
	redirectTo: (id: string) => string;
}

export async function formCreate<T>(
	args: FormCreateArgs<T>
): Promise<FormResponse<T> | TypedResponse<never>> {
	let fieldsDef: FormInputDef<T>[] = []
	if (typeof args.fieldsDef == "function") {
		fieldsDef = await args.fieldsDef()
	} else {
		fieldsDef = args.fieldsDef
	}

	const {request} = args.actionArgs;
	const formData = formStringData(await request.formData());
	let u = new URL(request.url);
	if (args.queryParams) {
		for (let k of args.queryParams) {
			formData[k] = u.searchParams.get(k) || "";
		}
	}
	const data = args.fieldsFromMap(formData, fieldsDef);
	const res = await args.create(data);
	if (!res.ok) {
		return {
			ok: false,
			data: data,
			errors: res.errors,
		} as FormResponse<T>;
	}
	return redirectWithMessage(request, args.redirectTo(String(res.id)), {
		type: "info",
		text: "New record created",
	});
}

interface FormUpdateArgs<T> {
	actionArgs: ActionFunctionArgs;
	fieldsDef: FormInputDef<T>[];
	fieldsFromMap: (
		formData: Record<string, string>,
		def: FormInputDef<T>[]
	) => T;
	update: (id: string, data: T) => Promise<UpdateResult<T>>;
	redirectTo: (id: string) => string;
}

export async function formUpdate<T>(
	args: FormUpdateArgs<T>
): Promise<FormResponse<T> | TypedResponse<never>> {
	const {request, params} = args.actionArgs;
	const formData = formStringData(await request.formData());
	const data = args.fieldsFromMap(formData, args.fieldsDef);

	const id = params["id"];
	if (!id) {
		throw new Response("Missing item ID", {status: 400});
	}

	const res = await args.update(id, data);
	if (!res.ok) {
		return {
			ok: false,
			data: data,
			errors: res.errors,
		} as FormResponse<T>;
	}
	return redirectWithMessage(request, args.redirectTo(id), {
		type: "info",
		text: "Record updated",
	});
}

export type SaveResult<T> = {ok: true; id?: any} | ErrorResult<T>;

interface FormSaveArgs<T> {
	// overwrite id=new logic
	isCreate?: boolean;
	actionArgs: ActionFunctionArgs;
	fieldsDef: FormInputDef<T>[];
	save: (tx: Tx, id: string | null, data: T) => Promise<SaveResult<T>>;
	redirectTo: (id: string) => string;
	queryParams?: string[];
}

export async function formSave<T>(
	args: FormSaveArgs<T>
): Promise<FormResponse2<T> | TypedResponse<never>> {
	const {request, params} = args.actionArgs;
	const formData = formStringData(await request.formData());
	let u = new URL(request.url);

	if (args.queryParams) {
		for (let k of args.queryParams) {
			formData[k] = u.searchParams.get(k) || "";
		}
	}

	const validateRes = validateFromMapFull(formData, args.fieldsDef, false);
	if (!validateRes.ok) {
		return {
			ok: false,
			data: validateRes.data,
			errors: validateRes.errors,
		};
	}

	const id = params["id"] || null;
	const isCreate = args.isCreate || id === "new";

	let res0: SaveResult<T>;

	try {
		await dr.transaction(async (tx) => {
			res0 = await args.save(tx, isCreate ? null : id, validateRes.resOk!);
		});
	} catch (error) {
		throw error;
	}

	let res = res0!;

	if (!res.ok) {
		return {
			ok: false,
			data: validateRes.data,
			errors: res.errors,
		} as FormResponse<T>;
	}

	const redirectId = isCreate ? String(res.id) : String(id);
	return redirectWithMessage(request, args.redirectTo(redirectId), {
		type: "info",
		text: isCreate ? "New record created" : "Record updated",
	});
}

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

	const res: {id: string | null; errors?: Errors<T>}[] = [];

	const fail = function () {
		throw "fail";
	};

	try {
		await dr.transaction(async (tx) => {
			for (const item of args.data) {
				const validateRes = validateFromJsonFull(item, args.fieldsDef, true);
				if (!validateRes.ok) {
					res.push({id: null, errors: validateRes.errors});
					return fail();
				}
				const one = await args.create(tx, validateRes.resOk!);
				if (!one.ok) {
					res.push({id: null, errors: one.errors});
					return fail();
				}
				res.push({id: one.id});
			}
		});
	} catch (error) {
		if (error == "fail") {
			return {ok: false, res: res};
		} else {
			throw error;
		}
	}

	return {
		ok: true,
		res,
	};
}

export interface ObjectWithImportId {
	apiImportId?: string | null | undefined;
}

export interface JsonUpsertArgs<T extends ObjectWithImportId> {
	data: any;
	fieldsDef: FormInputDef<T>[];
	create: (tx: Tx, data: T) => Promise<CreateResult<T>>;
	update: (tx: Tx, id: string, data: Partial<T>) => Promise<UpdateResult<T>>;
	idByImportId: (tx: Tx, importId: string) => Promise<string | null>;
}

export type UpsertResult<T> =
	| {ok: true; status: "create" | "update"; id: any}
	| ErrorResult<T>;

export interface JsonUpsertRes<T> {
	ok: boolean;
	res: UpsertResult<T>[];
	error?: string;
}

export const UpsertApiImportIdMissingError: FormError = {
	code: "UpsertApiImportIdMissingError",
	message: "When using upsert apiImportId is required on each object.",
};

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
					res.push(errorForForm(UpsertApiImportIdMissingError));
					return fail();
				}

				const validateRes = validateFromJsonFull(item, args.fieldsDef, true);
				if (!validateRes.ok) {
					res.push({ok: false, errors: validateRes.errors});
					return fail();
				}

				const existingId = await args.idByImportId(tx, item.apiImportId);

				if (existingId) {
					const updateRes = await args.update(
						tx,
						existingId,
						validateRes.resOk!
					);
					if (!updateRes.ok) {
						res.push({ok: false, errors: updateRes.errors});
						return fail();
					}
					res.push({ok: true, status: "update", id: existingId});
				} else {
					const createRes = await args.create(tx, validateRes.resOk!);
					if (!createRes.ok) {
						res.push({ok: false, errors: createRes.errors});
						return fail();
					}
					res.push({ok: true, status: "create", id: createRes.id});
				}
			}
		});
	} catch (error) {
		if (error == "fail") {
			return {ok: false, res};
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
	update: (tx: Tx, id: string, data: Partial<T>) => Promise<SaveResult<T>>;
}

export interface JsonUpdateRes<T> {
	ok: boolean;
	res: {
		errors?: Errors<T>;
	}[];
	error?: string;
}

var jsonUpdateMissingIDError = {
	code: "missingId",
	message: "Each item must be an object with a valid 'id' field.",
};

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

	const res: {ok: boolean; errors?: Errors<T>}[] = [];

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
							form: [jsonUpdateMissingIDError],
						} as Errors<T>,
					});
					return fail();
				}

				let id = item.id;
				delete item.id;

				const validateRes = validateFromJson(item, args.fieldsDef, true, true);

				if (!validateRes.ok) {
					res.push({ok: false, errors: validateRes.errors});
					return fail();
				}

				const one = await args.update(tx, id, validateRes.resOk!);

				if (!one.ok) {
					res.push({ok: false, errors: one.errors});
					return fail();
				}
				res.push({ok: true});
			}
		});
	} catch (error) {
		if (error == "fail") {
			return {ok: false, res};
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
			case "date":
				val = new Date().toISOString();
				break;
			case "number":
				val = 123;
				break;
			case "bool":
				val = true;
				break;
			case "enum":
			case "enum-flex":
				val = item.enumData![0].key;
				break;
			default:
				val = null;
		}

		data[item.key as string] = val;
	}

	return data;
}

export function jsonApiDocs<T>(args: JsonApiDocsArgs<T>): string {
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
		let url = configSiteURL() + path;

		line(`export DTS_KEY=YOUR_KEY`);

		if (list) {
			url += "?page=1";
			line(`curl -H "X-Auth:$DTS_KEY" '${url}'`);
		} else {
			let payload = jsonPayloadExample(args.fieldsDef);
			if (urlPart == "update") {
				payload = {
					id: "123",
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

export type DeleteResult = {ok: true} | {ok: false; error: string};

interface FormDeleteArgs {
	loaderArgs: LoaderFunctionArgs;
	deleteFn: (id: string) => Promise<DeleteResult>;
	redirectToSuccess: (id: string) => string;
	redirectToError?: (id: string) => string;
	tableName: string;
	getById: (id: string) => Promise<any>;
}

export async function formDelete(args: FormDeleteArgs) {
	const {request, params} = args.loaderArgs;
	const id = params["id"];
	if (!id) {
		throw new Response("Missing item ID", {status: 400});
	}
	const user = authActionGetAuth(args.loaderArgs);
	const oldRecord = await args.getById(id);
	let res = await args.deleteFn(id);
	if (!res.ok) {
		let u = "";
		if (args.redirectToError) {
			u = args.redirectToError(id);
		} else {
			u = args.redirectToSuccess(id);
		}
		return redirectWithMessage(request, u, {
			type: "error",
			text: "Could not delete item: " + res.error,
		});
	}
	await logAudit({
		tableName: args.tableName,
		recordId: id,
		userId: user.user.id,
		action: "delete",
		oldValues: oldRecord,
	});
	return redirectWithMessage(request, args.redirectToSuccess(id), {
		type: "info",
		text: "Record deleted",
	});
}

interface CreateLoaderArgs<T, E extends Record<string, any> = {}> {
	getById: (id: string) => Promise<T | null>
	extra?: () => Promise<E>
}

type LoaderData<T, E extends Record<string, any>> = {
	item: T | null
} & E

export function createLoader<T, E extends Record<string, any> = {}>(props: CreateLoaderArgs<T, E>) {
	return authLoaderWithPerm("EditData", async (args): Promise<LoaderData<T, E>> => {
		let p = args.params
		if (!p.id) throw new Error("Missing id param")
		let extra = (await props.extra?.()) || {}
		if (p.id === "new") return {item: null, ...extra} as LoaderData<T, E>
		let it = await props.getById(p.id)
		if (!it) throw new Response("Not Found", {status: 404})
		return {item: it, ...extra} as LoaderData<T, E>
	})
}


interface CreateActionArgs<T> {
	fieldsDef: FormInputDef<T>[] | (() => Promise<FormInputDef<T>[]>)

	create: (tx: Tx, data: T) => Promise<SaveResult<T>>;
	update: (tx: Tx, id: string, data: T) => Promise<SaveResult<T>>;
	getById: (tx: Tx, id: string) => Promise<T>;
	redirectTo: (id: string) => string;
	tableName: string;
	action?: (isCreate: boolean) => string;
}

export function createAction<T>(args: CreateActionArgs<T>) {
	return authActionWithPerm("EditData", async (actionArgs) => {
		let fieldsDef: FormInputDef<T>[] = []
		if (typeof args.fieldsDef == "function") {
			fieldsDef = await args.fieldsDef()
		} else {
			fieldsDef = args.fieldsDef
		}
		return formSave<T>({
			actionArgs,
			fieldsDef,
			save: async (tx, id, data) => {
				const user = authActionGetAuth(actionArgs);
				user.user.id;
				if (!id) {
					const newRecord = await args.create(tx, data);
					if (newRecord.ok) {
						logAudit({
							tableName: args.tableName,
							recordId: String(newRecord.id),
							userId: user.user.id,
							action: args.action ? args.action(true) : "create",
							newValues: data,
						});
					}
					return newRecord;
				} else {
					//Update operation
					const oldRecord = await args.getById(tx, id);
					const updateResult = await args.update(tx, id, data);
					if (updateResult.ok) {
						await logAudit({
							tableName: args.tableName,
							recordId: id,
							userId: user.user.id,
							action: args.action ? args.action(false) : "update",
							oldValues: oldRecord,
							newValues: data,
						});
					}
					return updateResult;
				}
			},
			redirectTo: args.redirectTo,
		});
	});
}


interface CreateViewLoaderArgs<T, E extends Record<string, any> = {}> {
	getById: (id: string) => Promise<T | null>;
	extra?: () => Promise<E>
}

export function createViewLoader<T, E extends Record<string, any> = {}>(args: CreateViewLoaderArgs<T, E>) {
	return authLoaderWithPerm("ViewData", async (loaderArgs) => {
		const {params} = loaderArgs;
		const item = await getItem2(params, args.getById);
		if (!item) {
			throw new Response("Not Found", {status: 404});
		}
		let extra = (await args.extra?.()) || {}
		return {item, ...extra};
	});
}


interface CreateViewLoaderPublicApprovedArgs<
	T extends {approvalStatus: string}
> {
	getById: (id: string) => Promise<T | null | undefined>;
}

interface CreateViewLoaderPublicApprovedWithAuditLogArgs<
	T extends {approvalStatus: string}
> {
	getById: (id: string) => Promise<T | null | undefined>;
	recordId: string;
	tableName: string;
}

export function createViewLoaderPublicApproved<
	T extends {approvalStatus: string}
>(args: CreateViewLoaderPublicApprovedArgs<T>) {
	if (!configApprovedRecordsArePublic()) {
		return authLoaderWithPerm("ViewData", async (loaderArgs) => {
			const {params} = loaderArgs;
			const item = await getItem2(params, args.getById);
			if (!item) {
				throw new Response("Not Found", {status: 404});
			}
			return {item, isPublic: false};
		});
	}

	return authLoaderPublicOrWithPerm("ViewData", async (loaderArgs) => {
		const {params} = loaderArgs;
		const item = await getItem2(params, args.getById);
		if (!item) {
			throw new Response("Not Found", {status: 404});
		}
		const isPublic = authLoaderIsPublic(loaderArgs);
		if (isPublic) {
			if (item.approvalStatus != "approved") {
				throw new Response("Permission denied, item is private", {
					status: 404,
				});
			}
		}
		return {item, isPublic};
	});
}

export function createViewLoaderPublicApprovedWithAuditLog<
	T extends {approvalStatus: string}
>(args: CreateViewLoaderPublicApprovedWithAuditLogArgs<T>) {
	if (!configApprovedRecordsArePublic()) {
		return authLoaderWithPerm("ViewData", async (loaderArgs) => {
			const {params} = loaderArgs;
			const item = await getItem2(params, args.getById);
			if (!item) {
				throw new Response("Not Found", {status: 404});
			}
			return {item, isPublic: false, auditLogs: []};
		});
	}

	return authLoaderPublicOrWithPerm("ViewData", async (loaderArgs) => {
		const {params} = loaderArgs;
		const item = await getItem2(params, args.getById);
		if (!item) {
			throw new Response("Not Found", {status: 404});
		}
		const isPublic = authLoaderIsPublic(loaderArgs);
		if (isPublic) {
			if (item.approvalStatus != "approved") {
				throw new Response("Permission denied, item is private", {
					status: 404,
				});
			}
		}

		const auditLogs = await dr
			.select({
				id: auditLogsTable.id,
				action: auditLogsTable.action,
				by: userTable.firstName,
				organization: userTable.organization,
				timestamp: auditLogsTable.timestamp,
			})
			.from(auditLogsTable)
			.leftJoin(userTable, eq(auditLogsTable.userId, userTable.id))
			.where(
				and(
					eq(auditLogsTable.tableName, args.tableName),
					eq(auditLogsTable.recordId, args.recordId)
				)
			)
			.orderBy(desc(auditLogsTable.timestamp));

		return {item, isPublic, auditLogs};
	});
}

interface DeleteLoaderArgs {
	delete: (id: string) => Promise<DeleteResult>;
	baseRoute: string;
	tableName: string;
	getById: (id: string) => Promise<any>;
}

export function createDeleteLoader(args: DeleteLoaderArgs) {
	return createDeleteLoaderWithPerm("EditData", args);
}

export function createDeleteLoaderWithPerm(
	perm: PermissionId,
	args: DeleteLoaderArgs
) {
	return authLoaderWithPerm(perm, async (loaderArgs) => {
		return formDelete({
			loaderArgs,
			deleteFn: args.delete,
			redirectToSuccess: () => args.baseRoute,
			redirectToError: (id: string) => `${args.baseRoute}/${id}`,
			tableName: args.tableName,
			getById: args.getById,
		});
	});
}

export interface CsvCreateArgs<T> {
	data: string[][];
	fieldsDef: FormInputDef<T>[];
	create: (tx: Tx, data: T) => Promise<SaveResult<T>>;
}

export interface ErrorWithCode {
	code: string;
	message: string;
}

export interface RowError extends FormError {
	row: number;
}

export interface CsvCreateRes {
	ok: boolean;
	res?: string[][];
	error?: ErrorWithCode;
	rowError?: RowError;
}

export async function csvCreate<T>(
	args: CsvCreateArgs<T>
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
				const one = await args.create(tx, validateRes.resOk!);
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
	update: (tx: Tx, id: string, data: Partial<T>) => Promise<SaveResult<T>>;
}

export interface CsvUpdateRes {
	ok: boolean;
	error?: ErrorWithCode;
	rowError?: RowError;
}

export async function csvUpdate<T>(
	args: CsvUpdateArgs<T>
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
					return rerr(jsonUpdateMissingIDError);
				}
				delete item.id;
				const validateRes = validateFromMap(item, args.fieldsDef, true, true);
				if (!validateRes.ok) {
					return rerr(firstError(validateRes.errors)!);
				}
				const one = await args.update(tx, item.id, validateRes.resOk!);
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
	create: (tx: Tx, data: T) => Promise<CreateResult<T>>;
	update: (tx: Tx, id: string, data: Partial<T>) => Promise<UpdateResult<T>>;
	idByImportId: (tx: Tx, importId: string) => Promise<string | null>;
}

export interface CsvUpsertRes {
	ok: boolean;
	error?: ErrorWithCode;
	rowError?: RowError;
}

export async function csvUpsert<T extends ObjectWithImportId>(
	args: CsvUpsertArgs<T>
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
					return rerr(UpsertApiImportIdMissingError);
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
						validateRes.resOk!
					);
					if (!updateRes.ok) {
						return rerr(firstError(updateRes.errors)!);
					}
				} else {
					const createRes = await args.create(tx, validateRes.resOk!);
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
