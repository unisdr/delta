import { dr } from "~/db.server";
import {
	lossesCreate,
	lossesUpdate,
	lossesById,
	lossesByIdTx,
	LossesViewModel,
	LossesFields,
	createFieldsDef,
} from "~/backend.server/models/losses";

import { LossesForm, route } from "~/frontend/losses";

import { FormInputDef, formScreen } from "~/frontend/form";

import { createOrUpdateAction } from "~/backend.server/handlers/form/form";
import { getTableName, eq, sql } from "drizzle-orm";
import { lossesTable } from "~/drizzle/schema";
import { authLoaderWithPerm } from "~/util/auth";
import { useLoaderData } from "@remix-run/react";
import { sectorIsAgriculture } from "~/backend.server/models/sector";

import { buildTree } from "~/components/TreeView";
import { divisionTable } from "~/drizzle/schema";

import { ContentRepeaterUploadFile } from "~/components/ContentRepeater/UploadFile";
import { ActionFunction, ActionFunctionArgs } from "@remix-run/server-runtime";
import { getCountryAccountsIdFromSession, getCountrySettingsFromSession } from "~/util/session";

interface LoaderRes {
	item: LossesViewModel | null;
	fieldDef: FormInputDef<LossesFields>[];
	recordId: string;
	sectorId: number;
	sectorIsAgriculture?: boolean;
	treeData?: any[];
	ctryIso3?: string;
	divisionGeoJSON?: any[];
}

export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	const { params, request } = loaderArgs;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	if (!params.id) {
		throw new Error("Route does not have id param");
	}
	if (!params.disRecId) {
		throw new Error("Route does not have disRecId param");
	}
	if (!countryAccountsId) {
		throw new Response("Unauthorized access", { status: 401 });
	}

	const idKey = "id";
	const parentKey = "parentId";
	const nameKey = "name";
	const rawData = await dr
		.select()
		.from(divisionTable)
		.where(eq(divisionTable.countryAccountsId, countryAccountsId));

	const treeData = buildTree(
		rawData,
		idKey,
		parentKey,
		nameKey,
		// ["fr", "de", "en"],
		"en",
		["geojson"]
	);

	const settings = await getCountrySettingsFromSession(request);
	let ctryIso3 = settings?.crtyIso3 || "";
	const currencies = [settings?.curriencyCode || "USD"]

	const divisionGeoJSON = await dr.execute(sql`
		SELECT id, name, geojson
		FROM division
		WHERE (parent_id = 0 OR parent_id IS NULL) AND geojson IS NOT NULL
		AND division.country_accounts_id = ${countryAccountsId} ;
    `);

	if (params.id === "new") {
		let url = new URL(request.url);
		let sectorId = Number(url.searchParams.get("sectorId")) || 0;
		if (!sectorId) {
			throw new Response("Not Found", { status: 404 });
		}
		let res: LoaderRes = {
			item: null,
			fieldDef: createFieldsDef(currencies),
			recordId: params.disRecId,
			sectorId: sectorId,
			sectorIsAgriculture: await sectorIsAgriculture(dr, sectorId),
			treeData: treeData || [],
			ctryIso3: ctryIso3 || "",
			divisionGeoJSON: divisionGeoJSON?.rows || [],
		};
		return res;
	}
	const item = await lossesById(params.id);
	if (!item) {
		throw new Response("Not Found", { status: 404 });
	}

	let res: LoaderRes = {
		item: item,
		fieldDef: createFieldsDef(currencies),
		recordId: item.recordId,
		sectorId: item.sectorId,
		treeData: treeData || [],
		ctryIso3: ctryIso3 || "",
		divisionGeoJSON: divisionGeoJSON?.rows || [],
	};
	return res;
});

export const action: ActionFunction = async (args: ActionFunctionArgs) => {
	const { request } = args;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const settings = await getCountrySettingsFromSession(request);
	const currencies = [settings?.curriencyCode || "USD"]

	return createOrUpdateAction({
		fieldsDef: createFieldsDef(currencies),
		create: lossesCreate,
		update: lossesUpdate,
		getById: lossesByIdTx,
		redirectTo: (id) => `${route}/${id}`,
		tableName: getTableName(lossesTable),
		postProcess: async (id, data) => {
			const save_path = `/uploads/disaster-record/losses/${id}`;
			const save_path_temp = `/uploads/temp`;

			// Ensure attachments is an array, even if it's undefined or empty
			const attachmentsArray = Array.isArray(data?.attachments)
				? data.attachments
				: [];

			// Process the attachments data
			const processedAttachments = ContentRepeaterUploadFile.save(
				attachmentsArray,
				save_path_temp,
				save_path
			);

			// Update the `attachments` field in the database
			await dr
				.update(lossesTable)
				.set({
					attachments: processedAttachments || [], // Ensure it defaults to an empty array if undefined
				})
				.where(eq(lossesTable.id, id));
		},
		countryAccountsId,
	})(args);
};

export default function Screen() {
	const ld = useLoaderData<typeof loader>();

	const fieldsInitial: Partial<LossesFields> = ld.item ? { ...ld.item } : {};

	fieldsInitial.recordId = ld.recordId;
	fieldsInitial.sectorId = ld.sectorId;
	if (fieldsInitial.sectorIsAgriculture === undefined) {
		fieldsInitial.sectorIsAgriculture = ld.sectorIsAgriculture!;
	}

	if (!ld.fieldDef) {
		throw "invalid";
	}

	return formScreen({
		extraData: {
			fieldDef: ld.fieldDef,
			ctryIso3: ld.ctryIso3,
			divisionGeoJSON: ld.divisionGeoJSON,
		},
		fieldsInitial,
		form: LossesForm,
		edit: !!ld.item,
		id: (ld.item as any)?.id || null,
	});
}
