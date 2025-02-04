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

	return (
		<div className="dts-main-container">
			<div>
				<h3 className="dts-heading-3">Filters</h3>
				<Form className="dts-form">
					<div className="dts-form-component mg-grid__col--span-3">
						<HazardPicker name="hazardId" hip={hip} defaultValue={filters.hazardId || ""} />
					</div>
					<div className="mg-grid mg-grid__col-2 dts-form__actions"
						style={{
							gap: "1rem",          // Add spacing between buttons
						}}
					>
						<input type="submit" value="Apply" className="mg-button mg-button--small mg-button-primary" />
						<Link to={args.basePath} className="mg-button mg-button--small mg-button-outline">Clear filters</Link>
					</div>
				</Form>
			</div>

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
								{!args.isPublic && (
									<th></th>
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
											<span className={`dts-status dts-status--${item.approvalStatus}`}></span>
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
