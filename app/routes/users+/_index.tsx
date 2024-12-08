import type { MetaFunction } from '@remix-run/node';

import {
	useLoaderData,
	Link
} from "@remix-run/react";

import {
	json
} from "@remix-run/node";


import {
	authLoaderWithRole,
} from "~/util/auth";

import { Pagination } from "~/frontend/pagination/view"
import { executeQueryForPagination } from "~/frontend/pagination/api.server"
import {userTable} from "~/drizzle/schema";

export const meta: MetaFunction = () => {
	return [
		{ title: "Users - DTS" },
		{ name: "description", content: "System settings." },
	];
};

export const loader = authLoaderWithRole("ViewUsers",async (loaderArgs) => {
	const { request } = loaderArgs;
	const url = new URL(request.url);
	const search = url.searchParams.get("search") || "";

	/*
	let where: Prisma.UserWhereInput = {}
	if (search){
		where = {
			OR: [
				{
					email: {
						contains: search,
						mode: "insensitive",
					},
				},
				{
					firstName: {
						contains: search,
						mode: "insensitive",
					},
				},
				{
					lastName: {
						contains: search,
						mode: "insensitive",
					},
				},
			],
		}
	}*/

	/*
	const select = ["id", "email", "firstName", "lastName", "role"] as const;
	const res = await executeQueryForPagination<User,typeof select[number]>(request, prisma.user, [...select], where)*/

	const select = {
		id: userTable.id,
		email: userTable.email,
		firstName: userTable.firstName,
		lastName: userTable.lastName,
		role: userTable.role,
		organization: userTable.organization,
		emailVerified: userTable.emailVerified,
		authType: userTable.authType,
	}

	const res = await executeQueryForPagination<UserRes>(request, userTable, select, null)

	return json({
		...res,
		search
	})
});

interface UserRes {
	id: number
	email: string
	firstName: string
	lastName: string
	role: string
	organization: string
	emailVerified: string
	auth: string
	authType: string
}


export default function Data() {
	const ld = useLoaderData<typeof loader>();
	const { items, search } = ld

	const pagination = Pagination(ld.pagination)

	return (
		<div>
			<a href="/users/invite">Invite</a>
			<form method="get" action="/users">
				<input
					type="text"
					name="search"
					defaultValue={search}
					placeholder="Email or Name"
				/>
				<button type="submit">Search</button>
			</form>
			<table border={1} cellPadding={5} cellSpacing={1}>
				<thead>
					<tr>
						<th>Email</th>
						<th>First Name</th>
						<th>Last Name</th>
						<th>Role</th>
						<th>Organization</th>
						<th>Email Verified</th>
						<th>Auth</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{items.map((item, index) => (
						<tr key={index}>
							<td>
								<Link to={`/users/${item.id}`}>{item.email}</Link>
							</td>

							<td>{item.firstName}</td>
							<td>{item.lastName}</td>
							<td>{item.role}</td>
							<td>{item.organization}</td>
							<td>{item.emailVerified.toString()}</td>
							<td>{item.authType}</td>
							<td>
								<Link to={`/users/${item.id}`}>View</Link>&nbsp;
								<Link to={`/users/edit/${item.id}`}>Edit</Link>&nbsp;
								<Link to={`/users/delete/${item.id}`}>Delete</Link>&nbsp;
							</td>
						</tr>
					))}
				</tbody>
			</table>

			{pagination}

		</div>
	);
}

