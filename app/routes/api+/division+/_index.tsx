import {authLoaderWithPerm} from "~/util/auth";

export const loader = authLoaderWithPerm("ViewApiDocs", async () => {
	let docs = `
GET /api/division/list

You can specify page number and page size:
GET /api/division/list?page=1&pageSize=100
`
		return new Response(docs, {
		status: 200,
		headers: {"Content-Type": "text/plain"},
	});
});

