import {
	useLoaderData,
	Link,
	Form
} from "@remix-run/react";

import {Pagination} from "~/frontend/pagination/view"

import {formatDate} from "~/util/date"

import {ActionLinks} from "~/frontend/form"

import {
	route,
} from "~/frontend/resource-repo/form";

import {resourceRepoLoader} from "~/backend.server/handlers/resourcerepo"

interface ListViewArgs {
	isPublic: boolean
	basePath: string
	linksNewTab?: boolean
	actions?: (item: any) => React.ReactNode
}

export function ListView(args: ListViewArgs) {
	const ld = useLoaderData<Awaited<ReturnType<typeof resourceRepoLoader>>>();

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
								<th>Title</th>
								<th>Summary</th>
								<th>Attachments</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{items.map((item, index) => (
								<tr key={index}>
									<td>
										<Link
											to={`/resource-repo/${item.id}`}
											target={args.linksNewTab ? "_blank" : undefined}
										>
											{item.id.slice(0, 8)}
										</Link>
									</td>
									<td>
										{item.title}
									</td>
									<td>
										{item.summary.length <= 300 ? item.summary : item.summary.slice(0, 300) + ' ...'}
									</td>
									<td>

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
