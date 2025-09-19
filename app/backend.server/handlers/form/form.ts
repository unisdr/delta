import { dr, Tx } from "~/db.server";

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
} from "~/frontend/form";

import { validateFromMapFull } from "~/frontend/form_validate";

import { formStringData } from "~/util/httputil";
import { getUserRoleFromSession, redirectWithMessage } from "~/util/session";

import {
	authActionWithPerm,
	authLoaderWithPerm,
	authLoaderIsPublic,
	authLoaderPublicOrWithPerm,
	authActionGetAuth,
	authLoaderGetAuth,
	authLoaderGetUserForFrontend,
	UserForFrontend,
} from "~/util/auth";

import { getItem2 } from "~/backend.server/handlers/view";

import { PermissionId, RoleId } from "~/frontend/user/roles";
import { logAudit } from "../../models/auditLogs";
import { auditLogsTable, userTable } from "~/drizzle/schema";
import { and, desc, eq } from "drizzle-orm";

export type ErrorResult<T> = { ok: false; errors: Errors<T> };

export type CreateResult<T> = { ok: true; id: any } | ErrorResult<T>;

export type UpdateResult<T> = { ok: true } | ErrorResult<T>;

interface FormCreateArgs<T> {
	queryParams?: string[];
	fieldsDef: FormInputDef<T>[] | (() => Promise<FormInputDef<T>[]>);
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
	let fieldsDef: FormInputDef<T>[] = [];
	if (typeof args.fieldsDef == "function") {
		fieldsDef = await args.fieldsDef();
	} else {
		fieldsDef = args.fieldsDef;
	}

	const { request } = args.actionArgs;
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
	const { request, params } = args.actionArgs;
	const formData = formStringData(await request.formData());
	const data = args.fieldsFromMap(formData, args.fieldsDef);

	const id = params["id"];
	if (!id) {
		throw new Response("Missing item ID", { status: 400 });
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

export type SaveResult<T> = { ok: true; id?: any } | ErrorResult<T>;

interface FormSaveArgs<T> {
	// overwrite id=new logic
	isCreate?: boolean;
	actionArgs: ActionFunctionArgs;
	fieldsDef: FormInputDef<T>[];
	save: (tx: Tx, id: string | null, data: T) => Promise<SaveResult<T>>;
	redirectTo: (id: string) => string;
	queryParams?: string[];
	postProcess?: (id: string, data: T) => Promise<void>;
}

let validApprovalStatusesForDataCollector = [
	"draft",
	"waiting-for-validation",
	"needs-revision",
	"validated",
];

function adjustApprovalStatsBasedOnUserRole(
	role: RoleId,
	isCreate: boolean,
	data: any
): void | null {
	let allow = false;
	if (role === "data-validator" || role == "admin") {
		allow = true;
	}
	if (allow) {
		return null;
	}
	if (role === "data-viewer") {
		throw new Error(
			"got to form save with data-viewer role, this should not happen"
		);
	}
	if (role !== "data-collector") {
		throw new Error("unknown role: 	" + role);
	}
	if (isCreate) {
		if (data && "approvalStatus" in data) {
			if (validApprovalStatusesForDataCollector.includes(data.approvalStatus)) {
				// this is allowed
				return;
			}
			// we already don't allow this in the frontend, so safe to throw error here
			throw new Error(
				`tried to set not allowed status: ${data.approvalStatus} role: ${role}`
			);
			// not allowed, set default as draft
			//data.approvalStatus = "draft"
			//return
		}
		return null;
	}

	if (data && "approvalStatus" in data) {
		if (validApprovalStatusesForDataCollector.includes(data.approvalStatus)) {
			// this is allowed
			return;
		}
		// we already don't allow this in the frontend, so safe to throw error here
		throw new Error(
			`tried to set not allowed status: ${data.approvalStatus} role: ${role}`
		);
		// not allowed, unset so it's not changed
		//	delete data.approvalStatus
		//return
	}
	return null;
}

export async function formSave<T>(
	args: FormSaveArgs<T>
): Promise<FormResponse2<T> | TypedResponse<never>> {
	const { request, params } = args.actionArgs;
	const formData = formStringData(await request.formData());
	let u = new URL(request.url);

	if (args.queryParams) {
		for (let k of args.queryParams) {
			formData[k] = u.searchParams.get(k) || "";
		}
	}

	for (const field of args.fieldsDef) {
		if (
			field.psqlType === "jsonb" &&
			formData[field.key] &&
			typeof formData[field.key] === "string"
		) {
			try {
				formData[field.key] = JSON.parse(formData[field.key]);
			} catch (error) {
				console.error(`Invalid JSON for ${field.key}:`, error);
				return {
					ok: false,
					data: formData as T,
					errors: { [field.key]: ["Invalid JSON format"] },
				};
			}
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

	// const user = authActionGetAuth(args.actionArgs)
	const userRole = await getUserRoleFromSession(request);
	adjustApprovalStatsBasedOnUserRole(
		userRole as RoleId,
		isCreate,
		validateRes.resOk
	);

	let res0: SaveResult<T>;
	let finalId: string | null = null;

	try {
		await dr.transaction(async (tx) => {
			res0 = await args.save(tx, isCreate ? null : id, validateRes.resOk!);
			if (res0.ok) {
				finalId = isCreate ? String(res0.id) : String(id);
			}
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

	if (args.postProcess && finalId) {
		await args.postProcess(finalId, validateRes.resOk!);
	}

	return redirectWithMessage(request, args.redirectTo(redirectId), {
		type: "info",
		text: isCreate ? "New record created" : "Record updated",
	});
}

export interface ObjectWithImportId {
	apiImportId?: string | null | undefined;
}

export type UpsertResult<T> =
	| { ok: true; status: "create" | "update"; id: any }
	| ErrorResult<T>;

export type DeleteResult = { ok: true } | { ok: false; error: string };

interface FormDeleteArgs {
	loaderArgs: LoaderFunctionArgs;
	deleteFn: (id: string) => Promise<DeleteResult>;
	redirectToSuccess: (id: string, oldRecord?: any) => string;
	tableName: string;
	getById: (id: string) => Promise<any>;
	postProcess?: (id: string, data: any) => Promise<void>;
}
interface FormDeleteArgsWithCountryAccounts {
	loaderArgs: LoaderFunctionArgs;
	deleteFn: (id: string, countryAccountsId: string) => Promise<DeleteResult>;
	redirectToSuccess: (id: string, oldRecord?: any) => string;
	tableName: string;
	getById: (id: string) => Promise<any>;
	postProcess?: (id: string, data: any) => Promise<void>;
	countryAccountsId: string;
}

export async function formDelete(args: FormDeleteArgs) {
	const { request, params } = args.loaderArgs;
	const id = params["id"];
	if (!id) {
		throw new Response("Missing item ID", { status: 400 });
	}
	const user = authLoaderGetAuth(args.loaderArgs);
	const oldRecord = await args.getById(id);
	try {
		let res = await args.deleteFn(id);
		if (!res.ok) {
			return {
				error: `Got an error "${res.error}"`,
			};
		}
		await logAudit({
			tableName: args.tableName,
			recordId: id,
			userId: user.user.id,
			action: "delete",
			oldValues: oldRecord,
		});
		if (args.postProcess) {
			await args.postProcess(id, oldRecord);
		}
		return redirectWithMessage(request, args.redirectToSuccess(id, oldRecord), {
			type: "info",
			text: "Record deleted",
		});
	} catch (e) {
		if (
			typeof e === "object" &&
			e !== null &&
			"detail" in e &&
			typeof e.detail == "string"
		) {
			return {
				error: `Got a database error "${e.detail}"`,
			};
		}
		throw e;
	}
}
export async function formDeleteWithCountryAccounts(
	args: FormDeleteArgsWithCountryAccounts
) {
	const { request, params } = args.loaderArgs;
	const id = params["id"];
	if (!id) {
		throw new Response("Missing item ID", { status: 400 });
	}
	const user = authLoaderGetAuth(args.loaderArgs);
	const oldRecord = await args.getById(id);
	try {
		let res = await args.deleteFn(id, args.countryAccountsId);
		if (!res.ok) {
			return {
				error: `Got an error "${res.error}"`,
			};
		}
		await logAudit({
			tableName: args.tableName,
			recordId: id,
			userId: user.user.id,
			action: "delete",
			oldValues: oldRecord,
		});
		if (args.postProcess) {
			await args.postProcess(id, oldRecord);
		}
		return redirectWithMessage(request, args.redirectToSuccess(id, oldRecord), {
			type: "info",
			text: "Record deleted",
		});
	} catch (e) {
		if (
			typeof e === "object" &&
			e !== null &&
			"detail" in e &&
			typeof e.detail == "string"
		) {
			return {
				error: `Got a database error "${e.detail}"`,
			};
		}
		throw e;
	}
}

interface CreateLoaderArgs<T, E extends Record<string, any> = {}> {
	// getByIdAndCountryAccountsId: (id: string, countryAccountsId: string) => Promise<T | null>
	getById: (id: string) => Promise<T | null>;
	extra?: () => Promise<E>;
	// countryAccountsId: string
}

type LoaderData<T, E extends Record<string, any>> = {
	item: T | null;
	user: UserForFrontend;
} & E;

export function createLoader<T, E extends Record<string, any> = {}>(
	props: CreateLoaderArgs<T, E>
) {
	return authLoaderWithPerm(
		"EditData",
		async (args): Promise<LoaderData<T, E>> => {
			let user = await authLoaderGetUserForFrontend(args);
			let p = args.params;
			if (!p.id) throw new Error("Missing id param");
			let extra = (await props.extra?.()) || {};
			if (p.id === "new")
				return { item: null, user, ...extra } as LoaderData<T, E>;
			// let it = await props.getByIdAndCountryAccountsId(p.id, props.countryAccountsId)
			let it = await props.getById(p.id);
			if (!it) throw new Response("Not Found", { status: 404 });
			return { item: it, user, ...extra } as LoaderData<T, E>;
		}
	);
}

interface CreateActionArgs<T> {
	fieldsDef: FormInputDef<T>[] | (() => Promise<FormInputDef<T>[]>);

	create: (
		tx: Tx,
		data: T,
		countryAccountsId: string
	) => Promise<SaveResult<T>>;
	update: (
		tx: Tx,
		id: string,
		data: T,
		countryAccountsId: string
	) => Promise<SaveResult<T>>;
	// getByIdAndCountryAccountsId: (tx: Tx, id: string, countryAccountsId: string) => Promise<T>;
	getById: (tx: Tx, id: string) => Promise<T>;
	redirectTo: (id: string) => string;
	tableName: string;
	action?: (isCreate: boolean) => string;
	postProcess?: (id: string, data: T) => Promise<void>;
	countryAccountsId: string;
}

export function createOrUpdateAction<T>(
	args: CreateActionArgs<T>
) {
	return authActionWithPerm("EditData", async (actionArgs) => {
		let fieldsDef: FormInputDef<T>[] = [];
		if (typeof args.fieldsDef == "function") {
			fieldsDef = await args.fieldsDef();
		} else {
			fieldsDef = args.fieldsDef;
		}
		return formSave<T>({
			actionArgs,
			fieldsDef,
			save: async (tx, id, data) => {
				data = { ...data, countryAccountsId: args.countryAccountsId }
				const user = authActionGetAuth(actionArgs);
				user.user.id;
				if (!id) {
					const newRecord = await args.create(tx, data, args.countryAccountsId);
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
					const updateResult = await args.update(
						tx,
						id,
						data,
						args.countryAccountsId
					);
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
			postProcess: args.postProcess,
		});
	});
}

interface CreateActionArgsWithoutCountryAccountsId<T> {
	fieldsDef: FormInputDef<T>[] | (() => Promise<FormInputDef<T>[]>);

	create: (tx: Tx, data: T) => Promise<SaveResult<T>>;
	update: (tx: Tx, id: string, data: T) => Promise<SaveResult<T>>;
	getById: (tx: Tx, id: string) => Promise<T>;
	redirectTo: (id: string) => string;
	tableName: string;
	action?: (isCreate: boolean) => string;
	postProcess?: (id: string, data: T) => Promise<void>;
}
export function createActionWithoutCountryAccountsId<T>(
	args: CreateActionArgsWithoutCountryAccountsId<T>
) {
	return authActionWithPerm("EditData", async (actionArgs) => {
		let fieldsDef: FormInputDef<T>[] = [];
		if (typeof args.fieldsDef == "function") {
			fieldsDef = await args.fieldsDef();
		} else {
			fieldsDef = args.fieldsDef;
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
			postProcess: args.postProcess,
		});
	});
}

interface CreateViewLoaderArgs<T, E extends Record<string, any> = {}> {
	getById: (id: string) => Promise<T | null>;
	// getByIdAndCountryAccountsId: (id: string, countryAccountsId:string) => Promise<T | null>;
	extra?: (item?: T) => Promise<E>;
	// countryAccountsId: string;
}

export function createViewLoader<T, E extends Record<string, any> = {}>(
	args: CreateViewLoaderArgs<T, E>
) {
	return authLoaderWithPerm("ViewData", async (loaderArgs) => {
		const { params } = loaderArgs;

		// const item = await getItem2(params,  args.getByIdAndCountryAccountsId/*, args.countryAccountsId*/);
		const item = await getItem2(params, args.getById);
		if (!item) {
			throw new Response("Not Found", { status: 404 });
		}
		let extra = (await args.extra?.(item)) || {};
		return { item, ...extra };
	});
}

interface CreateViewLoaderPublicApprovedArgs<
	T extends { approvalStatus: string }
> {
	getById: (id: string) => Promise<T | null | undefined>;
	// getByIdAndCountryAccountsId: (id: string, countryAccountsId: string) => Promise<T | null | undefined>;
}

interface CreateViewLoaderPublicApprovedWithAuditLogArgs<
	T extends { approvalStatus: string }
> {
	getById: (id: string) => Promise<T | null | undefined>;
	// getByIdAndCountryAccountsId: (id: string, countryAccountsId: string) => Promise<T | null | undefined>;
	recordId: string;
	tableName: string;
}

export function createViewLoaderPublicApproved<
	T extends { approvalStatus: string }
>(args: CreateViewLoaderPublicApprovedArgs<T> /*, countryAccountsId: string*/) {
	return async (loaderArgs: LoaderFunctionArgs) => {
		return authLoaderPublicOrWithPerm("ViewData", async (loaderArgs) => {
			const { params } = loaderArgs;
			// const item = await getItem2(params,  args.getByIdAndCountryAccountsId, countryAccountsId);
			const item = await getItem2(params, args.getById);
			if (!item) {
				throw new Response("Not Found", { status: 404 });
			}
			const isPublic = authLoaderIsPublic(loaderArgs);
			if (isPublic) {
				if (item.approvalStatus != "published") {
					throw new Response("Permission denied, item is private", {
						status: 404,
					});
				}
			}
			return { item, isPublic };
		})(loaderArgs);
	};
}

export function createViewLoaderPublicApprovedWithAuditLog<
	T extends { approvalStatus: string }
>(
	args: CreateViewLoaderPublicApprovedWithAuditLogArgs<T> /*, countryAccountsId: string*/
) {
	return async (loaderArgs: LoaderFunctionArgs) => {
		return authLoaderPublicOrWithPerm("ViewData", async (loaderArgs) => {
			const { params } = loaderArgs;
			// const item = await getItem2(params, args.getByIdAndCountryAccountsId, countryAccountsId );
			const item = await getItem2(params, args.getById);
			if (!item) {
				throw new Response("Not Found", { status: 404 });
			}
			const isPublic = authLoaderIsPublic(loaderArgs);
			if (isPublic) {
				if (item.approvalStatus != "published") {
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
			let user = await authLoaderGetUserForFrontend(loaderArgs);

			return { item, isPublic, auditLogs, user };
		})(loaderArgs);
	};
}

interface DeleteActionArgs {
	delete: (id: string) => Promise<DeleteResult>;
	baseRoute?: string;
	tableName: string;
	getById: (id: string) => Promise<any>;
	postProcess?: (id: string, data: any) => Promise<void>;
	redirectToSuccess?: (id: string, oldRecord?: any) => string;
}
interface DeleteActionArgsWithCountryAccounts {
	delete: (id: string, countryAccountsId: string) => Promise<DeleteResult>;
	baseRoute?: string;
	tableName: string;
	getById: (id: string) => Promise<any>;
	postProcess?: (id: string, data: any) => Promise<void>;
	redirectToSuccess?: (id: string, oldRecord?: any) => string;
	countryAccountsId: string;
}

export function createDeleteAction(args: DeleteActionArgs) {
	return createDeleteActionWithPerm("EditData", args);
}
export function createDeleteActionWithCountryAccounts(
	args: DeleteActionArgsWithCountryAccounts
) {
	return createDeleteActionWithPermAndCountryAccounts("EditData", args);
}

export function createDeleteActionWithPerm(
	perm: PermissionId,
	args: DeleteActionArgs
) {
	return authActionWithPerm(perm, async (actionArgs) => {
		return formDelete({
			loaderArgs: actionArgs,
			deleteFn: args.delete,
			redirectToSuccess: args.redirectToSuccess ?? (() => args.baseRoute || ""),
			tableName: args.tableName,
			getById: args.getById,
			postProcess: args.postProcess,
		});
	});
}
export function createDeleteActionWithPermAndCountryAccounts(
	perm: PermissionId,
	args: DeleteActionArgsWithCountryAccounts
) {
	return authActionWithPerm(perm, async (actionArgs) => {
		return formDeleteWithCountryAccounts({
			loaderArgs: actionArgs,
			deleteFn: args.delete,
			redirectToSuccess: args.redirectToSuccess ?? (() => args.baseRoute || ""),
			tableName: args.tableName,
			getById: args.getById,
			postProcess: args.postProcess,
			countryAccountsId: args.countryAccountsId,
		});
	});
}
