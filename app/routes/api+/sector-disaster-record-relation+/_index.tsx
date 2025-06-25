import {
	fieldsDefApi
} from "~/backend.server/models/disaster_record__sectors";

import {
	authLoaderApiDocs,
} from "~/util/auth";
import {
	jsonApiDocs,
} from "~/backend.server/handlers/form/form_api";

export const loader = authLoaderApiDocs(async () => {
	let docs = await jsonApiDocs({
		baseUrl: "sector-disaster-record-relation",
		fieldsDef: fieldsDefApi
	})

	return new Response(docs, {
		status: 200,
		headers: {"Content-Type": "text/plain"},
	});
});
