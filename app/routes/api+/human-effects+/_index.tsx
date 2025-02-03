import {authLoaderWithPerm} from "~/util/auth";

export const loader = authLoaderWithPerm("ViewApiDocs", async () => {
	let docs = `
/api/human-effects/category-presence

GET /api/human-effects/list?recordId=XXX&table=Injured
POST /api/human-effects/save?recordId=XXX
{
	"table":"Injured",
	"data":{
		"updates":{},
		"deletes":[],
		"newRows":{
			"_temp1":[null,null,null,2],
			"_temp2":["m",null,null,1],
			"_temp3":["f",null,null,1]
		}
	}
}
POST /api/human-effects/clear?recordId=XXX
POST /api/human-effects/category-presence-save?recordId=xxx
{
	"table": "Injured",
	"data": { "injured": true }
}

`
		return new Response(docs, {
		status: 200,
		headers: {"Content-Type": "text/plain"},
	});
});
