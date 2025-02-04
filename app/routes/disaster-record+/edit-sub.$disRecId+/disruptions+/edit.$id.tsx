import {
	disruptionCreate,
	disruptionUpdate,
	disruptionById,
	disruptionByIdTx,
} from "~/backend.server/models/disruption"

import {
	fieldsDef,
	DisruptionForm,
	route
} from "~/frontend/disruption"

import {
	FormScreen
} from "~/frontend/form"

import {
	createLoader,
	createAction
} from "~/backend.server/handlers/form"
import { getTableName } from "drizzle-orm"
import { disruptionTable } from "~/drizzle/schema"

export const loader = createLoader({
	getById: disruptionById
})

export const action = createAction({
	fieldsDef,
	create: disruptionCreate,
	update: disruptionUpdate,
	getById: disruptionByIdTx,
	redirectTo: (id) => `${route}/${id}`,
	tableName: getTableName(disruptionTable)
})

export default function Screen() {
	return FormScreen({
		fieldsDef: fieldsDef,
		formComponent: DisruptionForm,
	})
}


