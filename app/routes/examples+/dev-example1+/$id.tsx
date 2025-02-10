import {
	devExample1ById,
	fieldsDefView
} from "~/backend.server/models/dev_example1";

import {
	DevExample1View,
} from "~/frontend/dev_example1";

import {
	createViewLoader,
} from "~/backend.server/handlers/form";

import {
	ViewScreenWithDef
} from "~/frontend/form";

export const loader = createViewLoader({
	getById: devExample1ById,
	extra: {def: fieldsDefView}
});

export default function Screen() {
	return ViewScreenWithDef({
		viewComponent: DevExample1View
	})
}
