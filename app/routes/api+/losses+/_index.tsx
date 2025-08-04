import { authLoaderApiDocs } from "~/util/auth";

import { jsonApiDocs } from "~/backend.server/handlers/form/form_api";
import { LoaderFunction } from "@remix-run/server-runtime";
import { createFieldsDefApi } from "~/backend.server/models/losses";

export const loader: LoaderFunction = authLoaderApiDocs(async ({ request }) => {
	const url = new URL(request.url);
	const baseUrl = `${url.protocol}//${url.host}`;
	const currencies = ["USD"];

	let docs = await jsonApiDocs({
		baseUrl: "losses",
		fieldsDef: createFieldsDefApi(currencies),
		siteUrl: baseUrl,
	});

	return new Response(docs, {
		status: 200,
		headers: { "Content-Type": "text/plain" },
	});
});
