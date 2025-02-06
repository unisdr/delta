import {
	fieldsDefApi
} from "~/backend.server/models/damages"

import {
	authLoaderApiDocs,
} from "~/util/auth"

import {
	jsonApiDocs,
} from "~/backend.server/handlers/form"

export const loader = authLoaderApiDocs(async () => {
	let docs = jsonApiDocs({
		baseUrl: "damages",
		fieldsDef: fieldsDefApi
	})

	return new Response(docs, {
		status: 200,
		headers: {"Content-Type": "text/plain"},
	})
})

