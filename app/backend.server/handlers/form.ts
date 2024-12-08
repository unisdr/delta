import {LoaderFunctionArgs, ActionFunctionArgs, TypedResponse} from "@remix-run/node";

import {Errors, FormResponse, FormInputDef} from "~/frontend/form"

import {formStringData} from "~/util/httputil";
import {redirectWithMessage} from "~/util/session";

import {
	fieldsFromMap,
} from "~/frontend/form";

import {
	authActionWithRole,
	authLoaderWithRole,
} from "~/util/auth";

import {
	getItem2,
} from "~/backend.server/handlers/view";

export type CreateResult<T> =
	| {ok: true; id: any}
	| {ok: false; errors: Errors<T>};

interface FormCreateArgs<T> {
	queryParams?: string[];
	fieldsDef: FormInputDef<T>[],
	actionArgs: ActionFunctionArgs,
	fieldsFromMap: (formData: Record<string, string>, def: FormInputDef<T>[]) => T,
	create: (data: T) => Promise<CreateResult<T>>,
	redirectTo: (id: string) => string
}

export async function formCreate<T>(args: FormCreateArgs<T>): Promise<FormResponse<T> | TypedResponse<never>> {
	const {request} = args.actionArgs;
	const formData = formStringData(await request.formData());
	let u = new URL(request.url);
	if (args.queryParams) {
		for (let k of args.queryParams) {
			formData[k] = u.searchParams.get(k) || "";
		}
	}
	const data = args.fieldsFromMap(formData, args.fieldsDef);
	const res = await args.create(data);
	if (!res.ok) {
		return {
			ok: false,
			data: data,
			errors: res.errors
		} as FormResponse<T>
	}
	return redirectWithMessage(request, args.redirectTo(String(res.id)), {type: "info", text: "New record created"})
}

export type UpdateResult<T> =
	| {ok: true;}
	| {ok: false; errors: Errors<T>};

interface FormUpdateArgs<T> {
	actionArgs: ActionFunctionArgs,
	fieldsDef: FormInputDef<T>[],
	fieldsFromMap: (formData: Record<string, string>, def: FormInputDef<T>[]) => T,
	update: (id: string, data: T) => Promise<UpdateResult<T>>,
	redirectTo: (id: string) => string
}

export async function formUpdate<T>(args: FormUpdateArgs<T>): Promise<FormResponse<T> | TypedResponse<never>> {
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
			errors: res.errors
		} as FormResponse<T>
	}
	return redirectWithMessage(request, args.redirectTo(id), {type: "info", text: "Record updated"})
}

export type SaveResult<T> =
	| {ok: true; id?: any}
	| {ok: false; errors: Errors<T>};

interface FormSaveArgs<T> {
	actionArgs: ActionFunctionArgs;
	fieldsDef: FormInputDef<T>[];
	fieldsFromMap: (formData: Record<string, string>, def: FormInputDef<T>[]) => T;
	save: (id: string | null, data: T) => Promise<SaveResult<T>>;
	redirectTo: (id: string) => string;
	queryParams?: string[];
}

export async function formSave<T>(args: FormSaveArgs<T>): Promise<FormResponse<T> | TypedResponse<never>> {
	const {request, params} = args.actionArgs;
	const formData = formStringData(await request.formData());
	let u = new URL(request.url);

	if (args.queryParams) {
		for (let k of args.queryParams) {
			formData[k] = u.searchParams.get(k) || "";
		}
	}

	const data = args.fieldsFromMap(formData, args.fieldsDef);
	const id = params["id"] || null;
	const isCreate = id === "new";

	const res = await args.save(isCreate ? null : id, data);

	if (!res.ok) {
		return {
			ok: false,
			data: data,
			errors: res.errors,
		} as FormResponse<T>;
	}

	const redirectId = isCreate ? String(res.id) : String(id);
	return redirectWithMessage(
		request,
		args.redirectTo(redirectId),
		{
			type: "info",
			text: isCreate ? "New record created" : "Record updated",
		}
	);
}


export type DeleteResult =
	| {ok: true;}
	| {ok: false; error: string};

interface FormDeleteArgs {
	loaderArgs: LoaderFunctionArgs,
	deleteFn: (id: string) => Promise<DeleteResult>,
	redirectToSuccess: (id: string) => string
	redirectToError?: (id: string) => string
}

export async function formDelete(args: FormDeleteArgs) {
	const {request, params} = args.loaderArgs;
	const id = params["id"];
	if (!id) {
		throw new Response("Missing item ID", {status: 400});
	}
	let res = await args.deleteFn(id);
	if (!res.ok) {
		let u = ""
		if (args.redirectToError) {
			u = args.redirectToError(id)
		} else {
			u = args.redirectToSuccess(id)
		}
		return redirectWithMessage(request, u, {type: "error", text: "Could not delete item: " + res.error})
	}
	return redirectWithMessage(request, args.redirectToSuccess(id), {type: "info", text: "Record deleted"})
}

interface CreateLoaderArgs<T> {
	getById: (id: string) => Promise<T | null>
}

export function createLoader<T>(args: CreateLoaderArgs<T>) {
	return authLoaderWithRole("EditData", async (loaderArgs) => {
		const {params} = loaderArgs;
		if (!params.id) {
			throw "Route does not have $id param";
		}
		if (params.id === "new") {
			return {item: null};
		}
		const item = await args.getById(params.id);
		if (!item) {
			throw new Response("Not Found", {status: 404});
		}

		return {item};
	});
}

interface CreateActionArgs<T> {
	fieldsDef: any;
	create: (data: T) => Promise<SaveResult<T>>;
	update: (id: string, data: T) => Promise<SaveResult<T>>;
	redirectTo: (id: string) => string;
}

export function createAction<T>(args: CreateActionArgs<T>) {
	return authActionWithRole("EditData", async (actionArgs) => {
		return formSave<T>({
			actionArgs,
			fieldsDef: args.fieldsDef,
			fieldsFromMap: fieldsFromMap,
			save: async (id, data) => {
				if (!id) {
					return args.create(data);
				} else {
					return args.update(id, data);
				}
			},
			redirectTo: args.redirectTo,
		});
	});
}

interface CreateViewLoaderArgs<T> {
	getById: (id: string) => Promise<T | null>
}

export function createViewLoader<T>(args: CreateViewLoaderArgs<T>) {
	return authLoaderWithRole("ViewData", async (loaderArgs) => {
		const {params} = loaderArgs;
		const item = await getItem2(params, args.getById);
		if (!item) {
			throw new Response("Not Found", {status: 404});
		}
		return {item};
	});
}

interface DeleteLoaderArgs {
	delete: (id: string) => Promise<DeleteResult>,
	baseRoute: string;
}

export function createDeleteLoader(args: DeleteLoaderArgs) {
	return authLoaderWithRole("EditData", async (loaderArgs) => {
		return formDelete({
			loaderArgs,
			deleteFn: args.delete,
			redirectToSuccess: () => args.baseRoute,
			redirectToError: (id: string) => `${args.baseRoute}/${id}`,
		});
	});
}

