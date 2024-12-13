import {useLoaderData, Link} from "@remix-run/react";
import {disasterEventTable} from "~/drizzle/schema";
import {dr} from "~/db.server";
import {createPaginatedLoader} from "~/backend.server/handlers/view";
import {desc} from "drizzle-orm";
import {DataScreen} from "~/frontend/data_screen";
import {formatDate} from "~/util/date";
import {ActionLinks} from "~/frontend/form"

import {
	route,
} from "~/frontend/events/disastereventform";

export const loader = createPaginatedLoader(
	disasterEventTable,
	async (offsetLimit) => {
		return dr.query.disasterEventTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				startDateUTC: true,
				endDateUTC: true,
			},
			orderBy: [desc(disasterEventTable.startDateUTC)],
		});
	},
	[desc(disasterEventTable.startDateUTC)]
);

export default function Data() {
	const ld = useLoaderData<typeof loader>();
	const {items, pagination} = ld.data;
	const dataScreen = DataScreen({
		resourceName: "Disaster Event",
		baseRoute: route,
		columns: ["ID", "Start Date", "End Date", "Actions"],
		items: items,
		paginationData: pagination,
		renderRow: (item, route) => (
			<tr key={item.id}>
				<td>
					<Link to={`${route}/${item.id}`}>{item.id.slice(0, 5)}</Link>
				</td>
				<td>{formatDate(item.startDateUTC)}</td>
				<td>{formatDate(item.endDateUTC)}</td>
				<td>
					<ActionLinks route={route} id={item.id} />

				</td>
			</tr>
		),
	});

	return (
		<>
			<div className="dts-page-header">
				<header className="dts-page-title">
					<div className="mg-container">
						<h1 className="dts-heading-1">Disaster events</h1>
					</div>
				</header>
			</div>
			<section>
				<div className="mg-container">
					{ dataScreen }
				</div>
			</section>
		</>
	);
}

