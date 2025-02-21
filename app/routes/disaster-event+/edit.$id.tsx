import { getTableName } from "drizzle-orm";
import {
	disasterEventById,
	disasterEventByIdTx,
	disasterEventCreate,
	DisasterEventFields,
	disasterEventUpdate,
} from "~/backend.server/models/event";

import {
	fieldsDef,
	DisasterEventForm,
} from "~/frontend/events/disastereventform";

import { createLoader, createAction } from "~/backend.server/handlers/form";

import { formScreen } from "~/frontend/form";

import { route } from "~/frontend/events/disastereventform";

import { useLoaderData } from "@remix-run/react";
import { disasterEventTable } from "~/drizzle/schema";

import {authLoaderWithPerm} from "~/util/auth";
import { buildTree } from "~/components/TreeView";
import { dr } from "~/db.server"; // Drizzle ORM instance
import { divisionTable } from "~/drizzle/schema";

// export const loader = createLoader({
// 	getById: disasterEventById,
// });

export const action = createAction({
	fieldsDef,
	create: disasterEventCreate,
	update: disasterEventUpdate,
	redirectTo: (id) => route + "/" + id,
	getById: disasterEventByIdTx,
	tableName: getTableName(disasterEventTable),
	action: (isCreate) =>
		isCreate ? "Create disaster event" : "Update disaster event",
});

export const loader = authLoaderWithPerm("EditData", async (actionArgs) => {
	// ✅ Fetch existing disaster event data
	const baseData = await createLoader({ getById: disasterEventById })(actionArgs);

	// ✅ Fetch division data & build tree
	const idKey = "id";
	const parentKey = "parentId";
	const nameKey = "name";
	const rawData = await dr.select().from(divisionTable);
	const treeData = buildTree(rawData, idKey, parentKey, nameKey, ["fr", "de", "en"], "en", ["geojson"]);

	// ✅ Inject `treeData` into the loader response
	return {
		...baseData,
		treeData, // Now available in `useLoaderData()`
	};
});

export default function Screen() {
	let ld = useLoaderData<typeof loader>();
	let fieldsInitial: Partial<DisasterEventFields> = ld.item
		? {
				...ld.item,
		  }
		: {};
	return formScreen({
		extraData: { hazardous_event: ld.item?.hazardous_event, treeData: ld.treeData },
		fieldsInitial: fieldsInitial,
		form: DisasterEventForm,
		edit: !!ld.item,
		id: ld.item?.id,
	});
}
