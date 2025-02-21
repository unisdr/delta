import { getTableName } from "drizzle-orm";
import {
	createDeleteLoader,
} from "~/backend.server/handlers/form";


import {
	hazardous_eventById,
	hazardous_eventDelete
} from "~/backend.server/models/event";
import { hazardous_eventTable } from "~/drizzle/schema";

export const loader = createDeleteLoader({
	baseRoute: "/hazardous-event",
	delete: hazardous_eventDelete,
	tableName: getTableName(hazardous_eventTable),
	getById: hazardous_eventById

});



