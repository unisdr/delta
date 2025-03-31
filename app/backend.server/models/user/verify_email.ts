import { dr } from "~/db.server";
import { InferSelectModel, eq } from "drizzle-orm";

import { userTable } from "~/drizzle/schema";

import { Errors, hasErrors } from "~/frontend/form";

import { sendEmail } from "~/util/email";
import { addHours } from "~/util/time";

function generateVerificationCode(digits: number): string {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

const digitsInVerificationCode = 6;

export async function sendEmailVerification(
  user: InferSelectModel<typeof userTable>
) {
  const verificationCode = generateVerificationCode(digitsInVerificationCode);
  const expirationTime = addHours(new Date(), 24);

  await dr
    .update(userTable)
    .set({
      emailVerificationSentAt: new Date(),
      emailVerificationCode: verificationCode,
      emailVerificationExpiresAt: expirationTime,
    })
    .where(eq(userTable.id, user.id));

  const subject = "Verify your account";
  const html = `<p>
                  To continue setting up your DTS account, please verify that this is your email address.
                </p>

                <br/><br/> 
                <p>
                  Please use the following code to activate and finalise the setup of your account. The code will expire in 30 minutes:
                </p>
                <br/>
                <strong>${verificationCode}</strong>`;
  const text = `To continue setting up your DTS account, please verify that this is your email address.
                Please use the following code to activate and finalise the setup of your account. The code will expire in 30 minutes:
                ${verificationCode}`;

  await sendEmail(user.email, subject, text, html);
}

type VerifyEmailResult =
  | { ok: true }
  | { ok: false; errors: Errors<VerifyEmailFields> };

interface VerifyEmailFields {
  code: string;
}

export async function verifyEmail(
  userId: number,
  code: string
): Promise<VerifyEmailResult> {
  let errors: Errors<VerifyEmailFields> = {};
  errors.form = [];
  errors.fields = {};
  if (!code) {
    errors.fields.code = ["Verification code is required"];
  }
  if (hasErrors(errors)) {
    return { ok: false, errors };
  }
  const res = await dr.select().from(userTable).where(eq(userTable.id, userId));

  if (!res || res.length === 0) {
    errors.form = ["Application Error. User not found"];
    return { ok: false, errors };
  }
  const user = res[0];

  if (user.emailVerificationCode !== code) {
    errors.fields.code = ["Invalid verification code"];
    return { ok: false, errors };
  }

  if (user.emailVerificationExpiresAt < new Date()) {
    errors.fields.code = ["Verification code has expired"];
    return { ok: false, errors };
  }

  await dr
    .update(userTable)
    .set({
      emailVerified: true,
      emailVerificationCode: "",
      emailVerificationExpiresAt: new Date("1970-01-01T00:00:00.000Z"),
    })
    .where(eq(userTable.id, userId));

  return { ok: true };
}

