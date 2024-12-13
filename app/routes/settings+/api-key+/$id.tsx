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
	authLoaderWithRole,
} from "~/util/auth";

import {
	getItem2,
} from "~/backend.server/handlers/view";

export const loader = authLoaderWithRole("ViewData", async (args) => {
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
	const viewScreen = ViewScreen({
		viewComponent: ApiKeyView
	});

	return (<>
		<div className="dts-page-header">
			<header className="dts-page-title">
				<div className="mg-container">
					<h1 className="dts-heading-1">API Keys</h1>
				</div>
			</header>
		</div>
		<section>
			<div className="mg-container">
				{viewScreen}
			</div>
		</section>
	</>);
}

