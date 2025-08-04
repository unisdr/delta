import { Tx } from "~/db.server";

import { authActionWithPerm } from "~/util/auth";

import type { ActionFunctionArgs } from "@remix-run/node";
import {
	unstable_composeUploadHandlers,
	unstable_parseMultipartFormData,
	unstable_createMemoryUploadHandler,
} from "@remix-run/node";

import { parseCSV } from "~/util/csv";

import { ObjectWithImportId, CreateResult, UpdateResult } from "./form";

import {
	csvCreate,
	csvUpdate,
	csvUpsert,
	CsvCreateRes,
	CsvUpdateRes,
	CsvUpsertRes,
	csvImportExample,
	ImportType,
} from "./form_csv";

import { ErrorWithCode } from "./form_utils";

import { FormInputDef } from "~/frontend/form";

import { authLoaderWithPerm } from "~/util/auth";

import { stringifyCSV } from "~/util/csv";
import { getCountryAccountsIdFromSession } from "~/util/session";

interface CreateActionArgs<T extends ObjectWithImportId> {
	fieldsDef: FormInputDef<T>[] | (() => Promise<FormInputDef<T>[]>);

	create: (
		tx: Tx,
		data: T,
		countryAccountsId: string
	) => Promise<CreateResult<T>>;
	update: (
		tx: Tx,
		id: string,
		data: Partial<T>,
		countryAccountsId: string
	) => Promise<UpdateResult<T>>;
	idByImportId: (tx: Tx, importId: string) => Promise<string | null>;
}

interface ErrorRes {
	ok: false;
	error: ErrorWithCode;
}

export interface Res {
	imported?: number;
	res: CsvCreateRes | CsvUpdateRes | CsvUpsertRes | ErrorRes;
}

export function createAction<T extends ObjectWithImportId>(
	args: CreateActionArgs<T>
) {
	return authActionWithPerm(
		"EditData",
		async ({ request }: ActionFunctionArgs): Promise<Res> => {
			let fieldsDef: FormInputDef<T>[] = [];
			if (typeof args.fieldsDef == "function") {
				fieldsDef = await args.fieldsDef();
			} else {
				fieldsDef = args.fieldsDef;
			}

			const uploadHandler = unstable_composeUploadHandlers(
				unstable_createMemoryUploadHandler()
			);

			let formData = await unstable_parseMultipartFormData(
				request,
				uploadHandler
			);
			try {
				const file = formData.get("file");
				if (!(file instanceof File)) {
					throw "File was not set";
				}
				const fileString = await file.text();

				const importType = formData.get("import_type");
				let all = await parseCSV(fileString);
				let imported = all.length - 1;
				try {
					const countryAccountsId = await getCountryAccountsIdFromSession(request);
					switch (importType) {
						case "create": {
							let res = await csvCreate(
								{
									data: all,
									fieldsDef,
									create: args.create,
								},
								countryAccountsId
							);
							if (!res.ok) {
								return { res };
							}
							return { imported, res };
						}
						case "update": {
							let res = await csvUpdate(
								{
									data: all,
									fieldsDef,
									update: args.update,
								},
								countryAccountsId
							);
							if (!res.ok) {
								return { res };
							}
							return { imported, res };
						}
						case "upsert": {
							let res = await csvUpsert(
								{
									data: all,
									fieldsDef,
									create: args.create,
									update: args.update,
									idByImportId: args.idByImportId,
								},
								countryAccountsId
							);
							if (!res.ok) {
								return { res };
							}
							return { imported, res };
						}
					}
				} catch (e) {
					if (
						typeof e === "object" &&
						e !== null &&
						"detail" in e &&
						typeof e.detail == "string"
					) {
						return {
							res: {
								ok: false,
								error: { code: "pg_error", message: e.detail },
							},
						};
					}
					throw e;
				}
				return {
					res: {
						ok: false,
						error: {
							code: "invalid_import_type",
							message: "Invalid import_type",
						},
					},
				};
			} catch (err) {
				console.error("Could not import csv", err);
				return {
					res: {
						ok: false,
						error: { code: "server_error", message: "Server error" },
					},
				};
			}
		}
	);
}

interface CreateExampleLoaderArgs<T> {
	fieldsDef: FormInputDef<T>[] | (() => Promise<FormInputDef<T>[]>);
}

export function createExampleLoader<T>(args: CreateExampleLoaderArgs<T>) {
	return authLoaderWithPerm("EditData", async (loaderArgs) => {
		const { request } = loaderArgs;
		const url = new URL(request.url);
		const importType = url.searchParams.get("import_type") || "";
		if (!["create", "update", "upsert"].includes(importType)) {
			return new Response("Not Found", { status: 404 });
		}
		let fieldsDef: FormInputDef<T>[] = [];
		if (typeof args.fieldsDef == "function") {
			fieldsDef = await args.fieldsDef();
		} else {
			fieldsDef = args.fieldsDef;
		}
		let res = await csvImportExample({
			importType: importType as ImportType,
			fieldsDef: fieldsDef,
		});
		if (!res.ok) {
			return new Response(res.error, {
				status: 500,
				headers: { "Content-Type": "text/plain" },
			});
		}
		let data = await stringifyCSV(res.res!);
		const parts = url.pathname.split("/").filter((s) => s !== "");
		const typeName = parts.length > 1 ? parts[parts.length - 2] : "";
		let filename = typeName + "-" + importType;
		return new Response(data, {
			status: 200,
			headers: {
				"Content-Type": "text/csv",
				"Content-Disposition": `attachment; filename="${filename}.csv"`,
			},
		});
	});
}
