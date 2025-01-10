import {useState} from "react"
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
import {useFetcher} from "@remix-run/react"
import {DefEnum} from "~/frontend/editabletable/defs";

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

	const [dis, setDis] = useState<(number | null)[]>([null])

	let disItems = dis.map((disVI, disI) => {
		let onChange = function (val: string) {
			if (!val) return
			let dis2 = dis.slice()
			dis2[disI] = Number(val) - 1
			dis2.push(null)
			setDis(dis2)
		}
		return (
			<div key={disI}>
				<label>
					Disaggregation {disI + 1}
					&nbsp;
					<select onChange={(e) => onChange(e.target.value)}>
						<option>Not set</option>
						{data.defs
							.filter((def) => def.type == "enum")
							.map((def, index) => (
								<option key={index} value={index + 1}>
									{def.uiName}
								</option>
							))}
					</select>
					{disVI !== null && (
						<select>
							{data.defs
								.filter((def, index) => index === disVI)
								.flatMap((def) => (def as DefEnum).data.map((item, i) => (
									<option key={i} value={item.key}>
										{item.label}
									</option>
								)))}
						</select>
					)}
				</label>
			</div>
		)
	})

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

			<p></p>
			<p></p>

			<h5>Disaggregations</h5>



			{disItems}

			<p></p>

			<h5>Values</h5>

			{data.defs.filter((def) => def.type == "number").map((def, index) => (
				<div>
				<label>{def.uiName}&nbsp;
					<input type="text"></input>
				</label></div>
			))}

			<p>
				<a href="#">Save</a>&nbsp;
				<a href="#">Revert</a>
			</p>

		</MainContainer>
	);
}



