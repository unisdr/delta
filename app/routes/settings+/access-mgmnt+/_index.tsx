import {
	useLoaderData,
	Link
} from "@remix-run/react";


import {
	authLoaderWithPerm,
} from "~/util/auth";

import {Pagination} from "~/frontend/pagination/view"
import {executeQueryForPagination} from "~/frontend/pagination/api.server"
import {userTable} from "~/drizzle/schema";

import {NavSettings} from "~/routes/settings/nav";
import {MainContainer} from "~/frontend/container";


export const loader = authLoaderWithPerm("ViewUsers", async (loaderArgs) => {
	const {request} = loaderArgs;
	const url = new URL(request.url);
	const search = url.searchParams.get("search") || "";

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

	return {
		...res,
		search
	}
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


export default function Settings() {
	const ld = useLoaderData<typeof loader>();
	const {items, search} = ld

	const pagination = Pagination(ld.pagination)

	return (
		<MainContainer
			title="Access management"
			headerExtra={<NavSettings />}
		>
			<>
				<a href="/settings/access-mgmnt/invite">Invite</a>
				<form method="get" action="/settings/access-mgmnt">
					<input
						type="text"
						name="search"
						defaultValue={search}
						placeholder="Email or Name"
					/>
					<button type="submit">Search</button>
				</form>
				<table className="dts-table" border={1} cellPadding={5} cellSpacing={1}>
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
									<Link to={`/settings/access-mgmnt/${item.id}`}>{item.email}</Link>
								</td>

								<td>{item.firstName}</td>
								<td>{item.lastName}</td>
								<td>{item.role}</td>
								<td>{item.organization}</td>
								<td>{item.emailVerified.toString()}</td>
								<td>{item.authType}</td>
								<td>
									<Link to={`/settings/access-mgmnt/${item.id}`}>View</Link>&nbsp;
									<Link to={`/settings/access-mgmnt/edit/${item.id}`}>Edit</Link>&nbsp;
									<Link to={`/settings/access-mgmnt/delete/${item.id}`}>Delete</Link>&nbsp;
								</td>
							</tr>
						))}
					</tbody>
				</table>

				{pagination}

			</>
		</MainContainer>
	);
}
