import { getTableName } from "drizzle-orm";
import { createDeleteAction } from "~/backend.server/handlers/form/form";
import {
  disasterRecordsById,
  disasterRecordsDeleteById,
} from "~/backend.server/models/disaster_record";
import { disasterRecordsTable } from "~/drizzle/schema";

import { route } from "~/frontend/disaster-record/form";

import { ContentRepeaterUploadFile } from "~/components/ContentRepeater/UploadFile";
import { requireUser } from "~/util/auth";
import { getTenantContext } from "~/util/tenant";

export const action = async (args: any) => {
  // Get user session
  const userSession = await requireUser(args.request);
  if (!userSession) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const tenantContext = await getTenantContext(userSession);

  // Create wrapper functions that include tenant context
  const deleteWithTenant = async (id: string) => {
    return disasterRecordsDeleteById(id, tenantContext);
  };

  const getByIdWithTenant = async (id: string) => {
    return disasterRecordsById(id, tenantContext);
  };

  // Use the createDeleteAction function with our tenant-aware wrappers
  const actionHandler = createDeleteAction({
    baseRoute: route,
    delete: deleteWithTenant,
    tableName: getTableName(disasterRecordsTable),
    getById: getByIdWithTenant,
    postProcess: async (id, data) => {
      console.log(`Post-processing record: ${id}`);
      //console.log(`data: `, data);
      ContentRepeaterUploadFile.delete(data.attachments);
    }
  });

  return actionHandler(args);
}
