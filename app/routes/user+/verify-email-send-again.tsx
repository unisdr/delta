import {
	redirect
} from "@remix-run/node";

import {
	authLoaderAllowUnverifiedEmail,
	authLoaderGetAuth,
} from "~/util/auth";

import {
		useLoaderData,
} from "@remix-run/react";

import {
	sendEmailVerification
} from "~/backend.server/models/user";

export const loader = authLoaderAllowUnverifiedEmail(async (loaderArgs) => {
	const { user } = authLoaderGetAuth(loaderArgs)
	await sendEmailVerification(user)
	return redirect("/user/verify-email");
});
