import {
	redirect
} from "@remix-run/node";

import {
	authLoader,
	authLoaderGetAuth,
} from "~/util/auth";

import {
		useLoaderData,
} from "@remix-run/react";

import {
	sendEmailVerification
} from "~/components/user/model";

export const loader = authLoader(async (loaderArgs) => {
	const user = authLoaderGetAuth(loaderArgs)
	await sendEmailVerification(user)
	return redirect("/user/verify_email");
});
