import {
	LoaderFunctionArgs,
	redirect
} from "@remix-run/node";

import {logout} from "~/util/auth";

export const loader = async ({request}:LoaderFunctionArgs) => {

	const headers = await logout(request);
	return redirect("/", { headers });
};

