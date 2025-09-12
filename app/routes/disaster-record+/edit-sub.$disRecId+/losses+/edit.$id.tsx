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
import { getTableName, eq, and, isNull, isNotNull } from "drizzle-orm";
import { lossesTable } from "~/drizzle/schema";
import { authLoaderWithPerm } from "~/util/auth";
import { useLoaderData } from "@remix-run/react";
import { sectorIsAgriculture } from "~/backend.server/models/sector";

import { divisionTable } from "~/drizzle/schema";

import { ContentRepeaterUploadFile } from "~/components/ContentRepeater/UploadFile";
import { ActionFunction, ActionFunctionArgs } from "@remix-run/server-runtime";
import {
	getCountryAccountsIdFromSession,
	getCountrySettingsFromSession,
} from "~/util/session";
import { DISASTER_RECORDS_LOSSES_UPLOAD_PATH, TEMP_UPLOAD_PATH } from "~/utils/paths";

interface LoaderRes {
	item: LossesViewModel | null;
	fieldDef: FormInputDef<LossesFields>[];
	recordId: string;
	sectorId: string;
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

	const settings = await getCountrySettingsFromSession(request);
	let ctryIso3 = settings?.crtyIso3 || "";
	const currencies = [settings?.currencyCode || "USD"];

	const divisionGeoJSON = await dr
		.select({
			id: divisionTable.id,
			name: divisionTable.name,
			geojson: divisionTable.geojson,
		})
		.from(divisionTable)
		.where(
			and(
				isNull(divisionTable.parentId),
				isNotNull(divisionTable.geojson),
				eq(divisionTable.countryAccountsId, countryAccountsId)
			)
		);

	if (params.id === "new") {
		let url = new URL(request.url);
		let sectorId = url.searchParams.get("sectorId") || "0";
		if (!sectorId) {
			throw new Response("Not Found", { status: 404 });
		}
		let res: LoaderRes = {
			item: null,
			fieldDef: createFieldsDef(currencies),
			recordId: params.disRecId,
			sectorId: sectorId,
			sectorIsAgriculture: await sectorIsAgriculture(dr, sectorId),
			treeData: [],
			ctryIso3: ctryIso3 || "",
			divisionGeoJSON: divisionGeoJSON,
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
		treeData: [],
		ctryIso3: ctryIso3 || "",
		divisionGeoJSON: divisionGeoJSON,
	};
	return res;
});

export const action: ActionFunction = async (args: ActionFunctionArgs) => {
	const { request } = args;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const settings = await getCountrySettingsFromSession(request);
	const currencies = [settings?.currencyCode || "USD"];

	return createOrUpdateAction({
		fieldsDef: createFieldsDef(currencies),
		create: lossesCreate,
		update: lossesUpdate,
		getById: lossesByIdTx,
		redirectTo: (id) => `${route}/${id}`,
		tableName: getTableName(lossesTable),
		postProcess: async (id, data) => {
			const save_path = `${DISASTER_RECORDS_LOSSES_UPLOAD_PATH}/${id}`;
			const save_path_temp = TEMP_UPLOAD_PATH;

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
