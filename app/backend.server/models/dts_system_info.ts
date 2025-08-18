import { sql } from "drizzle-orm";

import {
  dtsSystemInfo,
  InsertDtsSystemInfo,
} from '~/drizzle/schema';

import { Errors, hasErrors } from "~/frontend/form";

import {
  CreateResult,
  UpdateResult,
} from "~/backend.server/handlers/form/form";

import { dr, Tx } from '~/db.server';

export interface DtsSystemInfoFields extends Omit<InsertDtsSystemInfo, "id"> {}

export function validate(
  fields: Partial<DtsSystemInfoFields>
): Errors<DtsSystemInfoFields> {
  let errors: Errors<DtsSystemInfoFields> = {};
  errors.fields = {};
  if (fields.appVersionNo !== undefined && fields.appVersionNo.trim() === "") {
    errors.fields.appVersionNo = ["appVersionNo is required"];
  }
  return errors;
}

export async function dtsSystemInfoCreate(
  tx: Tx,
  fields: DtsSystemInfoFields,
): Promise<CreateResult<DtsSystemInfoFields>> {
  let errors = validate(fields);
  if (hasErrors(errors)) {
    return { ok: false, errors };
  }

  const res = await tx
    .insert(dtsSystemInfo)
    .values({
      ...fields,
    })
    .returning({ id: dtsSystemInfo.id });

  return { ok: true, id: res[0].id };
}

export async function dtsSystemInfoUpdate(
  tx: Tx,
  fields: Partial<DtsSystemInfoFields>
): Promise<UpdateResult<DtsSystemInfoFields>> {
  let errors = validate(fields);
  if (hasErrors(errors)) {
    return { ok: false, errors };
  }
  const result = await tx
    .update(dtsSystemInfo)
    .set({
      ...fields,
    })
    .returning();

  if (result.length >= 0) {
    return { ok: true };
  }
  return {ok: false, errors: {general: ["DtsSystemInfo not updated"]}};
}

export async function dtsSystemInfoSelect() {
  return dtsSystemInfoSelectTx(dr);
}

export async function dtsSystemInfoSelectTx(tx: Tx) {
  let res = await tx.query.dtsSystemInfo.findFirst();

  return res;
}

export async function dtsSystemInfoUpsertRecord(record: DtsSystemInfoFields): Promise<void> {
  // Perform the upsert operation
  await dr
    .insert(dtsSystemInfo)
    .values(record)
    .onConflictDoUpdate({
      target: dtsSystemInfo.id,
      set: { 
        appVersionNo: record.appVersionNo,
        dbVersionNo: record.dbVersionNo,
        updatedAt: sql`NOW()`,
      },
    });
}