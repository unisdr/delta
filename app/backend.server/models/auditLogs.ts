import { eq, InferInsertModel } from "drizzle-orm";
import { dr } from "~/db.server";
import { auditLogsTable, userTable } from "~/drizzle/schema";

type AuditLogInsert = InferInsertModel<typeof auditLogsTable>;

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
  userId: number;
  action: string;
  oldValues?: any;//Record<string, any>;
  newValues?: any;//Record<string, any>;
}): Promise<{ record: AuditLogInsert }> {
  const insertedRecord = await dr
    .insert(auditLogsTable)
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
