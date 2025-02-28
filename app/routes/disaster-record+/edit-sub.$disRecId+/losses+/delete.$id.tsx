import {getTableName} from "drizzle-orm"
import {createDeleteLoader} from "~/backend.server/handlers/form"
import {lossesById, lossesDeleteById} from "~/backend.server/models/losses"
import {lossesTable} from "~/drizzle/schema"

import {route, route2} from "~/frontend/losses"

export const loader = createDeleteLoader({
	redirectToSuccess: (_id: string, oldRecord: any) => route2(oldRecord.recordId) + "?sectorId=" + oldRecord.sectorId,
	redirectToError: (id: string) => route + "/" + id,
	baseRoute: route,
	delete: lossesDeleteById,
	tableName: getTableName(lossesTable),
	getById: lossesById
})

