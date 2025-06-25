import {
	fieldsDefApi,
} from "~/frontend/events/disastereventform";
import {
	authLoaderApiDocs,
} from "~/util/auth";
import {
	jsonApiDocs,
} from "~/backend.server/handlers/form/form_api";

export const loader = authLoaderApiDocs(async () => {
	let docs = await jsonApiDocs({
		baseUrl: "disaster-event",
		fieldsDef: fieldsDefApi
	})

	return new Response(docs, {
		status: 200,
		headers: {"Content-Type": "text/plain"},
	});
});
