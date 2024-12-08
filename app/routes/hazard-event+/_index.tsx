import {
	useLoaderData,
	Link,
	Form
} from "@remix-run/react";


import {
	hazardEventTable,
} from '~/drizzle/schema';

import {
	authLoaderWithRole,
} from "~/util/auth";

import {dr} from "~/db.server";

import {executeQueryForPagination3, OffsetLimit} from "~/frontend/pagination/api.server";


import {Pagination} from "~/frontend/pagination/view"

import {formatDate} from "~/util/date"

import {eq, desc} from 'drizzle-orm';

import {dataForHazardPicker} from "~/backend.server/models/hip_hazard_picker";

import {HazardPicker} from "~/frontend/hip/hazardpicker"

import {ActionLinks} from "~/frontend/form"

import {
	route,
} from "~/frontend/events/hazardeventform";

export const loader = authLoaderWithRole("ViewData", async (loaderArgs) => {
	const {request} = loaderArgs;

	const url = new URL(request.url);
	const extraParams = ["hazardId"];
	const filters = {
		hazardId: url.searchParams.get("hazardId") || ""
	}


	const count = await dr.$count(hazardEventTable)
	const events = async (offsetLimit: OffsetLimit) => {


		return await dr.query.hazardEventTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				hazardId: true,
				startDate: true,
				endDate: true,
				description: true
			},
			orderBy: [desc(hazardEventTable.startDate)],
			with: {
				hazard: {
					columns: {
						nameEn: true,
					},
				}
			},
			where: filters.hazardId
				? eq(hazardEventTable.hazardId, filters.hazardId)
				: undefined,
		})
	}

	const res = await executeQueryForPagination3(request, count, events, extraParams)
	let hip = await dataForHazardPicker();

	return {
		filters,
		hip: hip,
		data: res,
	}
});

export default function Data() {
	const ld = useLoaderData<typeof loader>();
	const {hip, filters} = ld
	const {items} = ld.data

	const pagination = Pagination(ld.data.pagination)

	return (
		<div>
			<a href="/hazard-event/new">New</a>

			<div className="dts-filter">
				<h3>Filters</h3>
				<Form>
					<HazardPicker name="hazardId" hip={hip} defaultValue={filters.hazardId || ""} />
					<input type="submit" value="Apply" />
					<Link to="/hazard-event">Clear filters</Link>
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
										<Link to={`/hazard-event/${item.id}`}>{item.id.slice(0, 5)}</Link>
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
										<ActionLinks route={route} id={item.id} />
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


