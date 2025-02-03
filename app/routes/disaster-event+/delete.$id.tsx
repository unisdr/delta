import { getTableName } from "drizzle-orm";
import {
	createDeleteLoader,
} from "~/backend.server/handlers/form";

import {
	disasterEventById,
	disasterEventDelete
} from "~/backend.server/models/event";
import { disasterEventTable } from "~/drizzle/schema";

import {
	route,
} from "~/frontend/events/disastereventform";

export const loader = createDeleteLoader({
	baseRoute: route,
	delete: disasterEventDelete,
	tableName: getTableName(disasterEventTable),
	getById: disasterEventById
});



