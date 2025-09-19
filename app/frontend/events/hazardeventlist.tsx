import { useEffect, useRef } from "react";

import { useLoaderData, Link } from "@remix-run/react";

import { Pagination } from "~/frontend/pagination/view";

import { HazardPicker } from "~/frontend/hip/hazardpicker";

import { ActionLinks } from "~/frontend/form";

import { route } from "~/frontend/events/hazardeventform";

import { hazardousEventsLoader } from "~/backend.server/handlers/events/hazardevent";

import { createFloatingTooltip } from "~/util/tooltip";

import { EventCounter } from "~/components/EventCounter";
import { Filters } from "../components/list-page-filters";

interface ListViewArgs {
	isPublic: boolean;
	basePath: string;
	linksNewTab?: boolean;
	actions?: (item: any) => React.ReactNode;
}

export function ListView(args: ListViewArgs) {
	const ld = useLoaderData<Awaited<ReturnType<typeof hazardousEventsLoader>>>();

	const { hip, filters } = ld;
	const { items } = ld.data;

	const pagination = Pagination(ld.data.pagination);

	// Store the total count in a ref that persists across renders
	const totalCountRef = useRef(ld.data.pagination.totalItems);

	// Check if this is an unfiltered view
	const isUnfiltered = !filters.hipHazardId && !filters.hipClusterId && !filters.hipTypeId && !filters.search;

	// Use effect to update the ref when we see an unfiltered view with a higher count
	useEffect(() => {
		if (isUnfiltered && ld.data.pagination.totalItems > totalCountRef.current) {
			totalCountRef.current = ld.data.pagination.totalItems;
		}
	}, [isUnfiltered, ld.data.pagination.totalItems]);

	// Debug pagination values
	// console.log('Pagination data:', {
	// 	paginationObj: pagination,
	// 	originalPagination: ld.data.pagination,
	// 	itemsLength: items.length,
	// 	totalItems: ld.data.pagination.totalItems,
	// 	totalCountRef: totalCountRef.current,
	// 	isUnfiltered
	// });

	// Refs for the status elements
	const statusRefs = useRef(new Map<number, HTMLElement>());

	useEffect(() => {
		if (typeof window !== "undefined") {
			// This check ensures that DOM-related code runs only in the browser
			items.forEach((item, index) => {
				const element = statusRefs.current.get(index);
				if (element) {
					createFloatingTooltip({
						content: item.approvalStatus,
						target: element,
						placement: "top",
						offsetValue: 8, // You can adjust this value based on your UI needs
						arrowSelector: ".dts-tooltip__arrow", // Ensure you have this CSS class in your styles
					});
				}
			});
		}
	}, [items]);

	return (
		<div>
			<Filters
				search={filters.search}
				clearFiltersUrl={args.basePath}
				formStartElement=
				<>
					{/* <h4>Hazard classification</h4> */}
					<HazardPicker
						hip={hip}
						hazardId={filters.hipHazardId}
						clusterId={filters.hipClusterId}
						typeId={filters.hipTypeId}
					/>
				</>
			/>
			{!args.isPublic && (
				<>
					<div>
						{/* Add the EventCounter component */}
						<span>
							<strong>
								<EventCounter filteredEvents={items.length} totalEvents={totalCountRef.current} />
							</strong>
						</span>
					</div>
					<div className="dts-legend">
						<span className="dts-body-label">Record Status</span>
						<div className="dts-legend__item">
							<span
								className="dts-status dts-status--draft"
								aria-labelledby="legend1"
							></span>
							<span id="legend1">Draft</span>
						</div>
						<div className="dts-legend__item">
							<span
								className="dts-status dts-status--waiting-for-validation"
								aria-labelledby="legend2"
							></span>
							<span id="legend2">Waiting for validation</span>
						</div>
						<div className="dts-legend__item">
							<span
								className="dts-status dts-status--needs-revision"
								aria-labelledby="legend3"
							></span>
							<span id="legend3">Needs revision</span>
						</div>
						<div className="dts-legend__item">
							<span
								className="dts-status dts-status--validated"
								aria-labelledby="legend4"
							></span>
							<span id="legend4">Validated</span>
						</div>
						<div className="dts-legend__item">
							<span
								className="dts-status dts-status--published"
								aria-labelledby="legend2"
							></span>
							<span id="legend2">Published</span>
						</div>
					</div>
				</>
			)}

			{ld.data.pagination.totalItems ? (
				<>
					<table className="dts-table">
						<thead>
							<tr>
								<th>ID</th>
								{!args.isPublic && <th>Status</th>}
								<th>Start Date</th>
								<th>End Date</th>
								<th>Hazard ID</th>
								<th>Hazard Name</th>
								<th>Event Description</th>
								{!args.isPublic && <th>Actions</th>}
							</tr>
						</thead>
						<tbody>
							{items.map((item, index) => (
								<tr key={index}>
									<td>
										<Link
											to={`/hazardous-event/${item.id}`}
											target={args.linksNewTab ? "_blank" : undefined}
										>
											{item.id.slice(0, 5)}
										</Link>
									</td>
									{!args.isPublic && (
										<td className="dts-table__cell-centered">
											<span
												ref={(el) => statusRefs.current.set(index, el!)}
												className={`dts-status dts-status--${item.approvalStatus.toLowerCase()}`}
											></span>
										</td>
									)}
									<td>{item.startDate}</td>
									<td>{item.endDate}</td>
									<td>{item.hipHazardId}</td>
									<td>{item.hipHazard?.nameEn || ""}</td>
									<td>{item.description}</td>
									<td>
										{args.actions ? (
											args.actions(item)
										) : args.isPublic ? null : (
											<ActionLinks route={route} id={item.id} />
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
					{pagination}
				</>
			) : (
				"No hazardous events"
			)}
		</div>
	);
}
