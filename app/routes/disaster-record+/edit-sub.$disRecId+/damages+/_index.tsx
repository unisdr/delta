import {
	useLoaderData,
	Link,
} from "@remix-run/react"

import {
	damagesTable,
} from "~/drizzle/schema"

import {dr} from "~/db.server"

import {and, desc, eq} from "drizzle-orm"
import {DataScreen} from "~/frontend/data_screen"

import {ActionLinks} from "~/frontend/form"

import {
	route2
} from "~/frontend/damages"
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

	let table = damagesTable
	let dataFetcher = async (offsetLimit: OffsetLimit) => {
		return dr.query.damagesTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				recordId: true,
				sectorId: true,
			},

			with: {
				asset: true,
				sector: true,
			},
			where: and(eq(damagesTable.sectorId, sectorId), eq(damagesTable.recordId, recordId!)),
			orderBy: [desc(damagesTable.id)],
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
		plural: "Damages",
		resourceName: "Damage",
		baseRoute: route2(ld.recordId),
		searchParams: new URLSearchParams([["sectorId", String(ld.sectorId)]]),
		columns: [
			"ID", "Asset", "Sector", "Actions"
		],
		items: items,
		paginationData: pagination,
		csvExportLinks: true,
		renderRow: (item, route) => (
			<tr key={item.id}>
				<td><Link to={`${route}/${item.id}`}>{item.id.slice(0,8)}</Link></td>
				<td>{item.asset.name}</td>
				<td>{item.sector.sectorname}</td>
				<td><ActionLinks route={route} id={item.id} /></td>
			</tr>
		),
	})
}

