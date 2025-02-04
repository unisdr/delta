import {getTableName} from "drizzle-orm"
import {createDeleteLoader} from "~/backend.server/handlers/form"
import {disruptionById, disruptionDeleteById} from "~/backend.server/models/disruption"
import {disruptionTable} from "~/drizzle/schema"

import {route} from "~/frontend/disruption"

export const loader = createDeleteLoader({
	baseRoute: route,
	delete: disruptionDeleteById,
	tableName: getTableName(disruptionTable),
	getById: disruptionById
})

