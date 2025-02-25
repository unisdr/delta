import {
	useLoaderData,
	Link,
} from "@remix-run/react"

import {
	lossesTable,
} from "~/drizzle/schema"

import {dr} from "~/db.server"

import {desc, eq} from "drizzle-orm"
import {DataScreen} from "~/frontend/data_screen"

import {ActionLinks} from "~/frontend/form"

import {
	route2
} from "~/frontend/losses"
import {authLoaderWithPerm} from "~/util/auth"
import {executeQueryForPagination3, OffsetLimit} from "~/frontend/pagination/api.server"

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
				type: true,
			},
			where: eq(lossesTable.sectorId, sectorId),
			orderBy: [desc(lossesTable.id)],
		})
	}

	const count = await dr.$count(table)

	const res = await executeQueryForPagination3(request, count, dataFetcher, ["sectorId"])

	return {data: res, recordId, sectorId}
})

export default function Data() {
	const ld = useLoaderData<typeof loader>()
	const {items, pagination} = ld.data

	return DataScreen({
		headerElement: (
			<Link to={"/disaster-record/edit/" + ld.recordId}>Back to disaster record</Link>
		),
		plural: "Losses",
		resourceName: "Losses",
		baseRoute: route2(ld.recordId),
		searchParams: new URLSearchParams([["sectorId", String(ld.sectorId)]]),
		columns: [
			"ID", "Disaster Record ID", "Sector ID", "Type", "Actions"
		],
		items: items,
		paginationData: pagination,
		csvExportLinks: true,
		renderRow: (item, route) => (
			<tr key={item.id}>
				<td><Link to={`${route}/${item.id}`}>{item.id}</Link></td>
				<td>{item.recordId}</td>
				<td>{item.sectorId}</td>
				<td>{item.type}</td>
				<td><ActionLinks route={route} id={item.id} /></td>
			</tr>
		),
	})
}

