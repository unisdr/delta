import {
	apiKeyById,
} from "~/backend.server/models/api_key";

import {
	ApiKeyView,
} from "~/frontend/api_key";


import {
	ViewScreen
} from "~/frontend/form";

import {
	authLoaderGetAuth,
	authLoaderWithPerm,
} from "~/util/auth";

import {
	getItem2,
} from "~/backend.server/handlers/view";

export const loader = authLoaderWithPerm("ViewData", async (args) => {
	const {params} = args;
	const item = await getItem2(params, apiKeyById);
	if (!item) {
		throw new Response("Not Found", {status: 404});
	}
	const auth = authLoaderGetAuth(args);
	if (item.managedByUserId != auth.user.id) {
		item.secret = "Secret is only visible to the user who ows this API key"
	}
	return {item};
});

export default function Screen() {
	return ViewScreen({
		viewComponent: ApiKeyView
	});
}

