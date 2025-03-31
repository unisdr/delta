import {
  unitById,
  fieldsDefView
} from "~/backend.server/models/unit";

import {
  UnitView,
} from "~/frontend/unit";

import {
  createViewLoader,
} from "~/backend.server/handlers/form/form";

import {
  ViewScreenWithDef
} from "~/frontend/form";

export let loader = createViewLoader({
  getById: unitById,
	extra: async () => {
		return {def: await fieldsDefView()}
	}
});

export default function Screen() {
  return ViewScreenWithDef({
    viewComponent: UnitView
  })
}
