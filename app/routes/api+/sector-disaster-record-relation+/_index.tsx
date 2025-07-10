import {
	fieldsDefApi
} from "~/backend.server/models/disaster_record__sectors";

import {
	authLoaderApiDocs,
} from "~/util/auth";
import {
	jsonApiDocs,
} from "~/backend.server/handlers/form/form_api";

export const loader = authLoaderApiDocs(async ({request}) => {
	const url = new URL(request.url);
	const baseUrl = `${url.protocol}//${url.host}`;

	let docs = await jsonApiDocs({
		baseUrl: "sector-disaster-record-relation",
		fieldsDef: fieldsDefApi,
		siteUrl: baseUrl
	})

	return new Response(docs, {
		status: 200,
		headers: {"Content-Type": "text/plain"},
	});
});
