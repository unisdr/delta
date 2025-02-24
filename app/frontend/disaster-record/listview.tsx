import {
	useLoaderData,
	Link,
	Form
} from "@remix-run/react";

import {Pagination} from "~/frontend/pagination/view"

import {ActionLinks} from "~/frontend/form"

import {
	route,
} from "~/frontend/disaster-record/form";

import {disasterRecordLoader} from "~/backend.server/handlers/disaster_record"

interface ListViewArgs {
	isPublic: boolean
	basePath: string
	linksNewTab?: boolean
	actions?: (item: any) => React.ReactNode
}

export function ListView(args: ListViewArgs) {
	const ld = useLoaderData<Awaited<ReturnType<typeof disasterRecordLoader>>>();

	const {items} = ld.data;

	const pagination = Pagination(ld.data.pagination)

	return (
		<div>
			{ld.data.pagination.totalItems ? (
				<>
					<table className="dts-table">
						<thead>
							<tr>
								<th>ID</th>
								{ !args.isPublic && (
									<th>Status</th>
								)}
								<th>Disaster Event ID</th>
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
											to={`/disaster-record/${item.id}`}
											target={args.linksNewTab ? "_blank" : undefined}
										>
											{item.id.slice(0, 8)}
										</Link>
									</td>
									{ !args.isPublic && (
										<td className="dts-table__cell-centered">
											<span className={`dts-status dts-status--${item.approvalStatus}`}></span>
										</td>
									)}
									<td>
										{item.disasterEventId}
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
				: "No records available."
			}

		</div>
	);

}
