import {dr} from "~/db.server";

import {
	useActionData,
	Link,
	useLoaderData
} from "@remix-run/react";

import {
	authLoaderWithPerm,
	authActionWithPerm
} from "~/util/auth";

import {
	unstable_composeUploadHandlers,
	unstable_parseMultipartFormData,
	unstable_createMemoryUploadHandler
} from "@remix-run/node";

import {parseCSV} from "~/util/csv"

import {MainContainer} from "~/frontend/container";
import {HumanEffectsTable, HumanEffectsTableFromString} from "~/frontend/human_effects/defs";
import {create, clearData, defsForTable, validate} from "~/backend.server/models/human_effects";
import {eqArr} from "~/util/array";

export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	const {request, params} = loaderArgs
	let recordId = params.disRecId || ""
	let url = new URL(request.url)
	let tblStr = url.searchParams.get("table") || ""
	let tbl = HumanEffectsTableFromString(tblStr)
	return {recordId, tbl}
});

export interface Res {
	ok: boolean
	imported?: number
	error?: string
}

class UserError extends Error {
	constructor(message: string) {
		super(message)
		this.name = "UserError"
	}
}

export const action = authActionWithPerm("EditData", async (actionArgs): Promise<Res> => {
	const {request, params} = actionArgs
	let recordId = params.disRecId || ""

	const uploadHandler = unstable_composeUploadHandlers(
		unstable_createMemoryUploadHandler(),
	);
	let formData = await unstable_parseMultipartFormData(
		request,
		uploadHandler
	);
	try {
		const tableIdStr = String(formData.get("tableId")) || ""
		const file = formData.get("file")
		if (!(file instanceof File)) {
			throw new UserError("File was not set")
		}
		const fileString = await file.text()

		let all = await parseCSV(fileString);
		if (all.length == 0) {
			throw new UserError("Empty file")
		}
		if (all.length == 1) {
			throw new UserError("Only 1 row in file")
		}

		let imported = all.length - 1;
		console.log("got csv", "rowCount", all.length);

		if (!recordId) {
			throw new Error("No record id")
		}
		let tableOpt: HumanEffectsTable | null = null
		try {
			tableOpt = HumanEffectsTableFromString(tableIdStr)
		} catch (e) {
			return Response.json({ok: false, error: String(e)})
		}
		let table = tableOpt!
		let defs = await defsForTable(table)

		let expectedHeaders = defs.map(d => d.jsName)
		if (!eqArr(all[0], expectedHeaders)) {
			throw new UserError("Unexpected table, wanted: " + expectedHeaders.join(","))
		}
		for (let i = 1; i < all.length; i++) {
			let row = all[i]
			if (row.length != all[0].length) {
				throw new UserError("Invalid row length")
			}
		}
		await dr.transaction(async (tx) => {
			{
				let res = await clearData(tx, table, recordId)
				if (!res.ok) {
					throw res.error
				}
			}
			{
				let res = await create(tx, table, recordId, defs, [], all.slice(1), true)
				if (!res.ok) {
					if (res.error) {
						throw new UserError(String(res.error))
					} else {
						throw new Error("unknown create error")
					}
				}
			}
			let res = await validate(tx, table, recordId, defs)
			if (!res.ok) {
				if (res.error) {
					throw new UserError(String(res.error))
				} else if (res.errors) {
					throw new UserError(String(res.errors[0]))
				} else {
					throw new Error("unknown validate error")
				}
			}
		})
		return {ok: true, imported}
	} catch (e) {
		if (e instanceof UserError) {
			return {ok: false, error: e.message}
		}
		console.error("Could not import csv", e)
		return {ok: false, error: "Server error"};
	}
})

export default function Screen() {
	let ld = useLoaderData<typeof loader>()
	let error = ""
	const ad = useActionData<Res>();
	let submitted = false
	let imported = 0
	if (ad) {
		submitted = true
		if (!ad.ok) {
			error = ad.error || "Application error"
		} else {
			imported = ad.imported || 0
		}
	}

	let baseUrl = "/disaster-record-wip/edit/" + ld.recordId + "/human-effects"

	return (
		<MainContainer
			title="CSV Import"
		>
			<>
				<h3>Uploaded file will replace data for this record and table</h3>
				<form method="post" encType="multipart/form-data" >
					<input type="hidden" name="tableId" value={ld.tbl}></input>
					{submitted && <p>Imported data, new row count is {imported}</p>
					}
					{
						error ? (
							<p>{error} </p>
						) : null
					}
					<label>
						File upload < br />
						<input name="file" type="file"></input>
					</label>
					<input className="mg-button mg-button-primary" type="submit" value="Submit" />
					<div>
						<Link to={baseUrl + "?tbl=" + ld.tbl}> Back to List </Link>
					</div>
				</form>
			</>
		</MainContainer>
	);
}

