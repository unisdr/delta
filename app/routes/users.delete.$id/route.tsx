import {
	redirect,
} from "@remix-run/node";

import { prisma } from "~/db.server";

import {
	authLoaderWithRole,
} from "~/util/auth";

export const loader = authLoaderWithRole("EditUsers", async (loaderArgs) => {
	const { id } = loaderArgs.params;
	if (!id) {
		throw new Response("Missing item ID", { status: 400 });
	}
	await prisma.user.delete({
	where: {
		id: Number(id), 
	},
	})
	return redirect(`/users`);
})
