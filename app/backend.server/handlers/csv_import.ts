import {Tx} from "~/db.server";

import {
	authActionWithPerm,
} from "~/util/auth";

import type {
	ActionFunctionArgs,
} from "@remix-run/node";
import {
	unstable_composeUploadHandlers,
	unstable_parseMultipartFormData,
	unstable_createMemoryUploadHandler
} from "@remix-run/node";

import {parseCSV} from "~/util/csv"

import {
	ObjectWithImportId,
	CreateResult,
	UpdateResult,
	csvCreate,
	CsvCreateRes,
	csvUpdate,
	CsvUpdateRes,
	csvUpsert,
	CsvUpsertRes,
	ErrorWithCode
} from "~/backend.server/handlers/form";

import {
	FormInputDef,
} from "~/frontend/form"

import {csvImportExample, ImportType} from "~/backend.server/handlers/form";
import {
	authLoaderWithPerm
} from "~/util/auth";

import {stringifyCSV} from "~/util/csv"


interface CreateActionArgs<T extends ObjectWithImportId> {
	fieldsDef: FormInputDef<T>[]
	create: (tx: Tx, data: T) => Promise<CreateResult<T>>
	update: (tx: Tx, id: string, data: Partial<T>) => Promise<UpdateResult<T>>
	idByImportId: (tx: Tx, importId: string) => Promise<string | null>
}

interface ErrorRes {
	ok: false
	error: ErrorWithCode
}

export interface Res {
	imported?: number
	res: CsvCreateRes | CsvUpdateRes | CsvUpsertRes | ErrorRes
}

export function createAction<T extends ObjectWithImportId>(args: CreateActionArgs<T>) {
	return authActionWithPerm("EditData", async ({request}: ActionFunctionArgs): Promise<Res> => {

		const uploadHandler = unstable_composeUploadHandlers(
			unstable_createMemoryUploadHandler(),
		);

		let formData = await unstable_parseMultipartFormData(
			request,
			uploadHandler
		);
		try {
			const file = formData.get("file")
			if (!(file instanceof File)) {
				throw "File was not set"
			}
			const fileString = await file.text()

			const importType = formData.get("import_type")
			let all = await parseCSV(fileString);
			console.log("got csv", "importType", importType, "rowCount", all.length);
			let imported = all.length - 1;
			switch (importType) {
				case "create":
					{
						let res = await csvCreate({
							data: all,
							fieldsDef: args.fieldsDef,
							create: args.create
						})
						if (!res.ok) {
							return {res}
						}
						return {imported, res}
					}
				case "update":
					{
						let res = await csvUpdate({
							data: all,
							fieldsDef: args.fieldsDef,
							update: args.update
						})
						if (!res.ok) {
							return {res}
						}
						return {imported, res}
					}
				case "upsert":
					{
						let res = await csvUpsert({
							data: all,
							fieldsDef: args.fieldsDef,
							create: args.create,
							update: args.update,
							idByImportId: args.idByImportId
						})
						if (!res.ok) {
							return {res}
						}
						return {imported, res}
					}
			}
			return {res: {ok: false, error: {code: "invalid_import_type", message: "Invalid import_type"}}}
		} catch (err) {
			console.error("Could not import csv", err)
			return {res: {ok: false, error: {code: "server_error", message: "Server error"}}};
		}
	});
}

interface CreateExampleLoaderArgs<T> {
	fieldsDef: FormInputDef<T>[]
}

export function createExampleLoader<T>(args: CreateExampleLoaderArgs<T>) {
	return authLoaderWithPerm("EditData", async (loaderArgs) => {
		const {request} = loaderArgs
		const url = new URL(request.url)
		const importType = url.searchParams.get("import_type") || ""
		if (!["create", "update", "upsert"].includes(importType)) {
			return new Response("Not Found", {status: 404});
		}
		let res = await csvImportExample({
			importType: importType as ImportType,
			fieldsDef: args.fieldsDef,
		})
		if (!res.ok) {
			return new Response(res.error, {
				status: 500,
				headers: {"Content-Type": "text/plain"}
			});
		}
		let data = await stringifyCSV(res.res!)
		const parts = url.pathname.split('/').filter(s => s !== '');
		const typeName = parts.length > 1 ? parts[parts.length - 2] : "";
		let filename = typeName + "-" + importType
		return new Response(data, {
			status: 200,
			headers: {
				"Content-Type": "text/csv",
				"Content-Disposition": `attachment; filename="${filename}.csv"`
			}
		});
	});
}

