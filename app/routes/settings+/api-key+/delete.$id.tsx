import {getTableName} from "drizzle-orm";
import {
	createDeleteActionWithPerm,
} from "~/backend.server/handlers/form/form";
import {apiKeyById, apiKeyDelete} from '~/backend.server/models/api_key';
import {apiKeyTable} from "~/drizzle/schema";

import {
	route
} from "~/frontend/api_key";

export const action = createDeleteActionWithPerm("EditAPIKeys", {
	tableName: getTableName(apiKeyTable),
	baseRoute: route,
	delete: apiKeyDelete,
	getById: apiKeyById,
});

