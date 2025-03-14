import {authLoaderWithPerm} from "~/util/auth";

export const loader = authLoaderWithPerm("ViewApiDocs", async () => {
	let docs = `
GET /api/hips/hazard/list
`
		return new Response(docs, {
		status: 200,
		headers: {"Content-Type": "text/plain"},
	});
});
