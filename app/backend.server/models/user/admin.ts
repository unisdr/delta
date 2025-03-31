import { dr } from "~/db.server";
import { eq} from "drizzle-orm";

import { userTable, User } from "~/drizzle/schema";

import { Errors, hasErrors } from "~/frontend/form";

import { errorIsNotUnique } from "~/util/db";
import {validateEmail, validateName, validatePassword} from "./user_utils";
import {passwordHash} from "./password";
import {sendEmailVerification} from "./verify_email";

type SetupAdminAccountResult =
  | { ok: true; userId: number }
  | { ok: false; errors: Errors<SetupAdminAccountFields> };

interface SetupAdminAccountFields {
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

export async function setupAdminAccount(
  fields: SetupAdminAccountFields
): Promise<SetupAdminAccountResult> {
  let errors: Errors<SetupAdminAccountFields> = {};
  errors.form = [];
  errors.fields = {};

  validateEmail(fields, errors);
  validateName(fields, errors);
  validatePassword(fields, errors);

  if (hasErrors(errors)) {
    return { ok: false, errors };
  }

  let user: User;

  try {
    const res = await dr
      .insert(userTable)
      .values({
        role: "admin",
        email: fields.email,
        password: passwordHash(fields.password),
        firstName: fields.firstName,
        lastName: fields.lastName,
      })
      .returning();
    user = res[0];
  } catch (e: any) {
    if (errorIsNotUnique(e, "user", "email")) {
      errors.fields.email = ["A user with this email already exists"];
      return { ok: false, errors };
    }
    throw e;
  }

  await sendEmailVerification(user);

  return { ok: true, userId: user.id };
}

export async function setupAdminAccountSSOAzureB2C(
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

  let user: User;

  try {
    const res = await dr
      .insert(userTable)
      .values({
        role: "admin",
        authType: "sso_azure_b2c",
        email: fields.email,
        password: "",
        firstName: fields.firstName,
        lastName: fields.lastName,
      })
      .returning();
    user = res[0];
  } catch (e: any) {
    if (errorIsNotUnique(e, "user", "email")) {
      errors.fields.email = ["A user with this email already exists"];
      return { ok: false, errors };
    }
    throw e;
  }

  sendEmailVerification(user);

  return { ok: true, userId: user.id };
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
    const updatedUserId: { updatedId: number }[] = await dr
      .update(userTable)
      .set({
        password: "",
        authType: "sso_azure_b2c",
        emailVerified: true,
      })
      .where(eq(userTable.email, fields.email))
      .returning({ updatedId: userTable.id });

    console.log(updatedUserId);
  } catch (e: any) {
    if (errorIsNotUnique(e, "user", "email")) {
      errors.fields.email = ["A user with this email already exists"];
      return { ok: false, errors };
    }
    throw e;
  }

  // TODO: remove hardcoded userId
  return { ok: true, userId: 7 };
}

