import { MetaFunction } from "@remix-run/node";

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

import React from "react";
import { useNavigate } from "@remix-run/react";
import { notifyInfo, notifyError } from "~/frontend/utils/notifications";

export const meta: MetaFunction = () => {
	return [
		{ title: "Account Setup Email Verification - DELTA Resilience" },
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
		return { resend: true };
	}

	const res = await verifyEmail(userId, code);
	if (!res.ok) {
		return { data, errors: res.errors };
	}

	return redirect("/user/verify-email-complete?step=0");
});

export const loader = authLoaderAllowUnverifiedEmail(async (loaderArgs) => {
	const { user } = authLoaderGetAuth(loaderArgs);
	// Calculate expiry time (30 minutes after sentAt)
	const OTP_EXPIRY_MINUTES = 30;
	const sentAtRaw = user.emailVerificationSentAt;
	let expiresAt: string | null = null;
	if (sentAtRaw) {
		const sentAtDate = new Date(sentAtRaw);
		expiresAt = new Date(
			sentAtDate.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000
		).toISOString();
	}
	return {
		userEmail: user.email,
		sentAt: sentAtRaw,
		expiresAt, // may be null if sentAtRaw is null
	};
});

export default function Data() {
	const pageData = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const errors = actionData?.errors;
	const [resent, setResent] = React.useState(false);
	const [otp, setOtp] = React.useState("");
	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const navigate = useNavigate();

	// On mount, always sync OTP state to the input value (even if empty)
	React.useEffect(() => {
		const input = document.querySelector(
			'input[name="code"]'
		) as HTMLInputElement | null;
		setOtp(input?.value || "");
	}, []);

	React.useEffect(() => {
		if (actionData && actionData.resend) {
			setResent(true);
			setTimeout(() => setResent(false), 5000);
		}
	}, [actionData]);

	React.useEffect(() => {
		if (typeof window !== "undefined") {
			notifyInfo(
				"Please verify your account. An one time password has been sent to your email.",
				{ toastId: "verify-account-info" }
			);
			// Listen for offline event
			function handleOffline() {
				notifyError(
					"Error - No internet connection. Please connect to wifi or try again later."
				);
			}
			window.addEventListener("offline", handleOffline);
			return () => {
				window.removeEventListener("offline", handleOffline);
			};
		}
		return undefined;
	}, []);

	// Find the form submit and attach a handler to set loading
	React.useEffect(() => {
		const form = document.querySelector('form[action="/user/verify-email"]');
		if (!form) return;
		const handler = () => setIsSubmitting(true);
		form.addEventListener("submit", handler);
		return () => form.removeEventListener("submit", handler);
	}, []);

	// Handler to clear OTP when resending
	React.useCallback(() => {
		setOtp("");
		const input = document.querySelector(
			'input[name="code"]'
		) as HTMLInputElement | null;
		if (input) input.value = "";
		// Submit the form programmatically as before
		const form = document.querySelector(
			'form[action="/user/verify-email"]'
		) as HTMLFormElement | null;
		if (form) {
			const resendInput = document.createElement("input");
			resendInput.type = "hidden";
			resendInput.name = "resend";
			resendInput.value = "1";
			form.appendChild(resendInput);
			form.submit();
			form.removeChild(resendInput);
		}
	}, []);

	// --- OTP Countdown Component ---
	function OTPCountdown({ expiresAt }: { expiresAt: string }) {
		const [timeLeft, setTimeLeft] = React.useState(() => {
			return Math.max(
				0,
				Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
			);
		});

		React.useEffect(() => {
			if (timeLeft <= 0) return;
			const interval = setInterval(() => {
				setTimeLeft((prev) => {
					if (prev <= 1) {
						clearInterval(interval);
						return 0;
					}
					return prev - 1;
				});
			}, 1000);
			return () => clearInterval(interval);
		}, [timeLeft, expiresAt]);

		const minutes = Math.floor(timeLeft / 60);
		const seconds = timeLeft % 60;

		return (
			<span>
				Code expires in {minutes}:{seconds.toString().padStart(2, "0")}
			</span>
		);
	}

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
							<button
								type="button"
								className="mg-button mg-button--small mg-button-system"
								onClick={() =>
									navigate("/setup/admin-account", {
										state: { fromVerifyEmail: true },
									})
								}
							>
								Back
							</button>
							<span>DELTA Resilience</span>
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
										onChange={(e) => setOtp(e.target.value)}
										placeholder="Enter OTP code*"
										className={
											errors &&
											errors.fields &&
											errors.fields.code &&
											errors.fields.code.length > 0
												? "input-error"
												: "input-normal"
										}
									/>
								</label>
								{errors &&
									errors.fields &&
									errors.fields.code &&
									errors.fields.code.length > 0 && (
										<div className="dts-form-component__hint--error">
											{errorToString(errors.fields.code[0])}
										</div>
									)}
							</div>
							<div className="dts-form__additional-content dts-form__additional-content--centered">
								{pageData.expiresAt ? (
									<OTPCountdown expiresAt={pageData.expiresAt} />
								) : null}
								<button
									type="button"
									className="mg-button mg-button--small mg-button-ghost"
									onClick={() => {
										const form = document.querySelector(
											'form[action="/user/verify-email"]'
										) as HTMLFormElement;
										if (form) {
											const resendInput = document.createElement("input");
											resendInput.type = "hidden";
											resendInput.name = "resend";
											resendInput.value = "1";
											form.appendChild(resendInput);
											form.submit();
											form.removeChild(resendInput);
										}
									}}
								>
									Send again
								</button>
								{resent && (
									<div style={{ color: "green", marginTop: 8 }}>
										Verification code resent!
									</div>
								)}
							</div>
						</div>
						<div className="dts-form__actions">
							<button
								type="submit"
								className="mg-button mg-button-primary"
								disabled={
									typeof window !== "undefined"
										? isSubmitting || otp.length < 6
										: undefined
								}
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
