import {
	fieldsDefApi
} from "~/backend.server/models/damages"

import {
	authLoaderApiDocs,
} from "~/util/auth"

import {
	jsonApiDocs,
} from "~/backend.server/handlers/form/form_api"
import { getCountrySettingsFromSession } from "~/util/session";

export const loader = authLoaderApiDocs(async ({request}) => {
	const url = new URL(request.url);
	const baseUrl = `${url.protocol}//${url.host}`;

	const settings = await getCountrySettingsFromSession(request);
	const currencies = [settings.currencyCode];

	let docs = await jsonApiDocs({
		baseUrl: "damage",
		fieldsDef: await fieldsDefApi(currencies),
		siteUrl: baseUrl,
	})

	return new Response(docs, {
		status: 200,
		headers: {"Content-Type": "text/plain"},
	})
})

