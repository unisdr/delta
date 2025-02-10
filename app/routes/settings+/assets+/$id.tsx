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

export const loader = createViewLoader({
  getById: assetById,
  extra: { def: await fieldsDefView() },
});

export default function Screen() {
  return ViewScreenWithDef({
    viewComponent: AssetView,
  });
}
