import {authLoaderWithPerm} from "~/util/auth";

export const loader = authLoaderWithPerm("ViewApiDocs", async () => {
	let docs = `
GET /api/division/list

You can specify page number and page size:
GET /api/division/list?page=1&pageSize=100

Delete all divisions
POST /api/division/delete_all

Upload divisions zip
POST /api/division/upload
Example
curl -H "X-Auth:$DTS_KEY" -F "file=@example_divisions.zip" 'http://localhost:3000/api/division/upload'

`
		return new Response(docs, {
		status: 200,
		headers: {"Content-Type": "text/plain"},
	});
});

