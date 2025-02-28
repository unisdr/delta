import {useLoaderData, Link} from "@remix-run/react";
import {disasterEventsLoader} from "~/backend.server/handlers/events/disasterevent";

import {DataScreen} from "~/frontend/data_screen";
import {ActionLinks} from "~/frontend/form";

import {route} from "~/frontend/events/disastereventform";

import {hazardousEventLink} from "~/frontend/events/hazardeventform"

interface ListViewProps {
	titleOverride?: string
	hideMainLinks?: boolean
	linksNewTab?: boolean
	actions?: (item: any) => React.ReactNode
}

export function ListView(props: ListViewProps) {
	const ld = useLoaderData<Awaited<ReturnType<typeof disasterEventsLoader>>>()

	const {items, pagination} = ld.data;
	return DataScreen({
		hideMainLinks: props.hideMainLinks,
		isPublic: ld.isPublic,
		plural: props.titleOverride ?? "Disaster events",
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
					<Link
						to={`${route}/${item.id}`}
						target={props.linksNewTab ? "_blank" : undefined}
					>
						{item.id.slice(0, 5)}
					</Link>
				</td>
				{!ld.isPublic && (
					<td className="dts-table__cell-centered">
						<span
							className={`dts-status dts-status--${item.approvalStatus}`}
						></span>
					</td>
				)}
				<td>{item.hazardousEvent && hazardousEventLink(item.hazardousEvent)}</td>
				<td>{item.startDate}</td>
				<td>{item.endDate}</td>

				<td>
					{props.actions ?
						props.actions(item) :
						(ld.isPublic ? null : <ActionLinks route={route} id={item.id} />)
					}
				</td>
			</tr>
		),
	});

}
