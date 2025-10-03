import { useLoaderData, Link } from "@remix-run/react";
import { disasterEventsLoader } from "~/backend.server/handlers/events/disasterevent";

import { DataScreen } from "~/frontend/data_screen";
import { ActionLinks } from "~/frontend/form";

import { route } from "~/frontend/events/disastereventform";

import { Filters } from "../components/list-page-filters";
import { formatDateDisplay } from "~/util/date";

interface ListViewProps {
	titleOverride?: string
	hideMainLinks?: boolean
	linksNewTab?: boolean
	actions?: (item: any) => React.ReactNode
}

export function ListView(props: ListViewProps) {
	const ld = useLoaderData<Awaited<ReturnType<typeof disasterEventsLoader>>>()
	const { filters } = ld
	const { items, pagination } = ld.data;

	return DataScreen({
		hideMainLinks: props.hideMainLinks,
		isPublic: ld.isPublic,
		plural: props.titleOverride ?? "Disaster events",
		resourceName: "Disaster event",
		baseRoute: route,
		columns: ld.isPublic ? [
			"Disaster Event Name",
			"Disaster Event UUID",
			"Records Affiliated",
			"Created",
			"Updated",
		] : [
			"Disaster Event Name",
			"Record Status",
			"Disaster Event UUID",
			"Records Affiliated",
			"Created",
			"Updated",
			"Actions",
		],
		listName: "disaster events",
		instanceName: ld.instanceName,
		totalItems: pagination.totalItems,
		items: items,
		paginationData: pagination,
		csvExportLinks: true,
		beforeListElement: <Filters
			clearFiltersUrl={route}
			search={filters.search}
		/>,
		renderRow: (item, route) => (
			<tr key={item.id}>
				<td>{item.nameNational.length == 0 ? item.nameGlobalOrRegional : item.nameNational}</td>
				{!ld.isPublic && (
					<td className="dts-table__cell-centered">
						<span
							className={`dts-status dts-status--${item.approvalStatus}`}
						></span>
					</td>
				)}
				<td>
					<Link
						to={`${route}/${item.id}`}
						target={props.linksNewTab ? "_blank" : undefined}
					>
						{item.id.slice(0, 5)}
					</Link>
				</td>
				
				<td>TODO</td>
				<td>{formatDateDisplay(item.createdAt, "dd-MM-yyyy")}</td>
				<td>{formatDateDisplay(item.updatedAt, "dd-MM-yyyy")}</td>

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
