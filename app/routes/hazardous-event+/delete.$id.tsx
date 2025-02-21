import { getTableName } from "drizzle-orm";
import {
	createDeleteLoader,
} from "~/backend.server/handlers/form";


import {
	hazardousEventById,
	hazardousEventDelete
} from "~/backend.server/models/event";
import { hazardousEventTable } from "~/drizzle/schema";

export const loader = createDeleteLoader({
	baseRoute: "/hazardous-event",
	delete: hazardousEventDelete,
	tableName: getTableName(hazardousEventTable),
	getById: hazardousEventById

});



