import { hazardousEventCreate } from "~/backend.server/models/event";
import {
  fieldsDef,
  HazardousEventForm,
} from "~/frontend/events/hazardeventform";
import { formScreen } from "~/frontend/form";
import { formSave } from "~/backend.server/handlers/form/form";
import {
  authActionGetAuth,
  authActionWithPerm,
  authLoaderGetUserForFrontend,
  authLoaderWithPerm,
} from "~/util/auth";
import { useLoaderData } from "@remix-run/react";
import { dataForHazardPicker } from "~/backend.server/models/hip_hazard_picker";
import { hazardousEventById } from "~/backend.server/models/event";
import { buildTree } from "~/components/TreeView";
import { dr } from "~/db.server";
import { divisionTable } from "~/drizzle/schema";
import { sql } from "drizzle-orm";
import type { UserSession } from "~/util/session";
import { getTenantContext } from "~/util/tenant";

export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
  const { request } = loaderArgs;
  const user = authLoaderGetUserForFrontend(loaderArgs);
  
  // Get tenant context - we need to use the full user session from loaderArgs
  const userSession = (loaderArgs as any).userSession as UserSession;
  if (!userSession) {
    throw new Response("Unauthorized", { status: 401 });
  }
  const tenantContext = await getTenantContext(userSession);
  
  const hip = await dataForHazardPicker();
  const u = new URL(request.url);

  const parentId = u.searchParams.get("parent") || "";
  if (parentId) {
    const parent = await hazardousEventById(parentId, tenantContext);
    if (!parent) {
      throw new Response("Parent not found", { status: 404 });
    }
    // Verify parent belongs to the same tenant
    if (parent.countryAccountsId !== tenantContext.countryAccountId) {
      throw new Response("Access denied", { status: 403 });
    }
    return { 
      hip, 
      parentId, 
      parent, 
      treeData: [], 
      ctryIso3: [], 
      user,
      tenantContext
    };
  }

  // Load all divisions (tenant filtering is handled at a higher level)
  const rawData = await dr
    .select()
    .from(divisionTable);

  const treeData = buildTree(
    rawData,
    "id",
    "parentId",
    "name",
    "en",
    ["geojson", "importId", "nationalId", "level", "name"]
  );

  // Use tenant's ISO3
  const ctryIso3 = tenantContext.iso3;

  // Load top-level divisions with geojson
  const divisionGeoJSON = await dr.execute(sql`
    SELECT id, name, geojson
    FROM division
    WHERE (parent_id = 0 OR parent_id IS NULL) 
    AND geojson IS NOT NULL;
  `);

  return {
    hip,
    treeData,
    ctryIso3,
    divisionGeoJSON: divisionGeoJSON?.rows || [],
    user,
    tenantContext
  };
});

export const action = authActionWithPerm("EditData", async (actionArgs) => {
  const userSession = authActionGetAuth(actionArgs);
  const tenantContext = await getTenantContext(userSession);
  
  return formSave({
    isCreate: true,
    actionArgs,
    fieldsDef,
    save: async (tx, id, data) => {
      if (!id) {
        // Add tenant context to the event data
        const eventData = {
          ...data,
          countryAccountsId: tenantContext.countryAccountId,
          countryId: tenantContext.countryId,
          createdBy: userSession.user.id,
          updatedBy: userSession.user.id
        };
        return hazardousEventCreate(tx, eventData, tenantContext, userSession.user.id);
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
		},
		fieldsInitial,
		form: HazardousEventForm,
		edit: false,
	});
}
