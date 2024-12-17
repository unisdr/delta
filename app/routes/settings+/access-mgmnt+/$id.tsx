import {dr} from "~/db.server";
import {
	eq,
} from "drizzle-orm";

import {
	userTable
} from '~/drizzle/schema';

import {
	json
} from "@remix-run/node";

import {
	useLoaderData,
	Link
} from "@remix-run/react";


import {
	authLoaderWithPerm,
} from "~/util/auth";

import {NavSettings} from "~/routes/settings/nav";

import {MainContainer} from "~/frontend/container";

export const loader = authLoaderWithPerm("ViewUsers", async (loaderArgs) => {
	const {id} = loaderArgs.params;
	if (!id) {
		throw new Response("Missing item ID", {status: 400});
	}

	const res = await dr.select().from(userTable).where(eq(userTable.id, Number(id)));

	if (!res || res.length === 0) {
		throw new Response("Item not found", {status: 404});
	}

	const item = res[0];

	return json({
		item: {
			id: item.id,
			email: item.email,
			firstName: item.firstName,
			lastName: item.lastName,
			role: item.role,
			organization: item.organization,
			emailVerified: item.emailVerified,
			authType: item.authType,
		},
	});
})

export default function Data() {
	const {item} = useLoaderData<typeof loader>();
	return (<MainContainer
		title="Access management"
		headerExtra={<NavSettings />}
	>
		<>
			<Link to={`/settings/access-mgmnt/edit/${item.id}`}>Edit</Link>
			<Link to="/settings/access-mgmnt/">Back to Users</Link>
			<p>ID: {item.id}</p>
			<p>Email: {item.email}</p>
			<p>First Name: {item.firstName}</p>
			<p>Last Name: {item.lastName}</p>
			<p>Role: {item.role}</p>
			<p>Organization: {item.organization}</p>
			<p>Email Verified: {String(item.emailVerified)}</p>
			<p>Auth Type: {item.authType}</p>
		</>
	</MainContainer>);
}


