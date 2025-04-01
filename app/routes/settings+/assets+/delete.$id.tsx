import {getTableName} from "drizzle-orm";
import {createDeleteAction} from "~/backend.server/handlers/form/form";
import {assetById, assetDeleteById} from "~/backend.server/models/asset";
import {assetTable} from "~/drizzle/schema";

import {route} from "~/frontend/asset";

export let action = createDeleteAction({
	baseRoute: route,
	delete: assetDeleteById,
	tableName: getTableName(assetTable),
	getById: assetById
})
