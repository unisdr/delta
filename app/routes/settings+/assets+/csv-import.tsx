import {
  authLoaderWithPerm
} from "~/util/auth";

import {
  assetCreate,
  assetUpdate,
  assetIdByImportId,
  fieldsDefApi,
  AssetFields
} from "~/backend.server/models/asset";

import {
  createAction,
} from "~/backend.server/handlers/form/csv_import"

import {
  createScreen
} from "~/frontend/csv_import"

import { getCountryAccountsIdFromSession } from "~/util/session";
import { ActionFunctionArgs } from "@remix-run/node";
import { Tx } from "~/db.server";

export let loader = authLoaderWithPerm("EditData", async () => {
  return null
})

export let action = async (args: ActionFunctionArgs) => {
  const { request } = args;

  // Validate tenant context early
  const countryAccountsId = await getCountryAccountsIdFromSession(request);
  if (!countryAccountsId) {
    throw new Response("Unauthorized, no selected instance", { status: 401 });
  }

  // Create the action with tenant-aware functions
  const csvAction = createAction({
    fieldsDef: fieldsDefApi,
    create: async (tx: Tx, fields: AssetFields, tenantId: string) => {
      // Add countryAccountsId to fields before calling assetCreate
      return assetCreate(tx, { ...fields, countryAccountsId: tenantId });
    },
    update: async (tx: Tx, idStr: string, fields: Partial<AssetFields>, tenantId: string) => {
      // Add countryAccountsId to fields before calling assetUpdate
      return assetUpdate(tx, idStr, { ...fields, countryAccountsId: tenantId });
    },
    idByImportId: assetIdByImportId,
  });

  return csvAction(args);
};

export default createScreen({
  title: "Asset",
  apiBaseUrl: "/api/asset",
  listUrl: "/settings/assets"
})