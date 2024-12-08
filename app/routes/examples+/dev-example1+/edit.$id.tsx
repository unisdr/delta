import {
	devExample1Create,
	devExample1Update,
	devExample1ById,
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

export const loader = createLoader({
	getById: devExample1ById
});

export const action = createAction({
	fieldsDef,
	create: devExample1Create,
	update: devExample1Update,
	redirectTo: (id) => `${route}/${id}`
});

export default function Screen() {
	return FormScreen({
		fieldsDef: fieldsDef,
		formComponent: DevExample1Form,
	})
}
