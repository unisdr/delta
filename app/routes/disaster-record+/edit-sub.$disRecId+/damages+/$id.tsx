import {
	damagesById,
} from "~/backend.server/models/damages"

import {
	DamagesView,
} from "~/frontend/damages"

import {
	fieldsDefView
} from "~/backend.server/models/damages"
import {createViewLoader} from "~/backend.server/handlers/form/form"
import {ViewScreenWithDef} from "~/frontend/form"

export const loader = createViewLoader({
	getById: damagesById,
	extra: async () => {
		return {def: await fieldsDefView()}
	}
});

export default function Screen() {
	return ViewScreenWithDef({
		viewComponent: DamagesView
	})
}



