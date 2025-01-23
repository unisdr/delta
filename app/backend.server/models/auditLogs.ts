import { InferInsertModel } from "drizzle-orm";
import { dr } from "~/db.server";
import { auditLogs } from "~/drizzle/schema";

type AuditLogInsert = InferInsertModel<typeof auditLogs>;


export async function logAudit({
  tableName,
  recordId,
  userId,
  action,
  oldValues,
  newValues,
}: {
  tableName: string;
  recordId: string;
  userId: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
}): Promise<{ record: AuditLogInsert }> {
  const insertedRecord = await dr
    .insert(auditLogs)
    .values({
      tableName,
      recordId,
      userId,
      action,
      oldValues: oldValues ? JSON.stringify(oldValues) : null,
      newValues: newValues ? JSON.stringify(newValues) : null,
    })
    .returning();

    return { record: insertedRecord[0] }; 
}
