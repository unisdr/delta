import {
  assetById,
  fieldsDefView,
} from "~/backend.server/models/asset";

import {
  AssetView,
} from "~/frontend/asset";

import {
  createViewLoader,
} from "~/backend.server/handlers/form";

import {
  ViewScreenWithDef
} from "~/frontend/form";

import { dr } from "~/db.server"; 
import { contentPickerConfigSector } from "~/frontend/asset-content-picker-config";

export const loader = createViewLoader({
  getById: assetById,
  extra: async (item) => {
    const selectedDisplay = await contentPickerConfigSector.selectedDisplay(dr, item?.sectorIds || "");
		return { def: await fieldsDefView(), extraData: { selectedDisplay } };
	},
});

export default function Screen() {
  return ViewScreenWithDef({
    viewComponent: AssetView,
  });
}
