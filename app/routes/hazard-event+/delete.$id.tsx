import { getTableName } from "drizzle-orm";
import {
	createDeleteLoader,
} from "~/backend.server/handlers/form";


import {
	hazardEventById,
	hazardEventDelete
} from "~/backend.server/models/event";
import { hazardEventTable } from "~/drizzle/schema";

export const loader = createDeleteLoader({
	baseRoute: "/hazard-event",
	delete: hazardEventDelete,
	tableName: getTableName(hazardEventTable),
	getById: hazardEventById

});



