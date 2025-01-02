import {
	fieldsDefApi,
} from "~/frontend/events/hazardeventform";
import {
	authLoaderApiDocs,
} from "~/util/auth";
import {
	jsonApiDocs,
} from "~/backend.server/handlers/form";

export const loader = authLoaderApiDocs(async () => {
	let docs = jsonApiDocs({
		baseUrl: "hazard-event",
		fieldsDef: fieldsDefApi
	})

	return new Response(docs, {
		status: 200,
		headers: {"Content-Type": "text/plain"},
	});
});
