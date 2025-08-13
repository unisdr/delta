import {
	damagesCreate,
	damagesUpdate,
	damagesById,
	damagesByIdTx,
	fieldsDef,
	DamagesViewModel,
	DamagesFields,
} from "~/backend.server/models/damages";

import { DamagesForm, route } from "~/frontend/damages";

import { formScreen } from "~/frontend/form";

import { createActionWithoutCountryAccountsId } from "~/backend.server/handlers/form/form";
import { getTableName, eq, sql } from "drizzle-orm";
import { damagesTable } from "~/drizzle/schema";
import { authLoaderWithPerm } from "~/util/auth";
import { useLoaderData } from "@remix-run/react";
import { assetsForSector } from "~/backend.server/models/asset";

import { dr } from "~/db.server";

import { buildTree } from "~/components/TreeView";
import { divisionTable } from "~/drizzle/schema";

import { ContentRepeaterUploadFile } from "~/components/ContentRepeater/UploadFile";
import {
	getCountryAccountsIdFromSession,
	getCountrySettingsFromSession,
} from "~/util/session";

async function getResponseData(
	item: DamagesViewModel | null,
	recordId: string,
	sectorId: string,
	countryAccountsId: string,
	treeData?: any[],
	ctryIso3?: string,
	currencies?: string[],
	divisionGeoJSON?: any[],
	_p0?: any[]
) {
	let assets = (await assetsForSector(dr, sectorId, countryAccountsId)).map((a: any) => {
		return {
			id: a.id,
			label: a.name,
		};
	});
	return {
		assets,
		item,
		recordId,
		sectorId,
		fieldDef: await fieldsDef(currencies),
		treeData,
		ctryIso3,
		currencies,
		divisionGeoJSON,
	};
}

export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	const { params, request } = loaderArgs;
	if (!params.id) {
		throw new Error("Route does not have id param");
	}
	if (!params.disRecId) {
		throw new Error("Route does not have disRecId param");
	}
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	if (!countryAccountsId) {
		throw new Response("Unauthorized, no selected instance", { status: 401 });
	}

	const idKey = "id";
	const parentKey = "parentId";
	const nameKey = "name";
	const rawData = await dr.select().from(divisionTable);
	const treeData = buildTree(rawData, idKey, parentKey, nameKey, "en", [
		"geojson",
		"importId",
		"nationalId",
		"level",
		"name",
	]);

	let ctryIso3: string = "";
	let currencies: string[] = [];
	const settings = await getCountrySettingsFromSession(request);

	if (settings) {
		ctryIso3 = settings.dtsInstanceCtryIso3;
		currencies = [settings.currencyCode];
	}
	const divisionGeoJSON = await dr.execute(sql`
	SELECT id, name, geojson
	FROM division
	WHERE (parent_id = 0 OR parent_id IS NULL)
	AND geojson IS NOT NULL
	AND division.country_accounts_id = ${countryAccountsId};
	`);

	if (params.id === "new") {
		let url = new URL(request.url);
		let sectorId = url.searchParams.get("sectorId") || "0";
		if (!sectorId) {
			throw new Response("Not Found", { status: 404 });
		}
		return await getResponseData(
			null,
			params.disRecId,
			sectorId,
			countryAccountsId,
			treeData,
			ctryIso3,
			currencies,
			divisionGeoJSON?.rows
		);
	}
	const item = await damagesById(params.id);
	if (!item) {
		throw new Response("Not Found", { status: 404 });
	}

	return await getResponseData(
		item,
		item.recordId,
		item.sectorId,
		countryAccountsId,
		treeData,
		ctryIso3,
		currencies,
		divisionGeoJSON?.rows
	);
});

export const action = createActionWithoutCountryAccountsId({
	fieldsDef: fieldsDef,
	create: damagesCreate,
	update: damagesUpdate,
	getById: damagesByIdTx,
	redirectTo: (id) => `${route}/${id}`,
	tableName: getTableName(damagesTable),
	postProcess: async (id, data) => {
		const save_path = `/uploads/disaster-record/damages/${id}`;
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
			.update(damagesTable)
			.set({
				attachments: processedAttachments || [], // Ensure it defaults to an empty array if undefined
			})
			.where(eq(damagesTable.id, id));
	},
});

export default function Screen() {
	const ld = useLoaderData<typeof loader>();

	const fieldsInitial: Partial<DamagesFields> = ld.item ? { ...ld.item } : {};

	fieldsInitial.recordId = ld.recordId;
	fieldsInitial.sectorId = ld.sectorId;

	if (!ld.fieldDef) {
		throw "invalid";
	}

	return formScreen({
		extraData: {
			fieldDef: ld.fieldDef,
			assets: ld.assets,
			ctryIso3: ld.ctryIso3,
			divisionGeoJSON: ld.divisionGeoJSON,
			currencies: ld.currencies,
		},
		fieldsInitial,
		form: DamagesForm,
		edit: !!ld.item,
		id: (ld.item as any)?.id || null,
	});
}
