import {getTableName} from "drizzle-orm"
import {createDeleteLoader} from "~/backend.server/handlers/form"
import {damagesById, damagesDeleteById} from "~/backend.server/models/damages"
import {damagesTable} from "~/drizzle/schema"

import {route} from "~/frontend/damages"

export const loader = createDeleteLoader({
	baseRoute: route,
	delete: damagesDeleteById,
	tableName: getTableName(damagesTable),
	getById: damagesById
})

