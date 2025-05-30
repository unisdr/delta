import {
	useLoaderData,
	Link,
} from "@remix-run/react"

import {
	lossesTable,
} from "~/drizzle/schema"

import {dr} from "~/db.server"

import {and, desc, eq} from "drizzle-orm"
import {DataScreen} from "~/frontend/data_screen"

import {ActionLinks} from "~/frontend/form"

import {
	route2
} from "~/frontend/losses"
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
	let sectorIdStr = url.searchParams.get("sectorId") || ""
	if (!sectorIdStr) {
		console.log("sectorId was not provided in the url")
		throw new Response("Not Found", {status: 404});
	}
	let sectorId = Number(sectorIdStr)

	let table = lossesTable
	let dataFetcher = async (offsetLimit: OffsetLimit) => {
		return dr.query.lossesTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				recordId: true,
				sectorId: true,
			},
			with: {
				sector: true
			},
			where: and(eq(lossesTable.sectorId, sectorId), eq(lossesTable.recordId,recordId as string)),
			orderBy: [desc(lossesTable.id)],
		})
	}

	const count = await dr.$count(table)

	const res = await executeQueryForPagination3(request, count, dataFetcher, ["sectorId"])

	const sectorFullPath = await getSectorFullPathById(sectorId) as string;

	return {data: res, recordId, sectorId, sectorFullPath}
})

export default function Data() {
	const ld = useLoaderData<typeof loader>()
	const {items, pagination} = ld.data

	return DataScreen({
		headerElement: (
			<Link to={"/disaster-record/edit/" + ld.recordId}>Back to disaster record</Link>
		),
		plural: "Losses: Sector Effects: " + ld.sectorFullPath,
		resourceName: "Losses",
		baseRoute: route2(ld.recordId),
		searchParams: new URLSearchParams([["sectorId", String(ld.sectorId)]]),
		columns: [
			"ID", "Disaster Record ID", "Sector", "Type", "Actions"
		],
		items: items,
		paginationData: pagination,
		csvExportLinks: true,
		renderRow: (item, route) => (
			<tr key={item.id}>
				<td><Link to={`${route}/${item.id}`}>{item.id.slice(0,8)}</Link></td>
				<td>{item.recordId.slice(0,8)}</td>
				<td>{item.sector.sectorname}</td>
				<td><ActionLinks route={route} id={item.id} /></td>
			</tr>
		),
	})
}

