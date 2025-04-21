import { json, MetaFunction } from "@remix-run/node";

import {
  authLoaderGetAuth,
  authActionGetAuth,
  authLoaderAllowUnverifiedEmail,
  authActionAllowUnverifiedEmail,
} from "~/util/auth";

import { useLoaderData, useActionData } from "@remix-run/react";

import { verifyEmail } from "~/backend.server/models/user/verify_email";
import { sendEmailVerification } from "~/backend.server/models/user/verify_email";

import { formStringData } from "~/util/httputil";

import { errorToString } from "~/frontend/form";

import { redirect } from "@remix-run/node";

import { formatTimestamp } from "~/util/time";
import { sendEmail } from "~/util/email";
import { configCountryName, configSiteName, configSiteURL } from "~/util/config";

import React from 'react';

export const meta: MetaFunction = () => {
  return [
    { title: "Account Setup Email Verification - DTS" },
    { name: "description", content: "Admin setup." },
  ];
};

export const action = authActionAllowUnverifiedEmail(async (actionArgs) => {
  const { request } = actionArgs;
  const { user } = authActionGetAuth(actionArgs);
  const data = formStringData(await request.formData());
  const code = data.code || "";
  const resend = data.resend || "";
  const userId = user.id;

  // Handle resend OTP
  if (resend) {
    await sendEmailVerification(user);
    return json({ resend: true });
  }

  const res = await verifyEmail(userId, code);
  if (!res.ok) {
    return Response.json({ data, errors: res.errors });
  }

  //Send confirmation email
  const countryName = configCountryName();
  const siteURL = configSiteURL();
  const subject = `Welcome to DTS ${configSiteName()}`;
  const html = `
    <p>
      Dear ${user.firstName} ${user.lastName},
    </p>
    <p>
      Welcome to the DTS ${countryName} system. Your user account has been successfully created.
    </p>
    <p>
      Click the link below to access your account:
    </p>
    <p>
      <a href="${siteURL}/settings/access-mgmnt" 
         style="display: inline-block; padding: 10px 20px; font-size: 16px; color: #ffffff; 
         background-color: #007BFF; text-decoration: none; border-radius: 5px;">
        Access My Account
      </a>
    </p>
    <p>
      If the button above does not work, copy and paste the following URL into your browser:
      <br>
      <a href="${siteURL}/settings/access-mgmnt">${siteURL}/settings/access-mgmnt</a>
    </p>
  `;

  const text = `Dear ${user.firstName} ${user.lastName}
                Welcome to the DTS ${countryName} system. Your user account has been successfully created.
                Copy and paste the following link into your browser URL to access your account:
                ${siteURL}/settings/access-mgmnt" 
                `;
  await sendEmail(user.email, subject, text, html);
  return redirect("/");
});

export const loader = authLoaderAllowUnverifiedEmail(async (loaderArgs) => {
  const { user } = authLoaderGetAuth(loaderArgs);
  return json({
    userEmail: user.email,
    // passing this as date does not work in remix, the type of data received is string on the other end
    // set it explicitly to string here so the type matches
    sentAt: user.emailVerificationSentAt,
  });
});

export default function Data() {
  const pageData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors;
  const [resent, setResent] = React.useState(false);
  const [otp, setOtp] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // On mount, always sync OTP state to the input value (even if empty)
  React.useEffect(() => {
    const input = document.querySelector('input[name="code"]') as HTMLInputElement | null;
    setOtp(input?.value || "");
  }, []);

  React.useEffect(() => {
    if (actionData && actionData.resend) {
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    }
  }, [actionData]);

  // Find the form submit and attach a handler to set loading
  React.useEffect(() => {
    const form = document.querySelector('form[action="/user/verify-email"]');
    if (!form) return;
    const handler = () => setIsSubmitting(true);
    form.addEventListener('submit', handler);
    return () => form.removeEventListener('submit', handler);
  }, []);

  // Handler to clear OTP when resending
  const handleResend = React.useCallback(() => {
    setOtp("");
    const input = document.querySelector('input[name="code"]') as HTMLInputElement | null;
    if (input) input.value = "";
    // Submit the form programmatically as before
    const form = document.querySelector('form[action="/user/verify-email"]') as HTMLFormElement | null;
    if (form) {
      const resendInput = document.createElement('input');
      resendInput.type = 'hidden';
      resendInput.name = 'resend';
      resendInput.value = '1';
      form.appendChild(resendInput);
      form.submit();
      form.removeChild(resendInput);
    }
  }, []);

  return (
    <div className="dts-page-container">
      <main className="dts-main-container">
        <div className="mg-container">

          <form
            action="/user/verify-email"
            className="dts-form dts-form--vertical"
            method="post"
          >
            <div className="dts-form__header">
              {/* Update the href to point to the admin-account route */}
              <a
                href="/setup/admin-account"
                className="mg-button mg-button--small mg-button-system"
              >
                Back
              </a>
              <span>Disaster Tracking System</span>
            </div>
            <div className="dts-form__intro">
              <h2 className="dts-heading-1">Enter code we sent to you at</h2>
              <p>{pageData.userEmail}</p>
              {pageData.sentAt ? (
                <p>
                  A one-time password has been sent to your email on{" "}
                  {formatTimestamp(pageData.sentAt)}.
                </p>
              ) : null}
            </div>
            <div className="dts-form__body">
              <div className="dts-form-component">
                <label>
                  <div className="dts-form-component__label">
                    <span className="mg-u-sr-only">OTP code</span>
                  </div>
                  <input
                    type="text"
                    name="code"
                    required
                    minLength={6}
                    maxLength={6}
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    placeholder="Enter OTP code*"
                  />
                </label>
                {errors &&
                  errors.fields &&
                  errors.fields.code &&
                  errors.fields.code.length > 0 && (
                    <div style={{ color: "red", marginTop: "8px" }}>
                      {errorToString(errors.fields.code[0])}
                    </div>
                  )}
              </div>
              <div className="dts-form__additional-content dts-form__additional-content--centered">
                <div>Code expires in 30:00</div>
                <button
                  type="button"
                  className="mg-button mg-button--small mg-button-ghost"
                  onClick={() => {
                    const form = document.querySelector('form[action="/user/verify-email"]') as HTMLFormElement;
                    if (form) {
                      const resendInput = document.createElement('input');
                      resendInput.type = 'hidden';
                      resendInput.name = 'resend';
                      resendInput.value = '1';
                      form.appendChild(resendInput);
                      form.submit();
                      form.removeChild(resendInput);
                    }
                  }}
                >
                  Send again
                </button>
                {resent && (
                  <div style={{ color: 'green', marginTop: 8 }}>Verification code resent!</div>
                )}
              </div>
            </div>
            <div className="dts-form__actions">
              <button
                type="submit"
                className="mg-button mg-button-primary"
                disabled={typeof window !== "undefined" ? isSubmitting || otp.length < 6 : undefined}
              >
                Complete account setup
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
