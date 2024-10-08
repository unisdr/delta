import { prisma } from "~/db.server";

import {
	useLoaderData,
} from "@remix-run/react";

import { Link } from "@remix-run/react";

export const loader = async () => {
	const items = await prisma.item.findMany()
	return { items };
};

export default function Data() {
	const { items } = useLoaderData<typeof loader>();
	return (
		<div>
			<a href="/data/new">New</a>
			<table>
				<thead>
					<tr>
						<th>Field 1</th>
						<th>Field 2</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{items.map((item, index) => (
						<tr key={index}>
							<td>
								<Link to={`/data/${item.id}`}>{item.field1}</Link>
							</td>
							<td>{item.field2}</td>
							<td>
								<Link to={`/data/${item.id}`}>View</Link>&nbsp;
								<Link to={`/data/edit/${item.id}`}>Edit</Link>&nbsp;
								<Link to={`/data/delete/${item.id}`}>Delete</Link>&nbsp;
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

