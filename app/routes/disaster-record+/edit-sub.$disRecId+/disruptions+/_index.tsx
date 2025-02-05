import {
	useLoaderData,
	Link,
} from "@remix-run/react"

import {
	disruptionTable,
} from "~/drizzle/schema"

import { dr } from "~/db.server"

import { createPaginatedLoader } from "~/backend.server/handlers/view"

import { desc } from "drizzle-orm"
import { DataScreen } from "~/frontend/data_screen"

import { ActionLinks } from "~/frontend/form"

import {
	route
} from "~/frontend/disruption"

export const loader = createPaginatedLoader(
	disruptionTable,
	async (offsetLimit) => {
		return dr.query.disruptionTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				durationDays: true,
				durationHours: true,
				usersAffected: true,
				comment: true,
				responseOperation: true,
				responseCost: true,
				responseCurrency: true,
			},
			orderBy: [desc(disruptionTable.durationDays)],
		})
	},
	[desc(disruptionTable.durationDays)]
)

export default function Data() {
	const ld = useLoaderData<typeof loader>()
	const { items, pagination } = ld.data

	return DataScreen({
		plural: "Disruptions",
		resourceName: "Disruption",
		baseRoute: route,
		columns: [
			"ID", "Duration (Days)", "Duration (Hours)", "Users Affected",
			"Comment", "Response Operation", "Response Cost", "Response Currency", "Actions"
		],
		items: items,
		paginationData: pagination,
		csvExportLinks: true,
		renderRow: (item, route) => (
			<tr key={item.id}>
				<td><Link to={`${route}/${item.id}`}>{item.id}</Link></td>
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

