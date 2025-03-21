import {
	damagesCreate,
	damagesUpdate,
	damagesById,
	damagesByIdTx,
	fieldsDef,
	DamagesViewModel,
	DamagesFields
} from "~/backend.server/models/damages"

import {
	DamagesForm,
	route
} from "~/frontend/damages"

import {
	formScreen,
} from "~/frontend/form"

import {
	createAction
} from "~/backend.server/handlers/form"
import {getTableName,eq} from "drizzle-orm"
import {damagesTable} from "~/drizzle/schema"
import {authLoaderWithPerm} from "~/util/auth"
import {useLoaderData} from "@remix-run/react"
import {assetsForSector} from "~/backend.server/models/asset"

import {dr} from "~/db.server";

import { buildTree } from "~/components/TreeView";
import { divisionTable } from "~/drizzle/schema";

import { ContentRepeaterUploadFile } from "~/components/ContentRepeater/UploadFile";

async function getResponseData(item: DamagesViewModel | null, recordId: string, sectorId: number, treeData?: any[], ctryIso3?: string, divisionGeoJSON?: any[], p0?: any[]) {
	let assets = (await assetsForSector(dr, sectorId)).map((a: any) => {
		return {
			id: a.id,
			label: a.name
		}
	})
	/*
	let units = (await dr.query.unitTable.findMany()).map(u => {
		return {
			id: u.id,
			label: u.name,
		}
	})*/
	return {
		assets,
		//units,
		item,
		recordId,
		sectorId,
		fieldDef: await fieldsDef(),
		treeData,
		ctryIso3,
		divisionGeoJSON,
	}
}

export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	const {params, request} = loaderArgs
	if (!params.id) {
		throw new Error("Route does not have id param")
	}
	if (!params.disRecId) {
		throw new Error("Route does not have disRecId param")
	}

	const idKey = "id";
    const parentKey = "parentId";
    const nameKey = "name";
    const rawData = await dr.select().from(divisionTable);
    const treeData = buildTree(rawData, idKey, parentKey, nameKey, ["fr", "de", "en"], "en", ["geojson"]);

	const ctryIso3 = process.env.DTS_INSTANCE_CTRY_ISO3 as string;

    const divisionGeoJSON = await dr.execute(`
		SELECT id, name, geojson
		FROM division
		WHERE (parent_id = 0 OR parent_id IS NULL) AND geojson IS NOT NULL;
    `);

	if (params.id === "new") {
		let url = new URL(request.url)
		let sectorId = Number(url.searchParams.get("sectorId")) || 0
		if (!sectorId) {
			throw new Response("Not Found", {status: 404})
		}
		const ctryIso3 = process.env.DTS_INSTANCE_CTRY_ISO3 as string;
		return await getResponseData(null, params.disRecId, sectorId, treeData, ctryIso3, divisionGeoJSON?.rows)
	}
	const item = await damagesById(params.id)
	if (!item) {
		throw new Response("Not Found", {status: 404})
	}

	return await getResponseData(item, item.recordId, item.sectorId, treeData, ctryIso3, divisionGeoJSON?.rows);
});

export const action = createAction({
	fieldsDef: fieldsDef,
	create: damagesCreate,
	update: damagesUpdate,
	getById: damagesByIdTx,
	redirectTo: (id) => `${route}/${id}`,
	tableName: getTableName(damagesTable),
	postProcess: async (id, data) => {
		//console.log(`Post-processing record: ${id}`);
		//console.log(`data: `, data);
	
		const save_path = `/uploads/disaster-record/damages/${id}`;
		const save_path_temp = `/uploads/temp`;
	
		// Ensure attachments is an array, even if it's undefined or empty
		const attachmentsArray = Array.isArray(data?.attachments) ? data.attachments : [];
	
		// Process the attachments data
		const processedAttachments = ContentRepeaterUploadFile.save(attachmentsArray, save_path_temp, save_path);
	
		// Update the `attachments` field in the database
		await dr.update(damagesTable)
			.set({
				attachments: processedAttachments || [], // Ensure it defaults to an empty array if undefined
			})
			.where(eq(damagesTable.id, id));
	}	
})

export default function Screen() {
	const ld = useLoaderData<typeof loader>(); //console.log(`ld: `, ld.ctryIso3);

	const fieldsInitial: Partial<DamagesFields> = ld.item
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
			assets: ld.assets,
			ctryIso3: ld.ctryIso3,
			divisionGeoJSON: ld.divisionGeoJSON
		},
		fieldsInitial,
		form: DamagesForm,
		edit: !!ld.item,
		id: (ld.item as any)?.id || null,
	});
}

