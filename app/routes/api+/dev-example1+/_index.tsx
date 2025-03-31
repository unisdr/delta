import {
	fieldsDefApi
} from "~/backend.server/models/dev_example1";

import {
	authLoaderApiDocs,
} from "~/util/auth";
import {
	jsonApiDocs,
} from "~/backend.server/handlers/form/form_api";

export const loader = authLoaderApiDocs(async () => {
	let docs = jsonApiDocs({
		baseUrl: "dev-example1",
		fieldsDef: await fieldsDefApi()
	})

	return new Response(docs, {
		status: 200,
		headers: {"Content-Type": "text/plain"},
	});
});
