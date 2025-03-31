import { dr } from "~/db.server";
import { eq } from "drizzle-orm";

import { userTable, User } from "~/drizzle/schema";

import * as OTPAuth from "otpauth";
import {loginTotp} from "./auth";


function totpSettings(userEmail: string, secret: string) {
  if (!secret) {
    throw "provide secret";
  }

  return new OTPAuth.TOTP({
    issuer: process.env.TOTP_ISSUER || "example-app",
    label: userEmail,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: secret,
  });
}

type GenerateTotpResult =
  | { ok: true; secret: string; secretUrl: string }
  | { ok: false; error: string };

const totpSecretSize = 16;

export async function generateTotpIfNotSet(
  userId: number
): Promise<GenerateTotpResult> {
  const res = await dr.select().from(userTable).where(eq(userTable.id, userId));

  if (!res || res.length === 0) {
    throw "User not found";
  }

  const user = res[0];

  if (user.totpEnabled) {
    return { ok: false, error: "TOTP already enabled" };
  }

  if (user.totpSecret) {
    return { ok: true, secret: user.totpSecret, secretUrl: user.totpSecretUrl };
  }

  const secret = new OTPAuth.Secret({ size: totpSecretSize }).base32;

  const totp = totpSettings(user.email, secret);

  if (!secret) {
    throw "Application Error";
  }

  // url with secret and params
  const secretUrl = totp.toString();

  await dr
    .update(userTable)
    .set({
      totpSecret: secret,
      totpSecretUrl: secretUrl,
    })
    .where(eq(userTable.id, userId));

  return {
    ok: true,
    secret,
    secretUrl,
  };
}

export async function isValidTotp(user: User, token: string): Promise<boolean> {
  if (!user.totpSecret) {
    throw "TOTP secret not set";
  }
  if (!token) {
    return false;
  }
  const totp = totpSettings(user.email, user.totpSecret);
  let delta = totp.validate({ token, window: 1 });
  if (delta === null) {
    return false;
  }
  return true;
}

type SetTotpEnabledResult = { ok: true } | { ok: false; error: string };

export async function setTotpEnabled(
  userId: number,
  token: string,
  enabled: boolean
): Promise<SetTotpEnabledResult> {
  const res = await dr.select().from(userTable).where(eq(userTable.id, userId));

  if (!res || res.length === 0) {
    throw "User not found";
  }

  const user = res[0];

  if (!token) {
    return { ok: false, error: "Empty token" };
  }

  const isValid = await isValidTotp(user, token);

  if (!isValid) {
    return { ok: false, error: "Invalid token" };
  }

  let data;

  if (enabled) {
    data = {
      totpEnabled: enabled,
    };
  } else {
    data = {
      totpEnabled: enabled,
      totpSecret: "",
      totpSecretUrl: "",
    };
  }

  await dr.update(userTable).set(data).where(eq(userTable.id, userId));

  if (enabled) {
    return await loginTotp(userId, token);
  }

  return { ok: true };
}

