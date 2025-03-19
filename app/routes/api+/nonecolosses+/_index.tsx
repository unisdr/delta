import {
	fieldsDefApi
} from "~/backend.server/models/noneco_losses";

import {
	authLoaderApiDocs,
} from "~/util/auth";
import {
	jsonApiDocs,
} from "~/backend.server/handlers/form";

export const loader = authLoaderApiDocs(async () => {
	let docs = jsonApiDocs({
		baseUrl: "nonecolosses",
		fieldsDef: fieldsDefApi
	})

	return new Response(docs, {
		status: 200,
		headers: {"Content-Type": "text/plain"},
	});
});
