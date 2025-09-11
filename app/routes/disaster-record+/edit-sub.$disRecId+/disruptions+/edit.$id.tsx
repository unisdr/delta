import {
	disruptionCreate,
	disruptionUpdate,
	disruptionById,
	disruptionByIdTx,
	getFieldsDef,
	DisruptionViewModel,
	DisruptionFields,
} from "~/backend.server/models/disruption";

import { DisruptionForm, route } from "~/frontend/disruption";

import { FormInputDef, formScreen } from "~/frontend/form";

import { createActionWithoutCountryAccountsId } from "~/backend.server/handlers/form/form";
import { getTableName, eq, and, isNull, isNotNull } from "drizzle-orm";
import { disruptionTable } from "~/drizzle/schema";
import { authLoaderWithPerm } from "~/util/auth";
import { useLoaderData } from "@remix-run/react";

import { dr } from "~/db.server"; 
import { divisionTable } from "~/drizzle/schema";

import { ContentRepeaterUploadFile } from "~/components/ContentRepeater/UploadFile";
import {
	getCountryAccountsIdFromSession,
	getCountrySettingsFromSession,
} from "~/util/session";
import { DISASTER_RECORDS_DISRUPTIONS_UPLOAD_PATH, TEMP_UPLOAD_PATH } from "~/utils/paths";

interface LoaderRes {
	item: DisruptionViewModel | null;
	fieldDef: FormInputDef<DisruptionFields>[];
	recordId: string;
	sectorId: string;
	treeData?: any[];
	ctryIso3?: string;
	divisionGeoJSON?: any[];
}

export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	const { params, request } = loaderArgs;

	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	if (!countryAccountsId) {
		throw new Response("Unauthorized, no selected instance", { status: 401 });
	}

	if (!params.id) {
		throw new Error("Route does not have id param");
	}
	if (!params.disRecId) {
		throw new Error("Route does not have disRecId param");
	}

	let ctryIso3: string = "";
	let currencies: string[] = [];
	const settings = await getCountrySettingsFromSession(request);
	if (settings) {
		ctryIso3 = settings.dtsInstanceCtryIso3;
		if (settings.currencyCode) {
			currencies.push(settings.currencyCode);
		}
	}

	// Default to USD if no currencies are available
	if (currencies.length === 0) {
		currencies.push("USD");
	}

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
			fieldDef: getFieldsDef(currencies),
			recordId: params.disRecId,
			sectorId: sectorId,
			treeData: [],
			ctryIso3: ctryIso3 || "",
			divisionGeoJSON: divisionGeoJSON,
		};
		return res;
	}
	const item = await disruptionById(params.id);
	if (!item) {
		throw new Response("Not Found", { status: 404 });
	}

	let res: LoaderRes = {
		item: item,
		fieldDef: getFieldsDef(currencies),
		recordId: item.recordId,
		sectorId: item.sectorId,
		treeData: [],
		ctryIso3: ctryIso3 || "",
		divisionGeoJSON: divisionGeoJSON,
	};
	return res;
});

export const action = createActionWithoutCountryAccountsId({
	fieldsDef: getFieldsDef(),
	create: disruptionCreate,
	update: disruptionUpdate,
	getById: disruptionByIdTx,
	redirectTo: (id) => `${route}/${id}`,
	tableName: getTableName(disruptionTable),
	postProcess: async (id, data) => {
		const save_path = `${DISASTER_RECORDS_DISRUPTIONS_UPLOAD_PATH}/${id}`;
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
			.update(disruptionTable)
			.set({
				attachments: processedAttachments || [], // Ensure it defaults to an empty array if undefined
			})
			.where(eq(disruptionTable.id, id));
	},
});

export default function Screen() {
	const ld = useLoaderData<typeof loader>();

	const fieldsInitial: Partial<DisruptionFields> = ld.item
		? { ...ld.item }
		: {};

	fieldsInitial.recordId = ld.recordId;
	fieldsInitial.sectorId = ld.sectorId;

	if (!ld.fieldDef) {
		throw "invalid";
	}

	return formScreen({
		extraData: {
			fieldDef: ld.fieldDef,
			treeData: ld.treeData || [],
			ctryIso3: ld.ctryIso3,
			divisionGeoJSON: ld.divisionGeoJSON,
		},
		fieldsInitial,
		form: DisruptionForm,
		edit: !!ld.item,
		id: (ld.item as any)?.id || null,
	});
}
