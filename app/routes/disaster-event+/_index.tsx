import { useLoaderData, Link } from "@remix-run/react";
import { disasterEventsLoader } from "~/backend.server/handlers/events/disasterevent";

import { DataScreen } from "~/frontend/data_screen";
import { formatDate } from "~/util/date";
import { ActionLinks } from "~/frontend/form";

import { route } from "~/frontend/events/disastereventform";

import { authLoaderPublicOrWithPerm } from "~/util/auth";
import {hazardousEventLink} from "~/frontend/events/hazardeventform"

export const loader = authLoaderPublicOrWithPerm(
	"ViewData",
	async (loaderArgs) => {
		return disasterEventsLoader({ loaderArgs });
	}
);

export default function Data() {
	const ld = useLoaderData<typeof loader>();
	const { items, pagination } = ld.data;
	return DataScreen({
		isPublic: ld.isPublic,
		plural: "Disaster events",
		resourceName: "Disaster event",
		baseRoute: route,
		columns: [
			"ID",
			"Status",
			"Hazardous Event",
			"Start Date",
			"End Date",
			"Actions",
		],
		items: items,
		paginationData: pagination,
		csvExportLinks: true,
		renderRow: (item, route) => (
			<tr key={item.id}>
				<td>
					<Link to={`${route}/${item.id}`}>{item.id.slice(0, 5)}</Link>
				</td>
				{!ld.isPublic && (
					<td className="dts-table__cell-centered">
						<span
							className={`dts-status dts-status--${item.approvalStatus}`}
						></span>
					</td>
				)}
				<td>{hazardousEventLink(item.hazardousEvent)}</td>
				<td>{formatDate(item.startDate)}</td>
				<td>{formatDate(item.endDate)}</td>

				<td>
					{ld.isPublic ? null : <ActionLinks route={route} id={item.id} />}
				</td>
			</tr>
		),
	});
}
