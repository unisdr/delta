import { dr } from "~/db.server";
import { eq } from "drizzle-orm";

import { userTable } from "~/drizzle/schema";

import { Errors, hasErrors } from "~/frontend/form";

import { errorIsNotUnique } from "~/util/db";

type SetupAdminAccountResult =
  | { ok: true; userId: string; pendingActivation?: boolean }
  | { ok: false; errors: Errors<SetupAdminAccountFields> };

export interface SetupAdminAccountFields {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  passwordRepeat: string;
}

export function setupAdminAccountFieldsFromMap(data: {
  [key: string]: string;
}): SetupAdminAccountFields {
  const fields: (keyof SetupAdminAccountFields)[] = [
    "email",
    "firstName",
    "lastName",
    "password",
    "passwordRepeat",
  ];
  return Object.fromEntries(
    fields.map((field) => [field, data[field] || ""])
  ) as unknown as SetupAdminAccountFields;
}

export async function setupAccountSSOAzureB2C(
  fields: SetupAdminAccountFields
): Promise<SetupAdminAccountResult> {
  let errors: Errors<SetupAdminAccountFields> = {};
  errors.form = [];
  errors.fields = {};
  if (fields.email == "") {
    errors.fields.email = ["Email is empty"];
  }
  if (fields.firstName == "") {
    errors.fields.firstName = ["First name is empty"];
  }

  if (hasErrors(errors)) {
    return { ok: false, errors };
  }

  try {
    await dr
      .update(userTable)
      .set({
        password: "",
        authType: "sso_azure_b2c",
        emailVerified: true,
      })
      .where(eq(userTable.email, fields.email))
      .returning({ updatedId: userTable.id });

  } catch (e: any) {
    if (errorIsNotUnique(e, "user", "email")) {
      errors.fields.email = ["A user with this email already exists"];
      return { ok: false, errors };
    }
    throw e;
  }

  // TODO: remove hardcoded userId
  return { ok: true, userId: "7" };
}
