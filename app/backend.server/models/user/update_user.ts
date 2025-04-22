import { dr } from "~/db.server";
import { eq, sql } from "drizzle-orm";

import { userTable } from "~/drizzle/schema";

import { Errors, hasErrors } from "~/frontend/form";

import { errorIsNotUnique } from "~/util/db";

import { logAudit } from "./../auditLogs";

type AdminUpdateUserResult =
  | { ok: true; userId: number }
  | { ok: false; errors: Errors<AdminUpdateUserFields> };

export interface AdminUpdateUserFields {
  generatedSystemIdentifier: string;
  activated: any;
  dateAdded: any;
  addedBy: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  organization: string;
  role: string;
}

export function adminUpdateUserFieldsFromMap(data: {
  [key: string]: string;
}): AdminUpdateUserFields {
  const fields: (keyof AdminUpdateUserFields)[] = [
    "email",
    "firstName",
    "lastName",
    "organization",
    "role",
  ];
  return Object.fromEntries(
    fields.map((field) => [field, data[field] || ""])
  ) as unknown as AdminUpdateUserFields;
}

export async function adminUpdateUser(
  id: number,
  fields: AdminUpdateUserFields,
  userId: number
): Promise<AdminUpdateUserResult> {
  let errors: Errors<AdminUpdateUserFields> = {};
  errors.form = [];
  errors.fields = {};
  if (fields.email == "") {
    errors.fields.email = ["Email is empty"];
  }
  if (fields.firstName == "") {
    errors.fields.firstName = ["First name is empty"];
  }
  if (fields.role == "") {
    errors.fields.role = ["Role is required"];
  }

  if (hasErrors(errors)) {
    return { ok: false, errors };
  }

  const oldRecord = await dr
    .select()
    .from(userTable)
    .where(eq(userTable.id, id));

  let res = null;
  try {
    res = await dr
      .update(userTable)
      .set({
        email: fields.email,
        firstName: fields.firstName,
        lastName: fields.lastName,
        organization: fields.organization,
        role: fields.role,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(userTable.id, id))
      .returning();
    // .returning({ id: userTable.id });

    if (res.length == 0) {
      errors.form.push("User was not found using provided ID.");
      return { ok: false, errors };
    }
  } catch (e: any) {
    if (errorIsNotUnique(e, "user", "email")) {
      errors.fields.email = ["A user with this email already exists"];
      return { ok: false, errors };
    }
    throw e;
  }

  logAudit({
    tableName: "user",
    recordId: oldRecord[0].id + "",
    userId: userId,
    action: "Update user data",
    oldValues: oldRecord[0],
    newValues: res[0],
  });

  // sendEmailVerification(user);

  return { ok: true, userId: id };
}

