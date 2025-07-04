import { dr } from "~/db.server";
import { eq } from "drizzle-orm";

import { userTable } from "~/drizzle/schema";

import bcrypt from "bcryptjs";

import { Errors, hasErrors } from "~/frontend/form";

import { sendEmail } from "~/util/email";
import { addHours } from "~/util/time";

import { checkPasswordComplexity, PasswordErrorType } from "./password_check";

// rounds=10: ~10 hashes/sec
// this measurements is from another implementation
// https://github.com/kelektiv/node.bcrypt.js#readme
const bcryptRounds = 10;

export function passwordHash(password: string): string {
  return bcrypt.hashSync(password, bcryptRounds);
}

export async function passwordHashCompare(password: string, passwordHash: string) {
  if (password == "" || passwordHash == "") {
    return false;
  }
  return await bcrypt.compare(password, passwordHash);
}


export async function resetPasswordSilentIfNotFound(email: string, resetToken: string) {
  const res = await dr
    .select()
    .from(userTable)
    .where(eq(userTable.email, email));

  if (!res || res.length === 0) {
    console.log("reset password, user not found", "email", email);
    return;
  }
  
  const expiresAt = addHours(new Date(), 1);
  await dr
    .update(userTable)
    .set({
      resetPasswordToken: resetToken,
      resetPasswordExpiresAt: expiresAt,
    })
    .where(eq(userTable.email, email));

}

export interface ResetPasswordFields {
  newPassword: string;
  confirmPassword: string;
}

type ResetPasswordResult =
  | { ok: true }
  | { ok: false; errors: Errors<ResetPasswordFields> };

export async function resetPassword(
  email: string,
  token: string,
  newPassword: string,
  confirmPassword: string
): Promise<ResetPasswordResult> {
  let errors: Errors<ResetPasswordFields> = {};
  errors.form = [];
  errors.fields = {};

  const res = await dr
    .select()
    .from(userTable)
    .where(eq(userTable.email, email));

  if (!res || res.length === 0) {
    errors.fields.newPassword = ["User not found"];
    return { ok: false, errors };
  }

  const user = res[0];
  if (user.resetPasswordToken !== token) {
    errors.fields.newPassword = ["Invalid or expired token"];
    return { ok: false, errors };
  }
  const now = new Date();
  if (user.resetPasswordExpiresAt && user.resetPasswordExpiresAt < now) {
    errors.fields.newPassword = ["Token has expired"];
    return { ok: false, errors };
  }
  if (!newPassword) {
    errors.fields.newPassword = ["Password is required"];
    return { ok: false, errors };
  }
  if (!confirmPassword) {
    errors.fields.confirmPassword = ["Confirm password is required"];
    return { ok: false, errors };
  }

  if (newPassword) {
    const res = checkPasswordComplexity(newPassword);
    if (res.error && res.error === PasswordErrorType.TooShort) {
      errors.fields.newPassword = ["Minimum password length is 12"];
      return { ok: false, errors };
    }

    if (
      res.error &&
      res.error === PasswordErrorType.InsufficientCharacterClasses
    ) {
      errors.fields.newPassword = [
        "Must include two of the followings: uppercase, lowercase , numbers letters, special characters",
      ];
      return {
        ok: false,
        errors,
      };
    }

    if (newPassword === user.email) {
      errors.fields.newPassword = [
        "Password cannot be as email. Please choose a different password.",
      ];
      return { ok: false, errors };
    }
  }
  if (newPassword !== confirmPassword) {
    errors.fields.confirmPassword = ["New passwords do not match."];
    return { ok: false, errors };
  }

  const hashedPassword = passwordHash(newPassword);
  await dr
    .update(userTable)
    .set({
      password: hashedPassword,
      resetPasswordToken: "",
    })
    .where(eq(userTable.email, email));

  // send password reset confirmation email.
  //const userLoginURL = `${configSiteURL}/user/login`;
  const subject = "Password change";
  const text = `
              Your password has been successfully changed. If you did not request this change, please contact your admin.
            `;
  const html = `
              <p>
                Your password has been successfully changed. If you did not request this change, please contact your admin.
              </p>
              `;

  await sendEmail(user.email, subject, text, html);
  return { ok: true };
}


export interface ChangePasswordFields {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

type ChangePasswordResult =
  | { ok: true }
  | { ok: false; errors: Errors<ChangePasswordFields> };

export async function changePassword(
  userId: number,
  fields: ChangePasswordFields
): Promise<ChangePasswordResult> {
  let errors: Errors<ChangePasswordFields> = {};
  errors.form = [];
  errors.fields = {};

  const { currentPassword, newPassword, confirmPassword } = fields;

  if (!currentPassword) {
    errors.fields.currentPassword = ["Current password is required"];
  }

  if (!newPassword) {
    errors.fields.newPassword = ["New password is required"];
  }

  if (hasErrors(errors)) {
    return { ok: false, errors };
  }

  const res = await dr.select().from(userTable).where(eq(userTable.id, userId));

  if (!res || res.length === 0) {
    errors.form = ["Application error. User not found"];
    return { ok: false, errors };
  }

  const user = res[0];

  if (newPassword) {
    const res = checkPasswordComplexity(newPassword);
    if (res.error && res.error === PasswordErrorType.TooShort) {
      errors.fields.newPassword = ["Minimum password length is 12"];
    } else if (
      res.error &&
      res.error === PasswordErrorType.InsufficientCharacterClasses
    ) {
      errors.fields.newPassword = [
        "Must include two of the followings: uppercase, lowercase , numbers letters, special characters",
      ];
    } else if (newPassword === user.email) {
      errors.fields.newPassword = ["Password cannot be as email."];
    } else if (newPassword === currentPassword) {
      errors.fields.newPassword = ["Password cannot be as default password."];
    }
    if (hasErrors(errors)) {
      return { ok: false, errors };
    }
  }
  if (newPassword && confirmPassword !== newPassword) {
    errors.fields.confirmPassword = ["New passwords do not match"];
    return { ok: false, errors };
  }

  const passwordValid = await passwordHashCompare(
    currentPassword,
    user.password
  );
  if (!passwordValid) {
    errors.fields.currentPassword = ["Current password is incorrect"];
    return { ok: false, errors };
  }

  const hashedPassword = passwordHash(newPassword);

  await dr
    .update(userTable)
    .set({
      password: hashedPassword,
    })
    .where(eq(userTable.id, userId));

  return { ok: true };
}
