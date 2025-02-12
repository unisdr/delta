import { dr, Tx } from "~/db.server";
import { unitTable, UnitInsert } from "~/drizzle/schema";
import { eq } from "drizzle-orm";

import { CreateResult, DeleteResult, UpdateResult } from "~/backend.server/handlers/form";
import { Errors, FormInputDef, hasErrors } from "~/frontend/form";
import { deleteByIdForStringId } from "./common";
import {typeEnumData} from "./measureunit";

export interface UnitFields extends Omit<UnitInsert, "id"> {}

export async function fieldsDef(): Promise<FormInputDef<UnitFields>[]> {
  return [
    { key: "type", label: "Type", type: "enum", required: true, enumData: typeEnumData},
    { key: "name", label: "Name", type: "text", required: true },
  ]
}

export async function fieldsDefApi(): Promise<FormInputDef<UnitFields>[]> {
  return [
    ...await fieldsDef(),
    { key: "apiImportId", label: "", type: "other" },
  ]
}

export async function fieldsDefView(): Promise<FormInputDef<UnitFields>[]> {
  return [
    ...await fieldsDef(),
  ]
}

export function validate(_fields: Partial<UnitFields>): Errors<UnitFields> {
  let errors: Errors<UnitFields> = {}
  errors.fields = {}
  return errors
}

export async function unitCreate(tx: Tx, fields: UnitFields): Promise<CreateResult<UnitFields>> {
  let errors = validate(fields)
  if (hasErrors(errors)) {
    return { ok: false, errors }
  }
  let res = await tx.insert(unitTable)
    .values({
      ...fields
    })
    .returning({ id: unitTable.id })
  return { ok: true, id: res[0].id }
}

export async function unitUpdate(tx: Tx, idStr: string, fields: Partial<UnitFields>): Promise<UpdateResult<UnitFields>> {
  let errors = validate(fields)
  if (hasErrors(errors)) {
    return { ok: false, errors }
  }
  let id = idStr
  await tx.update(unitTable)
    .set({
      ...fields
    })
    .where(eq(unitTable.id, id))
  return { ok: true }
}

export type UnitViewModel = Exclude<Awaited<ReturnType<typeof unitById>>,
  undefined
>

export async function unitIdByImportId(tx: Tx, importId: string) {
  let res = await tx.select({
    id: unitTable.id
  }).from(unitTable).where(eq(
    unitTable.apiImportId, importId
  ))
  if (res.length == 0) {
    return null
  }
  return res[0].id
}

export async function unitById(idStr: string) {
  return unitByIdTx(dr, idStr)
}

export async function unitByIdTx(tx: Tx, idStr: string) {
  let id = idStr
  let res = await tx.query.unitTable.findFirst({
    where: eq(unitTable.id, id),
  })
  if (!res) {
    throw new Error("Id is invalid")
  }
  return res
}

export async function unitDeleteById(idStr: string): Promise<DeleteResult> {
  await deleteByIdForStringId(idStr, unitTable)
  return { ok: true }
}
