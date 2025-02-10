import {
	measureById,
	fieldsDefView
} from "~/backend.server/models/measure";

import {
	MeasureView,
} from "~/frontend/measure";

import {
	createViewLoader,
} from "~/backend.server/handlers/form";

import {
	ViewScreenWithDef
} from "~/frontend/form";

export const loader = createViewLoader({
	getById: measureById,
	extra: {def: fieldsDefView}
});

export default function Screen() {
	return ViewScreenWithDef({
		viewComponent: MeasureView
	})
}

