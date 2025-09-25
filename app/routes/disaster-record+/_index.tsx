import { disasterRecordLoader } from "~/backend.server/handlers/disaster_record";

import { DataScreen } from "~/frontend/data_screen";
import { ActionLinks } from "~/frontend/form";

import { useLoaderData, MetaFunction, Link } from "@remix-run/react";

import { authLoaderPublicOrWithPerm } from "~/util/auth";

import { route } from "~/frontend/disaster-record/form";
import { Filters } from "~/frontend/components/list-page-filters";
import { disasterEventLink } from "~/frontend/events/disastereventform";
import { format } from "date-fns";

export const loader = authLoaderPublicOrWithPerm(
	"ViewData",
	async (loaderArgs) => {
		return disasterRecordLoader({ loaderArgs });
	}
);

export const meta: MetaFunction = () => {
	return [
		{ title: "Disaster Records - DTS" },
		{ name: "description", content: "Disaster Records Repository." },
	];
};

export default function Data() {
	const ld = useLoaderData<typeof loader>();
	const { filters } = ld;
	const { items, pagination } = ld.data;
	return DataScreen({
		isPublic: ld.isPublic,
		plural: "Disaster records",
		resourceName: "Disaster record",
		baseRoute: route,
		columns: ld.isPublic
			? ["Related Disaster Event", "Disaster Event", "Created", "Updated"]
			: [
					"Related Disaster Event",
					"Record Status",
					"Record UUID",
					"Created",
					"Updated",
					"Actions",
			  ],
		items: items,
		paginationData: pagination,
		csvExportLinks: true,
		beforeListElement: (
			<Filters clearFiltersUrl={route} search={filters.search} />
		),
		listName: "disaster records",
		instanceName: ld.instanceName,
		totalItems: pagination.totalItems,
		renderRow: (item, route) => (
			<tr key={item.id}>
				<td>
					{item.disasterEventId &&
						disasterEventLink({ id: item.disasterEventId })}
				</td>

				{!ld.isPublic && (
					<td className="dts-table__cell-centered">
						<span
							className={`dts-status dts-status--${item.approvalStatus}`}
						></span>
						{} {item.approvalStatus}
					</td>
				)}
				<td>
					<Link to={`${route}/${item.id}`}>{item.id.slice(0, 5)}</Link>
				</td>
				<td>{format(new Date(item.createdAt), "dd-MM-yyyy")}</td>
				<td>
					{item.updatedAt
						? format(new Date(item.updatedAt), "dd-MM-yyyy")
						: ""}
				</td>
				<td>
					{ld.isPublic ? null : <ActionLinks route={route} id={item.id} />}
				</td>
			</tr>
		),
	});
}
