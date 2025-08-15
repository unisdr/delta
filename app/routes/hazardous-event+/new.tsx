import { useLoaderData } from "@remix-run/react";
import { sql } from "drizzle-orm";
import { formSave } from "~/backend.server/handlers/form/form";
import { hazardousEventById, hazardousEventCreate } from "~/backend.server/models/event";
import { dataForHazardPicker } from "~/backend.server/models/hip_hazard_picker";
import { buildTree } from "~/components/TreeView";
import { dr } from "~/db.server";
import { divisionTable } from "~/drizzle/schema";
import {
  fieldsDef,
  HazardousEventForm,
} from "~/frontend/events/hazardeventform";
import { formScreen } from "~/frontend/form";
import {
  authActionGetAuth,
  authActionWithPerm,
  authLoaderGetUserForFrontend,
  authLoaderWithPerm,
} from "~/util/auth";
import { getCountryAccountsIdFromSession, getCountrySettingsFromSession, type UserSession } from "~/util/session";

export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
  const { request } = loaderArgs;
  const user = await authLoaderGetUserForFrontend(loaderArgs);

  // Get tenant context - we need to use the full user session from loaderArgs
  const userSession = (loaderArgs as any).userSession as UserSession;
  if (!userSession) {
    throw new Response("Unauthorized", { status: 401 });
  }
  const hip = await dataForHazardPicker();
  const u = new URL(request.url);

  const parentId = u.searchParams.get("parent") || "";
  const countryAccountsId = await getCountryAccountsIdFromSession(request)

  if (parentId) {
    const parent = await hazardousEventById(parentId);
    if (!parent) {
      throw new Response("Parent not found", { status: 404 });
    }
    // Verify parent belongs to the same tenant
    if (parent.countryAccountsId !== countryAccountsId) {
      throw new Response("Unauthorized Access denied", { status: 403 });
    }
    return {
      hip,
      parentId,
      parent,
      treeData: [],
      ctryIso3: [],
      user,
      countryAccountsId
    };
  }

  // Load divisions filtered by tenant context
  const rawData = await dr
    .select()
    .from(divisionTable)
    .where(sql`country_accounts_id = ${countryAccountsId}`);

  const treeData = buildTree(
    rawData,
    "id",
    "parentId",
    "name",
    "en",
    ["geojson", "importId", "nationalId", "level", "name"]
  );

  // Use tenant's ISO3
  const settings = await getCountrySettingsFromSession(request);
  const ctryIso3 = settings.crtyIso3;

  // Load top-level divisions with geojson, filtered by tenant context
  const divisionGeoJSON = await dr.execute(sql`
    SELECT id, name, geojson
    FROM division
    WHERE parent_id IS NULL
    AND geojson IS NOT NULL
    AND country_accounts_id = ${countryAccountsId};
  `);

  return {
    hip,
    treeData,
    ctryIso3,
    divisionGeoJSON: divisionGeoJSON?.rows || [],
    user,
    countryAccountsId
  };
});

export const action = authActionWithPerm("EditData", async (actionArgs) => {
  const {request} = actionArgs;
  const userSession = authActionGetAuth(actionArgs);
  const countryAccountsId = await getCountryAccountsIdFromSession(request);

  return formSave({
    isCreate: true,
    actionArgs,
    fieldsDef,
    save: async (tx, id, data) => {
      if (!id) {
        const eventData = {
          ...data,
          countryAccountsId: countryAccountsId,
          createdBy: userSession.user.id,
          updatedBy: userSession.user.id
        };
        return hazardousEventCreate(tx, eventData);
      } else {
        throw new Error("Not an update screen");
      }
    },
    redirectTo: (id: string) => `/hazardous-event/${id}`,
  });
});

export default function Screen() {
  let ld = useLoaderData<typeof loader>();

  let fieldsInitial = { parent: ld.parentId };

  return formScreen({
    extraData: {
      hip: ld.hip,
      parent: ld.parent,
      treeData: ld.treeData,
      ctryIso3: ld.ctryIso3,
      user: ld.user,
      divisionGeoJSON: ld.divisionGeoJSON,
      countryAccountsId: ld.countryAccountsId,
    },
    fieldsInitial,
    form: HazardousEventForm,
    edit: false,
  });
}
