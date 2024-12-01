import {
	useLoaderData,
	Link,
} from "@remix-run/react";


import {
	disasterEventTable
} from '~/drizzle/schema';

import {
	authLoaderWithRole,
} from "~/util/auth";

import {dr} from "~/db.server";

import {executeQueryForPagination3, OffsetLimit} from "~/components/pagination/api.server";

import {Pagination} from "~/components/pagination/view"

import {formatDate} from "~/util/date"

import {desc} from 'drizzle-orm';

export const loader = authLoaderWithRole("ViewData", async (loaderArgs) => {
	const {request} = loaderArgs;

	const count = await dr.$count(disasterEventTable)
	const events = async (offsetLimit: OffsetLimit) => {


		return await dr.query.disasterEventTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				startDateUTC: true,
				endDateUTC: true,
			},
			orderBy: [desc(disasterEventTable.startDateUTC)],
		})
	}

	const res = await executeQueryForPagination3(request, count, events, [])
	//let hip = await dataForHazardPicker();

	return {
	//	hip: hip,
		data: res,
	}
});

export default function Data() {
	const ld = useLoaderData<typeof loader>();
	const {items} = ld.data

	const pagination = Pagination(ld.data.pagination)

	return (
		<div>
			<a href="/disaster-event/new">New</a>
			{ld.data.pagination.totalItems ? (
				<>
					<table>
						<thead>
							<tr>
								<th>ID</th>
								<th>Start Date</th>
								<th>End Date</th>
							</tr>
						</thead>
						<tbody>
							{items.map((item, index) => (
								<tr key={index}>
									<td>
										<Link to={`/disaster-event/${item.id}`}>{item.id.slice(0, 5)}</Link>
									</td>
									<td>
										{formatDate(item.startDateUTC)}
									</td>
									<td>
										{formatDate(item.endDateUTC)}
									</td>
									<td>
										<Link to={`/disaster-event/${item.id}`}>View</Link>&nbsp;
										<Link to={`/disaster-event/edit/${item.id}`}>Edit</Link>&nbsp;
										<Link to={`/disaster-event/delete/${item.id}`}>Delete</Link>&nbsp;
									</td>
								</tr>
							))}
						</tbody>
					</table>
					{pagination}
				</>
			)
				: "No disaster events"
			}

		</div>
	);
}


