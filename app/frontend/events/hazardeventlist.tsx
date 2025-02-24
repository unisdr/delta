import { useEffect, useRef } from 'react';

import {
	useLoaderData,
	Link,
	Form
} from "@remix-run/react";

import { Pagination } from "~/frontend/pagination/view"

import { formatDate } from "~/util/date"

import { HazardPicker } from "~/frontend/hip/hazardpicker"

import { ActionLinks } from "~/frontend/form"

import {
	route,
} from "~/frontend/events/hazardeventform";

import { hazardEventsLoader } from "~/backend.server/handlers/events/hazardevent"

import { createFloatingTooltip } from "~/util/tooltip";

import { EventCounter } from '~/components/EventCounter';

interface ListViewArgs {
	isPublic: boolean
	basePath: string
	linksNewTab?: boolean
	actions?: (item: any) => React.ReactNode
}

export function ListView(args: ListViewArgs) {
	const ld = useLoaderData<Awaited<ReturnType<typeof hazardEventsLoader>>>();

	const { hip, filters } = ld
	const { items } = ld.data

	const pagination = Pagination(ld.data.pagination)

	// Refs for the status elements
	const statusRefs = useRef(new Map<number, HTMLElement>());

	useEffect(() => {
		if (typeof window !== "undefined") { // This check ensures that DOM-related code runs only in the browser
			items.forEach((item, index) => {
				const element = statusRefs.current.get(index);
				if (element) {
					createFloatingTooltip({
						content: item.approvalStatus,
						target: element,
						placement: "top",
						offsetValue: 8, // You can adjust this value based on your UI needs
						arrowSelector: ".dts-tooltip__arrow" // Ensure you have this CSS class in your styles
					});
				}
			});
		}
	}, [items]);


	return (
		<div>
			<div className="dts-filter">
				<h3>Filters</h3>
				<Form className="dts-form">
					<HazardPicker name="hazardId" hip={hip} defaultValue={filters.hazardId || ""} />
					<div className="dts-form__actions">
						<input type="submit" value="Apply" className="mg-button mg-button-primary" />
						<Link to={args.basePath} className="mg-button mg-button-outline">Clear filters</Link>
					</div>
				</Form>
			</div>
			{!args.isPublic && (
				<><div>{/* Add the EventCounter component */}
					<span >
						<strong><EventCounter totalEvents={items.length} /></strong>
					</span>
				</div><div className="dts-legend">
						<span className="dts-body-label">Status legend</span>
						<div className="dts-legend__item">
							<span className="dts-status dts-status--open"></span> Open
						</div>
						<div className="dts-legend__item">
							<span className="dts-status dts-status--completed"></span> Completed
						</div>
					</div></>
			)}

			{ld.data.pagination.totalItems ? (
				<>
					<table className="dts-table">
						<thead>
							<tr>
								<th>ID</th>
								{!args.isPublic && (
									<th>Status</th>
								)}
								<th>Start Date</th>
								<th>End Date</th>
								<th>Hazard ID</th>
								<th>Hazard Name</th>
								<th>Event Description</th>
								{ !args.isPublic && (
									<th>Actions</th>
								)}
							</tr>
						</thead>
						<tbody>
							{items.map((item, index) => (
								<tr key={index}>
									<td>
										<Link
											to={`/hazard-event/${item.id}`}
											target={args.linksNewTab ? "_blank" : undefined}
										>
											{item.id.slice(0, 5)}
										</Link>

									</td>
									{!args.isPublic && (
										<td className="dts-table__cell-centered">
											<span
												ref={el => statusRefs.current.set(index, el!)}
												className={`dts-status dts-status--${item.approvalStatus.toLowerCase()}`}
											></span>
										</td>
									)}
									<td>
										{formatDate(item.startDate)}
									</td>
									<td>
										{formatDate(item.endDate)}
									</td>
									<td>
										{item.hazardId}
									</td>
									<td>
										{item.hazard.nameEn}
									</td>
									<td>
										{item.description}
									</td>
									<td>
										{args.actions ? args.actions(item) : (args.isPublic ? null :
											<ActionLinks route={route} id={item.id} />)
										}
									</td>
								</tr>
							))}
						</tbody>
					</table>
					{pagination}
				</>
			)
				: "No hazardous events"
			}

		</div>
	);

}