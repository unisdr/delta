import {
	LoaderFunctionArgs,
	redirect
} from "@remix-run/node";

import {logout} from "~/util/session";

export const loader = async ({request}:LoaderFunctionArgs) => {

	const headers = await logout(request);
	return redirect("/", { headers });
};

