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
} from "~/components/user/model";

export const loader = authLoaderAllowUnverifiedEmail(async (loaderArgs) => {
	const user = authLoaderGetAuth(loaderArgs)
	await sendEmailVerification(user)
	return redirect("/user/verify_email");
});
