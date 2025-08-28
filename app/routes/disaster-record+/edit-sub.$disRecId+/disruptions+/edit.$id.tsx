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
} from "~/backend.server/handlers/form/form"
import {getTableName,eq} from "drizzle-orm"
import {disruptionTable} from "~/drizzle/schema"
import {authLoaderWithPerm} from "~/util/auth"
import {useLoaderData} from "@remix-run/react"

import { dr } from "~/db.server"; // Drizzle ORM instance

import { ContentRepeaterUploadFile } from "~/components/ContentRepeater/UploadFile";

interface LoaderRes {
	item: DisruptionViewModel | null
	fieldDef: FormInputDef<DisruptionFields>[]
	recordId: string
	sectorId: number
	treeData?: any[]
	ctryIso3?: string
	divisionGeoJSON?: any[]
}

export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	const {params, request} = loaderArgs
	if (!params.id) {
		throw new Error("Route does not have id param")
	}
	if (!params.disRecId) {
		throw new Error("Route does not have disRecId param")
	}

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
			throw new Response("Not Found", {status: 404});
		}
		let res: LoaderRes = {
			item: null,
			fieldDef: fieldsDef,
			recordId: params.disRecId,
			sectorId: sectorId,
			treeData: [],
			ctryIso3: ctryIso3 || "",
			divisionGeoJSON: divisionGeoJSON?.rows || [],
		}
		return res
	}
	const item = await disruptionById(params.id);
	if (!item) {
		throw new Response("Not Found", {status: 404});
	}

	let res: LoaderRes = {
		item: item,
		fieldDef: fieldsDef,
		recordId: item.recordId,
		sectorId: item.sectorId,
		treeData: [],
		ctryIso3: ctryIso3 || "",
		divisionGeoJSON: divisionGeoJSON?.rows || [],
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
			treeData: ld.treeData || [],
			ctryIso3: ld.ctryIso3,
			divisionGeoJSON: ld.divisionGeoJSON
		},
		fieldsInitial,
		form: DisruptionForm,
		edit: !!ld.item,
		id: (ld.item as any)?.id || null
	});
}


