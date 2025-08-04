import { InferInsertModel } from "drizzle-orm";
import { dr, Tx } from "~/db.server";
import { auditLogsTable } from "~/drizzle/schema";

type AuditLogInsert = InferInsertModel<typeof auditLogsTable>;

export async function logAudit({
  tableName,
  recordId,
  userId,
  action,
  oldValues,
  newValues,
  tx
}: {
  tableName: string;
  recordId: string;
  userId: number;
  action: string;
  oldValues?: any;
  newValues?: any;
  tx?: Tx
}): Promise<{ record: AuditLogInsert }> {
  const db =  tx || dr;
  const insertedRecord = await db
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
