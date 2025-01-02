import {
	fieldsDefApi,
} from "~/frontend/dev_example1";
import {
	authLoaderApiDocs,
} from "~/util/auth";
import {
	jsonApiDocs,
} from "~/backend.server/handlers/form";

export const loader = authLoaderApiDocs(async () => {
	let docs = jsonApiDocs({
		baseUrl: "dev-example1",
		fieldsDef: fieldsDefApi
	})

	return new Response(docs, {
		status: 200,
		headers: {"Content-Type": "text/plain"},
	});
});
