import {getTableName} from "drizzle-orm"
import {createDeleteLoader} from "~/backend.server/handlers/form"
import {lossesById, lossesDeleteById} from "~/backend.server/models/losses"
import {lossesTable} from "~/drizzle/schema"

import {route} from "~/frontend/losses"

export const loader = createDeleteLoader({
	baseRoute: route,
	delete: lossesDeleteById,
	tableName: getTableName(lossesTable),
	getById: lossesById
})

