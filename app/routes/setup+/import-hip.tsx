import {
	authActionWithPerm,
	authLoaderWithPerm
} from "~/util/auth";

import {
	useActionData,
} from "@remix-run/react";

import {
	hipClassTable,
	hipClusterTable,
	hipHazardTable,
} from '~/drizzle/schema';

export const loader = authLoaderWithPerm("EditData", async () => {
	return null;
});

import {dr} from '~/db.server';
import {formatTimestamp} from "~/util/time";
import {formStringData} from "~/util/httputil";
import hipsDataJson from "~/hips/hips.json"

interface Hip {
	//type: string
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
		throw "Exceeded max pages, likely infinite loop"
	}

	// const url = "https://tools.undrr.org/sso-undrr/api/integration/pw/hips?page=" + page;
	// const resp = await fetch(url);
	// const res = await resp.json() as HipApi;
	const res = hipsDataJson;
	const data = res.data;
	for (const item of data) {
		await upsertHip(item);
	}
	if (!res.last_page) {
		throw "No last page info"
	}
	if (page != res.last_page) {
		processPage(page + 1)
	} else {
		console.log("done with hip pages")
	}
}

interface Hip {
	//	type: string
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

function hipDevData(): Hip[] {
	const types: any = [];
	for (let i = 1; i <= 2; i++) {
		types.push({id: i, name: `Class ${i}`});
	}
	const clusters: any = [];
	let id = 1;
	for (let ty of types) {
		for (let i = 1; i <= 3; i++) {
			id++;
			clusters.push({id: id, type: ty, name: `Cluster ${i}`})
		}
	}

	const data: Hip[] = [];

	id = 0;
	for (let clu of clusters) {
		for (let i = 1; i <= 5; i++) {
			id++;
			let type = clu.type;
			data.push({
				title: `Title ${id} (${type.name} - ${clu.name})`,
				description: `Description ${id} (${type.name} - ${clu.name})`,
				notation: `DEV${id}`,
				cluster_id: clu.id,
				cluster_name: clu.name,
				type_id: type.id,
				type_name: type.name,
			});
		}
	}

	return data;
}

export const action = authActionWithPerm("EditData", async (args) => {
	const {request} = args;
	const formData = formStringData(await request.formData());
	const started = new Date();
	try {
		switch (formData.source) {
			case "unddr":
				await processPage(1);
				break;
			case "dev":
				for (let hip of hipDevData()) {
					await upsertHip(hip);
				}
				break;
			default:
				throw "Unknown data source"
		}
	} catch (err) {
		return {ok: false, started, error: String(err)}
	}
	return {ok: true, started};
})

export default function Screen() {
	const ad = useActionData<typeof action>();
	return (
		<form method="post">
			{ad && (
				<>
					<p>Requested data from API</p>
					<p>Started at: {formatTimestamp(ad.started)}</p>

					{ad.ok ?
						<p>Import success</p> :
						<p>{ad.error || "Error"}</p>
					}
				</>
			)}
			<label>
				Source:
				<select name="source">
					<option value="unddr">UNDRR API</option>
					<option value="dev">Local test data for development</option>
				</select>
			</label>
			<input type="submit" value="Import HIP" />
		</form>
	);
}

