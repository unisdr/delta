import {
	resourceRepoCreate,
	resourceRepoUpdate,
	resourceRepoById,
	resourceRepoByIdTx,
} from "~/backend.server/models/resource_repo";

import {
	fieldsDef,
	ResourceRepoForm,
	route
} from "~/frontend/resource-repo/form";

import {
	FormScreen
} from "~/frontend/form";

import {
	createLoader,
	createAction
} from "~/backend.server/handlers/form";
import { getTableName } from "drizzle-orm";
import { resourceRepoTable } from "~/drizzle/schema";

export const loader = createLoader({
	getById: resourceRepoById
});

export const action = createAction({
	fieldsDef,
	create: resourceRepoCreate,
	update: resourceRepoUpdate,
	redirectTo: (id) => `${route}/${id}`,
	getById: resourceRepoByIdTx,
	tableName: getTableName(resourceRepoTable),
	action: (isCreate) =>
		isCreate ? "Create resource repo" : "Update resource repo",
});

export default function Screen() {
	return FormScreen({
		fieldsDef: fieldsDef,
		formComponent: ResourceRepoForm,
	})
}
