import {
	useLoaderData,
	Link,
} from "@remix-run/react"

import {
	lossesTable,
} from "~/drizzle/schema"

import {dr} from "~/db.server"

import {desc} from "drizzle-orm"
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
	let sectorId = url.searchParams.get("sectorId") || ""
	if (!sectorId) {
		console.log("sectorId was not provided in the url")
		throw new Response("Not Found", {status: 404});
	}

	let table = lossesTable
	let dataFetcher = async (offsetLimit: OffsetLimit) => {
		return dr.query.lossesTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				recordId: true,
				sectorId: true,
				type: true,
				publicValue: true,
				publicTotalCost: true,
				privateTotalCost: true,
			},
			orderBy: [desc(lossesTable.publicValue)],
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
			<Link to={"/disaster-record/"+ld.recordId}>Back to disaster record</Link>
		),
		plural: "Losses",
		resourceName: "Loss",
		baseRoute: route2(ld.recordId),
		searchParams: new URLSearchParams([["sectorId", ld.sectorId]]),
		columns: [
			"ID", "Disaster Record ID", "Sector ID", "Type", "Public Value", "Public Total Cost", "Private Total Cost", "Actions"
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
				<td>{item.publicValue ?? "-"}</td>
				<td>{item.publicTotalCost ?? "-"}</td>
				<td>{item.privateTotalCost ?? "-"}</td>
				<td><ActionLinks route={route} id={item.id} /></td>
			</tr>
		),
	})
}

