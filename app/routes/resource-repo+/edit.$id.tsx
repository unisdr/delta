import {
	resourceRepoCreate,
	resourceRepoUpdate,
	resourceRepoById,
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

export const loader = createLoader({
	getById: resourceRepoById
});

export const action = createAction({
	fieldsDef,
	create: resourceRepoCreate,
	update: resourceRepoUpdate,
	redirectTo: (id) => `${route}/${id}`
});

export default function Screen() {
	return FormScreen({
		fieldsDef: fieldsDef,
		formComponent: ResourceRepoForm,
	})
}
