import {
	json
} from "@remix-run/node";

import {
		useLoaderData,
		Link
} from "@remix-run/react";

import { prisma } from "~/db.server";

import {
	authLoaderWithRole,
} from "~/util/auth";


export const loader = authLoaderWithRole("ViewUsers", async (loaderArgs) => {
	const { id } = loaderArgs.params;
	if (!id) {
		throw new Response("Missing item ID", { status: 400 });
	}
	const item = await prisma.user.findUnique({
		where: { id: Number(id) },
	});
	if (!item) {
		throw new Response("Item not found", { status: 404 });
	}
	return json({
		item: {
			id: item.id,
			email: item.email,
			firstName: item.firstName,
			lastName: item.lastName,
			role: item.role
		},
	});
})

export default function Data() {
	const {item} = useLoaderData<typeof loader>();
	return (
		<div>
			<Link to={`/users/edit/${item.id}`}>Edit</Link>
			<Link to="/users">Back to Users</Link>
			<p>ID: {item.id}</p>
			<p>Email: {item.email}</p>
			<p>First Name: {item.firstName}</p>
			<p>Last Name: {item.lastName}</p>
			<p>Role: {item.role}</p>
		</div>
	);
}


