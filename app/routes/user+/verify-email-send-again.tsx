import {
	redirect
} from "@remix-run/node";

import {
	authLoaderAllowUnverifiedEmail,
	authLoaderGetAuth,
} from "~/util/auth";

import {
	sendEmailVerification
} from "~/backend.server/models/user/verify_email";

export const loader = authLoaderAllowUnverifiedEmail(async (loaderArgs) => {
	const { user } = authLoaderGetAuth(loaderArgs)
	await sendEmailVerification(user)
	return redirect("/user/verify-email");
});
