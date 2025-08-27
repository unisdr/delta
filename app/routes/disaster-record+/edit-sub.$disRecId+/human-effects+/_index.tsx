import { authLoaderWithPerm } from "~/util/auth";
import { MainContainer } from "~/frontend/container";
import { Table } from "~/frontend/editabletable/view";
import { useLoaderData, Link } from "@remix-run/react";
import {
	HumanEffectsTableFromString,
	HumanEffectTablesDefs,
} from "~/frontend/human_effects/defs";
import { useFetcher } from "@remix-run/react";
import { loadData } from "~/backend.server/handlers/human_effects";
import {
	categoryPresenceSet,
	defsForTable,
} from "~/backend.server/models/human_effects";
import { LoaderFunction, LoaderFunctionArgs } from "@remix-run/server-runtime";
import { getCountryAccountsIdFromSession } from "~/util/session";
import {dr} from "~/db.server";


export const loader: LoaderFunction = async (args: LoaderFunctionArgs) => {
	const { request } = args;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	if (!countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}

	return authLoaderWithPerm("EditData", async (args) => {
		const { params, request } = args;
		let recordId = params.disRecId;
		let url = new URL(request.url);
		let tblStr = url.searchParams.get("tbl") || "";
		return loadData(recordId, tblStr, countryAccountsId);
	})(args);
};

export const action = authLoaderWithPerm("EditData", async (actionArgs) => {
	let { params, request } = actionArgs;
	let recordId = params.disRecId;
	if (!recordId) {
		throw new Error("no record id");
	}
	let formData = await request.formData();
	let tblIdStr = String(formData.get("tblId"));
	let tblId = HumanEffectsTableFromString(tblIdStr);

	let data: Record<string, boolean> = {};
	for (let [k, v] of formData.entries()) {
		if (k == "tblId") {
			continue;
		}
		if (v == "1") {
			data[k] = true;
		} else if (v == "0") {
			data[k] = false;
		}
	}
	let defs = await defsForTable(dr, tblId)
	await categoryPresenceSet(dr, recordId, tblId, defs, data)
	return null
})

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const fetcher = useFetcher<typeof loader>();
	const data = fetcher.data || ld;

	return (
		<MainContainer title="Human Effects">
			<Link to={"/disaster-record/edit/" + ld.recordId}>
				Back to disaster record
			</Link>
			<p>{data.tbl.label}</p>
			<fetcher.Form method="get" action=".">
				<select
					name="tbl"
					value={data.tblId}
					onChange={(e) => fetcher.submit(e.target.form)}
				>
					{HumanEffectTablesDefs.map((def) => (
						<option key={def.id} value={def.id}>
							{def.label}
						</option>
					))}
				</select>
			</fetcher.Form>
			<Table
				lang="en"
				recordId={data.recordId}
				table={data.tblId}
				initialIds={data.ids}
				initialData={data.data}
				initialTotalGroup={data.totalGroup}
				defs={data.defs}
				categoryPresence={data.categoryPresence}
			/>
		</MainContainer>
	);
}
