import {
	createDeleteLoader,
} from "~/backend.server/handlers/form";
import {disasterRecordsDeleteById} from '~/backend.server/models/disaster_record';

import {
	route
} from "~/frontend/disaster-record/form";

export const loader = createDeleteLoader({
	baseRoute: route,
	delete: disasterRecordsDeleteById
});

