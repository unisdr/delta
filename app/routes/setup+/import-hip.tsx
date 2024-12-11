import {
	authActionWithRole,
	authLoaderWithRole
} from "~/util/auth";

import {
	useActionData,
} from "@remix-run/react";

import {
	hipClassTable,
	hipClusterTable,
	hipHazardTable,
} from '~/drizzle/schema';

export const loader = authLoaderWithRole("EditData", async () => {
	return null;
});

import {dr} from '~/db.server';

interface Hip {
	type: string
	title: string
	description: string
	notation: string
	cluster_id: number
	cluster_name: string
	type_id: number
	type_name: string
}

interface HipApi {
	last_page: number
	data: Hip[]
}

async function upsertHip(item: Hip) {
	const [cls] = await dr
		.insert(hipClassTable)
		.values({id: item.type_id, nameEn: item.type_name})
		.onConflictDoUpdate({
			target: hipClassTable.id,
			set: {nameEn: item.type_name},
		})
		.returning({id: hipClassTable.id});

	const [cluster] = await dr
		.insert(hipClusterTable)
		.values({id: item.cluster_id, classId: cls.id, nameEn: item.cluster_name})
		.onConflictDoUpdate({
			target: hipClusterTable.id,
			set: {classId: cls.id, nameEn: item.cluster_name},
		})
		.returning({id: hipClusterTable.id});

	await dr
		.insert(hipHazardTable)
		.values({
			id: item.notation,
			clusterId: cluster.id,
			nameEn: item.title,
			descriptionEn: item.description,
		})
		.onConflictDoUpdate({
			target: hipHazardTable.id,
			set: {
				clusterId: cluster.id,
				nameEn: item.title,
				descriptionEn: item.description,
			},
		});
}

const maxPages = 10

async function processPage(page: number) {
	console.log("process hip page", page);
	if (page > maxPages) {
		throw "Exceeded max pages, infinite loop?"
	}

	const url = "https://tools.undrr.org/sso-undrr/api/integration/pw/hips?page=" + page;
	const resp = await fetch(url);
	const res = await resp.json() as HipApi;
	const data = res.data;
	for (const item of data) {
		await upsertHip(item);
	}
	if (!res.last_page){
		throw "No last page info" 
	}
	if (page != res.last_page) {
		processPage(page+1)
	} else {
		console.log("done with hip pages")
	}
}


export const action = authActionWithRole("EditData", async () => {
	processPage(1);
	return {ok: true};
})

export default function Screen() {
	const actionData = useActionData<typeof action>();
	let submitted = false;
	let error = ""
	if (actionData) {
		submitted = true
		//if (!actionData.ok) {
		//	error = actionData.error || "Server error"
		//}
	}
	return (
		<form method="post">
			{submitted && <p>Done</p>}
			{error ? (
				<p>{error}</p>
			) : null}
			<input type="submit" value="Import HIP" />
		</form>
	);
}

