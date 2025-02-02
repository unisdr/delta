import {
	devExample1Create,
	devExample1Update,
	devExample1ById,
	devExample1ByIdTx,
} from "~/backend.server/models/dev_example1";

import {
	fieldsDef,
	DevExample1Form,
	route
} from "~/frontend/dev_example1";

import {
	FormScreen
} from "~/frontend/form";

import {
	createLoader,
	createAction
} from "~/backend.server/handlers/form";
import { getTableName } from "drizzle-orm";
import { devExample1Table } from "~/drizzle/schema";

export const loader = createLoader({
	getById: devExample1ById
});

export const action = createAction({
	fieldsDef,
	create: devExample1Create,
	update: devExample1Update,
	getById: devExample1ByIdTx,
	redirectTo: (id) => `${route}/${id}`,
	tableName: getTableName(devExample1Table)
});

export default function Screen() {
	return FormScreen({
		fieldsDef: fieldsDef,
		formComponent: DevExample1Form,
	})
}
