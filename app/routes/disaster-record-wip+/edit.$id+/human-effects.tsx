import {dr} from "~/db.server";
import {authLoaderWithPerm} from "~/util/auth";
import {MainContainer} from "~/frontend/container";
import {Table} from "~/frontend/editabletable/view";
import {useLoaderData} from "@remix-run/react";
import {defsForTable, HumanEffectsTable, HumanEffectTablesDefs} from "~/frontend/human_effects/defs";
import {
	get,
	GetRes
} from '~/backend.server/models/human_effects'
import { useFetcher } from "@remix-run/react"

export const loader = authLoaderWithPerm("EditData", async (actionArgs) => {
	const {params, request} = actionArgs
	let recordId = params.id
	if (!recordId) {
		throw new Error("no record id")
	}
	let url = new URL(request.url)
	let tblStr = url.searchParams.get("tbl") || ""
	let tbl: HumanEffectsTable
	if (!tblStr) {
		tbl = "Deaths"
	} else if (tblStr == "Deaths" || tblStr == "Injuries" || tblStr == "Missing" || tblStr == "Affected" || tblStr == "Displaced" || tblStr == "DisplacementStocks") {
		tbl = tblStr
	} else {
		throw new Error("unknown table: " + tblStr)
	}
	const defs = defsForTable(tbl)
	let res: GetRes | null = null
	await dr.transaction(async (tx) => {
		res = await get(tx, tbl, recordId, defs)
	})
	res = res!
	if (!res.ok) {
		throw new Error(res.error)
	}
	return {
		tbl: tbl,
		recordId,
		defs: defs,
		ids: res.ids,
		data: res.data
	}
});

export default function Screen() {
	const ld = useLoaderData<typeof loader>()
	const fetcher = useFetcher<typeof loader>()
	const data = fetcher.data || ld

	return (
		<MainContainer title="Human Effects TODO">
			<p>{data.tbl}</p>
			<fetcher.Form method="get" action=".">
				<select
					name="tbl"
					value={data.tbl}
					onChange={e => fetcher.submit(e.target.form)}
				>
					{HumanEffectTablesDefs.map(def => (
						<option key={def.id} value={def.id}>
							{def.label}
						</option>
					))}
				</select>
			</fetcher.Form>
			<Table
				recordId={data.recordId}
				table={data.tbl}
				initialIds={data.ids}
				initialData={data.data}
				defs={data.defs}
			/>
		</MainContainer>
	);
}



