import { authLoaderWithPerm } from "~/util/auth";
import { MainContainer } from "~/frontend/container";
import { Table } from "~/frontend/editabletable/view";
import { validateTotalGroup } from "~/frontend/editabletable/data";
import { LoaderFunction, LoaderFunctionArgs } from "@remix-run/server-runtime";
import { useLoaderData, Link } from "@remix-run/react";
import { HumanEffectsTableFromString, HumanEffectTablesDefs } from "~/frontend/human_effects/defs";
import { Form, useSubmit, useFetcher } from "@remix-run/react"
import { loadData } from "~/backend.server/handlers/human_effects"
import {
	categoryPresenceSet,
	defsForTable
} from '~/backend.server/models/human_effects'
import { dr } from "~/db.server";
import { notifyError } from "~/frontend/utils/notifications";
import { useEffect } from "react"
import { getCountryAccountsIdFromSession } from "~/util/session";


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

	useEffect(() => {
		const vtg = validateTotalGroup(data.totalGroupFlags, data.defs)
		if (vtg.error) {
			notifyError(vtg.error.message)
		}
	}, [data.totalGroupFlags, data.defs])

	let submit = useSubmit()

	return (
		<MainContainer title="Human Effects">
			<Link to={"/disaster-record/edit/" + ld.recordId}>
				Back to disaster record
			</Link>
			<p>{data.tbl.label}</p>

			<Form>
				<select
					name="tbl"
					value={data.tblId}
					onChange={e => {
						submit({ tbl: e.target.value }, {
								replace: true
						})
					}}
				>
					{HumanEffectTablesDefs.map((def) => (
						<option key={def.id} value={def.id}>
							{def.label}
						</option>
					))}
				</select>
			</Form>
			<Table
				lang="default"
				recordId={data.recordId}
				table={data.tblId}
				initialIds={data.ids}
				initialData={data.data}
				initialTotalGroup={data.totalGroupFlags}
				defs={data.defs}
				categoryPresence={data.categoryPresence}
			/>
		</MainContainer>
	);
}
