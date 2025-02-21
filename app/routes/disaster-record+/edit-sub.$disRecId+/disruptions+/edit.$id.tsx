import {
	disruptionCreate,
	disruptionUpdate,
	disruptionById,
	disruptionByIdTx,
	fieldsDef,
	DisruptionViewModel,
	DisruptionFields
} from "~/backend.server/models/disruption"

import {
	DisruptionForm,
	route
} from "~/frontend/disruption"

import {
	FormInputDef,
	formScreen,
} from "~/frontend/form"

import {
	createAction
} from "~/backend.server/handlers/form"
import {getTableName,eq} from "drizzle-orm"
import {disruptionTable} from "~/drizzle/schema"
import {authLoaderWithPerm} from "~/util/auth"
import {useLoaderData} from "@remix-run/react"

import { buildTree } from "~/components/TreeView";
import { dr } from "~/db.server"; // Drizzle ORM instance
import { divisionTable } from "~/drizzle/schema";

import { ContentRepeaterUploadFile } from "~/components/ContentRepeater/UploadFile";

interface LoaderRes {
	item: DisruptionViewModel | null
	fieldDef: FormInputDef<DisruptionFields>[]
	recordId: string
	sectorId: number
	treeData?: any[]
}

export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	const {params, request} = loaderArgs
	if (!params.id) {
		throw new Error("Route does not have id param")
	}
	if (!params.disRecId) {
		throw new Error("Route does not have disRecId param")
	}
	if (params.id === "new") {
		let url = new URL(request.url)
		let sectorId = Number(url.searchParams.get("sectorId")) || 0
		if (!sectorId) {
			throw new Response("Not Found", {status: 404});
		}
		let res: LoaderRes = {
			item: null,
			fieldDef: fieldsDef,
			recordId: params.disRecId,
			sectorId: sectorId,
		}
		return res
	}
	const item = await disruptionById(params.id);
	if (!item) {
		throw new Response("Not Found", {status: 404});
	}

    const idKey = "id";
    const parentKey = "parentId";
    const nameKey = "name";
    const rawData = await dr.select().from(divisionTable);
    const treeData = buildTree(rawData, idKey, parentKey, nameKey, ["fr", "de", "en"], "en", ["geojson"]);

	let res: LoaderRes = {
		item: item,
		fieldDef: fieldsDef,
		recordId: item.recordId,
		sectorId: item.sectorId,
		treeData: treeData || []
	}
	return res
});

export const action = createAction({
	fieldsDef: fieldsDef,
	create: disruptionCreate,
	update: disruptionUpdate,
	getById: disruptionByIdTx,
	redirectTo: (id) => `${route}/${id}`,
	tableName: getTableName(disruptionTable),
	postProcess: async (id, data) => {
		//console.log(`Post-processing record: ${id}`);
		//console.log(`data: `, data);
	
		const save_path = `/uploads/disaster-record/disruptions/${id}`;
		const save_path_temp = `/uploads/temp`;
	
		// Ensure attachments is an array, even if it's undefined or empty
		const attachmentsArray = Array.isArray(data?.attachments) ? data.attachments : [];
	
		// Process the attachments data
		const processedAttachments = ContentRepeaterUploadFile.save(attachmentsArray, save_path_temp, save_path);
	
		// Update the `attachments` field in the database
		await dr.update(disruptionTable)
			.set({
				attachments: processedAttachments || [], // Ensure it defaults to an empty array if undefined
			})
			.where(eq(disruptionTable.id, id));
	}	
})

export default function Screen() {
	const ld = useLoaderData<typeof loader>();

	const fieldsInitial: Partial<DisruptionFields> = ld.item
		? {...ld.item}
		: {};

	fieldsInitial.recordId = ld.recordId
	fieldsInitial.sectorId = ld.sectorId

	if (!ld.fieldDef) {
		throw "invalid"
	}

	return formScreen({
		extraData: {
			fieldDef: ld.fieldDef,
			treeData: ld.treeData || []
		},
		fieldsInitial,
		form: DisruptionForm,
		edit: !!ld.item,
		id: (ld.item as any)?.id || null
	});
}


