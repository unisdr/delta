import {
	useLoaderData,
	Link,
} from "@remix-run/react"

import {
	damagesTable,
} from "~/drizzle/schema"

import {dr} from "~/db.server"

import {desc} from "drizzle-orm"
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
	let sectorId = url.searchParams.get("sectorId") || ""
	if (!sectorId) {
		console.log("sectorId was not provided in the url")
		throw new Response("Not Found", {status: 404});
	}

	let table = damagesTable
	let dataFetcher = async (offsetLimit: OffsetLimit) => {
		return dr.query.damagesTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				recordId: true,
				sectorId: true,
				damage: true,
				damageAmount: true,
				damageUnitType: true,
				repairCostUnit: true,
				repairCostUnitCurr: true,
				repairUnits: true,
				repairCostTotalOverride: true,
				recoveryCostUnit: true,
				recoveryCostUnitCurr: true,
				recoveryUnits: true,
				recoveryCostTotalOverride: true,
			},
			orderBy: [desc(damagesTable.damageAmount)],
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
		plural: "Damages",
		resourceName: "Damage",
		baseRoute: route2(ld.recordId),
		searchParams: new URLSearchParams([["sectorId", ld.sectorId]]),
		columns: [
			"ID", "Disaster Record ID", "Sector ID", "Damage", "Damage Amount", "Damage Unit Type",
			"Repair Cost Unit", "Repair Cost Currency", "Repair Units", "Repair Cost Total Override",
			"Recovery Cost Unit", "Recovery Cost Currency", "Recovery Units", "Recovery Cost Total Override", "Actions"
		],
		items: items,
		paginationData: pagination,
		csvExportLinks: true,
		renderRow: (item, route) => (
			<tr key={item.id}>
				<td><Link to={`${route}/${item.id}`}>{item.id}</Link></td>
				<td>{item.recordId}</td>
				<td>{item.sectorId}</td>
				<td>{item.damage}</td>
				<td>{item.damageAmount ?? "-"}</td>
				<td>{item.damageUnitType ?? "-"}</td>
				<td>{item.repairCostUnit ?? "-"}</td>
				<td>{item.repairCostUnitCurr ?? "-"}</td>
				<td>{item.repairUnits ?? "-"}</td>
				<td>{item.repairCostTotalOverride ?? "-"}</td>
				<td>{item.recoveryCostUnit ?? "-"}</td>
				<td>{item.recoveryCostUnitCurr ?? "-"}</td>
				<td>{item.recoveryUnits ?? "-"}</td>
				<td>{item.recoveryCostTotalOverride ?? "-"}</td>
				<td><ActionLinks route={route} id={item.id} /></td>
			</tr>
		),
	})
}

