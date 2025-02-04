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

export const loader = createLoader({
	getById: disasterEventById,
});

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

export default function Screen() {
	let ld = useLoaderData<typeof loader>();
	let fieldsInitial: Partial<DisasterEventFields> = ld.item
		? {
				...ld.item,
		  }
		: {};
	return formScreen({
		extraData: { hazardEvent: ld.item?.hazardEvent },
		fieldsInitial: fieldsInitial,
		form: DisasterEventForm,
		edit: !!ld.item,
		id: ld.item?.id,
	});
}
