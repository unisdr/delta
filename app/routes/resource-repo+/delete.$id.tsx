import { getTableName } from "drizzle-orm";
import {
	createDeleteLoader,
} from "~/backend.server/handlers/form";
import {resourceRepoById, resourceRepoDeleteById} from '~/backend.server/models/resource_repo';
import { resourceRepoTable } from "~/drizzle/schema";

import {
	route
} from "~/frontend/resource-repo/form";

export const loader = createDeleteLoader({
	baseRoute: route,
	delete: resourceRepoDeleteById,
	tableName: getTableName(resourceRepoTable),
	getById: resourceRepoById
});

