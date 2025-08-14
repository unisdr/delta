import {
	useLoaderData,
	Link,
} from "@remix-run/react"

import {
	disruptionTable,
} from "~/drizzle/schema"

import {dr} from "~/db.server"

import {and, desc, eq} from "drizzle-orm"
import {DataScreen} from "~/frontend/data_screen"

import {ActionLinks} from "~/frontend/form"

import {
	route2
} from "~/frontend/disruption"
import {authLoaderWithPerm} from "~/util/auth"
import {executeQueryForPagination3, OffsetLimit} from "~/frontend/pagination/api.server"
import { getSectorFullPathById } from "~/backend.server/models/sector";

export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {
	let {params, request} = loaderArgs
	let recordId = params.disRecId
	if (!recordId) {
		throw new Error("Route does not have disRecId param")
	}
	let url = new URL(request.url)
	let sectorId = url.searchParams.get("sectorId") || ""
	if (!sectorId) {
		console.log("sectorId was not provided in the url")
		throw new Response("Not Found", {status: 404});
	}

	let table = disruptionTable
	let dataFetcher = async (offsetLimit: OffsetLimit) => {
		return dr.query.disruptionTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				recordId: true,
				sectorId: true,
				durationDays: true,
				durationHours: true,
				usersAffected: true,
				comment: true,
				responseOperation: true,
				responseCost: true,
				responseCurrency: true,
			},
			with: {
				sector: true
			},
			where: and(eq(disruptionTable.sectorId, sectorId), eq(disruptionTable.recordId,recordId!)),
			orderBy: [desc(disruptionTable.durationDays)],
		})
	}

	const count = await dr.$count(table);

	const res = await executeQueryForPagination3(request, count, dataFetcher, ["sectorId"]);

	const sectorFullPath = await getSectorFullPathById(sectorId) as string;

	return {data: res, recordId, sectorId, sectorFullPath}
});

export default function Data() {
	const ld = useLoaderData<typeof loader>()
	const {items, pagination} = ld.data

	return DataScreen({
		headerElement: (
			<Link to={"/disaster-record/edit/" + ld.recordId}>Back to disaster record</Link>
		),
		plural: "Disruptions: Sector Effects: " + ld.sectorFullPath,
		resourceName: "Disruption",
		baseRoute: route2(ld.recordId),
		searchParams: new URLSearchParams([["sectorId", String(ld.sectorId)]]),
		columns: [
			"ID", "Disaster Record ID", "Sector", "Duration (Days)", "Duration (Hours)", "Users Affected",
			"Comment", "Response Operation", "Response Cost", "Response Currency", "Actions"
		],
		items: items,
		paginationData: pagination,
		csvExportLinks: true,
		renderRow: (item, route) => (
			<tr key={item.id}>
				<td><Link to={`${route}/${item.id}`}>{item.id.slice(0,8)}</Link></td>
				<td>{item.recordId.slice(0,8)}</td>
				<td>{item.sector.sectorname}</td>
				<td>{item.durationDays ?? "-"}</td>
				<td>{item.durationHours ?? "-"}</td>
				<td>{item.usersAffected ?? "-"}</td>
				<td>{item.comment ?? "-"}</td>
				<td>{item.responseOperation ?? "-"}</td>
				<td>{item.responseCost ?? "-"}</td>
				<td>{item.responseCurrency ?? "-"}</td>
				<td><ActionLinks route={route} id={item.id} /></td>
			</tr>
		),
	})
}

