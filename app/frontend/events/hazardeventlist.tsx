import {
	useLoaderData,
	Link,
	Form
} from "@remix-run/react";

import {Pagination} from "~/frontend/pagination/view"

import {formatDate} from "~/util/date"

import {HazardPicker} from "~/frontend/hip/hazardpicker"

import {ActionLinks} from "~/frontend/form"

import {
	route,
} from "~/frontend/events/hazardeventform";

import {hazardEventsLoader} from "~/backend.server/handlers/events/hazardevent"

interface ListViewArgs {
	isPublic: boolean
	basePath: string
	linksNewTab?: boolean
	actions?: (item: any) => React.ReactNode
}

export function ListView(args: ListViewArgs) {
	const ld = useLoaderData<Awaited<ReturnType<typeof hazardEventsLoader>>>();

	const {hip, filters} = ld
	const {items} = ld.data

	const pagination = Pagination(ld.data.pagination)

	return (
		<div>
			<div className="dts-filter">
				<h3>Filters</h3>
				<Form>
					<HazardPicker name="hazardId" hip={hip} defaultValue={filters.hazardId || ""} />
					<input type="submit" value="Apply" />
					<Link to={args.basePath}>Clear filters</Link>
				</Form>
			</div>

			{ld.data.pagination.totalItems ? (
				<>
					<table>
						<thead>
							<tr>
								<th>ID</th>
								<th>Start Date</th>
								<th>End Date</th>
								<th>Hazard ID</th>
								<th>Hazard Name</th>
								<th>Event Description</th>
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
