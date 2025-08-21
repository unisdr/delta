import type { MetaFunction } from "@remix-run/node";
import {
	ActionFunctionArgs,
	LoaderFunctionArgs,
	redirect,
} from "@remix-run/node";
import { useLoaderData, useActionData, Link } from "@remix-run/react";
import { useEffect } from "react";
import {
	Form,
	Field,
	Errors as FormErrors,
	SubmitButton,
	validateFormAndToggleSubmitButton,
	errorToString,
} from "~/frontend/form";
import { formStringData } from "~/util/httputil";
import {
	getUserFromSession,
	createUserSession,
	sessionCookie,
	getCountryAccountsIdFromSession,
} from "~/util/session";
import { login } from "~/backend.server/models/user/auth";
import {
	configAuthSupportedAzureSSOB2C,
	configAuthSupportedForm,
} from "~/util/config";
import PasswordInput from "~/components/PasswordInput";
import { getCountryAccountWithCountryById } from "~/db/queries/countryAccounts";
import { countryAccountStatuses } from "~/drizzle/schema";
import Messages from "~/components/Messages";
import { getUserCountryAccountsByUserId } from "~/db/queries/userCountryAccounts";
import { getInstanceSystemSettingsByCountryAccountId } from "~/db/queries/instanceSystemSetting";
import { createCSRFToken } from "~/backend.server/utils/csrf";

interface LoginFields {
	email: string;
	password: string;
}

export const action = async ({ request }: ActionFunctionArgs) => {
	// Check if form authentication is supported
	if (!configAuthSupportedForm()) {
		return Response.json(
			{
				data: {},
				errors: {
					general: [
						"Form-based authentication is not available. Please use SSO.",
					],
				},
			},
			{ status: 400 }
		);
	}

	const formData = formStringData(await request.formData());
	const data: LoginFields = {
		email: formData.email || "",
		password: formData.password || "",
	};

	const cookieHeader = request.headers.get("Cookie") || "";
	const sessionCurrent = await sessionCookie().getSession(cookieHeader);

	if (formData.csrfToken !== sessionCurrent.get("csrfToken")) {
		return Response.json(
			{
				data,
				errors: {
					general: ["CSRF validation failed. Please ensure you're submitting the form from a valid session. For your security, please restart your browser and try again."],
				},
			},
			{ status: 400 }
		);
	}

	const res = await login(data.email, data.password);
	if (!res.ok) {
		let errors: FormErrors<LoginFields> = {
			fields: {
				email: ["Email or password do not match"],
				password: ["Email or password do not match"],
			},
		};
		return Response.json({ data, errors }, { status: 400 });
	}

	// --- PATCH: Check if user is pending activation and redirect to verify-email ---
	const userSession = await getUserFromSession(request);
	if (
		userSession &&
		userSession.user &&
		userSession.user.emailVerified === false
	) {
		return redirect("/user/verify-email");
	}

	// Check if user's country accounts is inactive, then show error message and redirect to login
	const countryAccountId = res.countryAccountId;
	if (countryAccountId) {
		const countryAccount = await getCountryAccountWithCountryById(
			countryAccountId
		);
		if (
			countryAccount &&
			countryAccount.status === countryAccountStatuses.INACTIVE
		) {
			return Response.json(
				{
					data,
					errors: { general: ["Your country account is inactive"] },
				},
				{ status: 400 }
			);
		}
	}

	//check if he has more than one instance assosiated, redirect to select-instance page,
	//otherwise take him to first page.
	const userCountryAccounts = await getUserCountryAccountsByUserId(res.userId);
	const headerSession = await createUserSession(res.userId);

	const url = new URL(request.url);
	let redirectTo = url.searchParams.get("redirectTo");
	redirectTo = getSafeRedirectTo(redirectTo);

	if (userCountryAccounts && userCountryAccounts.length === 1) {
		const countrySettings = await getInstanceSystemSettingsByCountryAccountId(
			userCountryAccounts[0].countryAccountsId
		);

		const session = await sessionCookie().getSession(
			headerSession["Set-Cookie"]
		);
		session.set("countryAccountsId", userCountryAccounts[0].countryAccountsId);
		session.set("userRole", userCountryAccounts[0].role);
		session.set("countrySettings", countrySettings);
		const setCookie = await sessionCookie().commitSession(session);

		return redirect(redirectTo, {
			headers: { "Set-Cookie": setCookie },
		});
	} else if (userCountryAccounts && userCountryAccounts.length > 1) {
		return redirect("/user/select-instance", { headers: headerSession });
	}
	return redirect(redirectTo, { headers: headerSession });
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const user = await getUserFromSession(request);

	const url = new URL(request.url);
	let redirectTo = url.searchParams.get("redirectTo");
	redirectTo = getSafeRedirectTo(redirectTo);

	const csrfToken = createCSRFToken();

	// Ensure SSO origin is explicitly set for user login
	const cookieHeader = request.headers.get("Cookie") || "";
	const session = await sessionCookie().getSession(cookieHeader);
	session.set("loginOrigin", "user");
	session.set("csrfToken", csrfToken);
	const setCookie = await sessionCookie().commitSession(session);

	if (user) {
		const userCountryAccounts = await getUserCountryAccountsByUserId(
			user.user.id
		);
		if (userCountryAccounts.length > 1) {
			const countryAccountsId = await getCountryAccountsIdFromSession(request);
			if (countryAccountsId) {
				return redirect(redirectTo, { headers: { "Set-Cookie": setCookie } });
			} else {
				return redirect("/user/select-instance", { headers: { "Set-Cookie": setCookie } });
			}
		}
		return redirect(redirectTo, { headers: { "Set-Cookie": setCookie } });
	}

	const isFormAuthSupported = configAuthSupportedForm();
	const isSSOAuthSupported = configAuthSupportedAzureSSOB2C();

	// If no authentication methods are configured, show error
	if (!isFormAuthSupported && !isSSOAuthSupported) {
		throw new Error(
			"No authentication methods configured. Please check AUTHENTICATION_SUPPORTED environment variable."
		);
	}

	return Response.json(
		{
			redirectTo: redirectTo,
			isFormAuthSupported: isFormAuthSupported,
			isSSOAuthSupported: isSSOAuthSupported,
			csrfToken: csrfToken,
		},
		{ headers: { "Set-Cookie": setCookie } }
	);
};

export function getSafeRedirectTo(
	redirectTo: string | null,
	defaultPath: string = "/"
): string {
	if (redirectTo && redirectTo.startsWith("/")) {
		return redirectTo;
	}
	return defaultPath;
}

export const meta: MetaFunction = () => {
	return [
		{ title: "Sign-in - DTS" },
		{ name: "description", content: "Login." },
	];
};

export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();

	const errors = actionData?.errors || {};
	const data = actionData?.data;

	const { isFormAuthSupported, isSSOAuthSupported } = loaderData;

	useEffect(() => {
		// Submit button enabling only when required fields are filled (only if form is supported)
		if (isFormAuthSupported) {
			const submitButton = document.querySelector(
				"[id='login-button']"
			) as HTMLButtonElement;
			if (submitButton) {
				submitButton.disabled = true;
				validateFormAndToggleSubmitButton("login-form", "login-button");
			}
		}
	}, [isFormAuthSupported]);

	// If only SSO is supported, show SSO-only interface
	if (!isFormAuthSupported && isSSOAuthSupported) {
		return (
			<div className="dts-page-container">
				<main className="dts-main-container">
					<div className="mg-container">
						<div className="dts-form dts-form--vertical">
							<div className="dts-form__header"></div>
							<div className="dts-form__intro">
								{errors.general && <Messages messages={errors.general} />}
								<h2 className="dts-heading-1">Sign in</h2>
								<p>
									Use your organization's Single Sign-On to access your account.
								</p>
							</div>
							<div
								className="dts-dialog__form-actions"
								style={{
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									gap: "0.8rem",
									marginTop: "2rem",
								}}
							>
								<Link
									className="mg-button mg-button-primary"
									to="/sso/azure-b2c/login"
									style={{
										width: "100%",
										padding: "10px 20px",
										textAlign: "center",
										textDecoration: "none",
									}}
								>
									Sign in with Azure B2C SSO
								</Link>
							</div>
						</div>
					</div>
				</main>
			</div>
		);
	}

	// If only form is supported, show form-only interface
	if (isFormAuthSupported && !isSSOAuthSupported) {
		return (
			<div className="dts-page-container">
				<main className="dts-main-container">
					<div className="mg-container">
						<Form
							id="login-form"
							className="dts-form dts-form--vertical"
							errors={errors}
						>
							<input type="hidden" name="redirectTo" value={loaderData.redirectTo} />
							<input type="hidden" name="csrfToken" value={loaderData.csrfToken} />
							<div className="dts-form__header"></div>
							<div className="dts-form__intro">
								{errors.general && <Messages messages={errors.general} />}
								<h2 className="dts-heading-1">Sign in</h2>
								<p>Enter your credentials to access your account.</p>
								<p style={{ marginBottom: "2px" }}>*Required information</p>
							</div>
							<div className="dts-form__body" style={{ marginBottom: "5px" }}>
								<div
									className="dts-form-component"
									style={{ marginBottom: "10px" }}
								>
									<Field label="">
										<span className="mg-u-sr-only">Email address*</span>
										<input
											type="email"
											autoComplete="off"
											name="email"
											placeholder="*Email address"
											defaultValue={data?.email}
											required
											className={
												errors?.fields?.email && errors.fields.email.length > 0
													? "input-error"
													: "input-normal"
											}
											style={{
												paddingRight: "2.5rem",
												width: "100%",
											}}
										/>
									</Field>
								</div>
								<div className="dts-form-component">
									<Field label="">
										<PasswordInput
											name="password"
											placeholder="*Password"
											defaultValue={data?.password}
											errors={errors}
											required={true}
										/>
										{errors?.fields?.password && (
											<div className="dts-form-component__hint--error">
												{errorToString(errors.fields.password[0])}
											</div>
										)}
									</Field>
								</div>
							</div>
							<u>
								{isFormAuthSupported && (
									<Link to="/user/forgot-password">Forgot password?</Link>
								)}
							</u>
							<div
								className="dts-dialog__form-actions"
								style={{
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									gap: "0.8rem",
									marginTop: "2rem",
								}}
							>
								<SubmitButton
									className="mg-button mg-button-primary"
									label="Sign in"
									id="login-button"
									style={{
										width: "100%",
										padding: "10px 20px",
										marginBottom: "10px",
									}}
								/>
							</div>
						</Form>
					</div>
				</main>
			</div>
		);
	}

	// If both form and SSO are supported, show both options
	if (isFormAuthSupported && isSSOAuthSupported) {
		return (
			<div className="dts-page-container">
				<main className="dts-main-container">
					<div className="mg-container">
						<Form
							id="login-form"
							className="dts-form dts-form--vertical"
							errors={errors}
						>
							<input type="hidden" name="redirectTo" value={loaderData.redirectTo} />
							<input type="hidden" name="csrfToken" value={loaderData.csrfToken} />
							<div className="dts-form__header"></div>
							<div className="dts-form__intro">
								{errors.general && <Messages messages={errors.general} />}
								<h2 className="dts-heading-1">Sign in</h2>
								<p>Enter your credentials or use SSO to access your account.</p>
								<p style={{ marginBottom: "2px" }}>*Required information</p>
							</div>
							<div className="dts-form__body" style={{ marginBottom: "5px" }}>
								<div
									className="dts-form-component"
									style={{ marginBottom: "10px" }}
								>
									<Field label="">
										<span className="mg-u-sr-only">Email address*</span>
										<input
											type="email"
											autoComplete="off"
											name="email"
											placeholder="*Email address"
											defaultValue={data?.email}
											required
											className={
												errors?.fields?.email && errors.fields.email.length > 0
													? "input-error"
													: "input-normal"
											}
											style={{
												paddingRight: "2.5rem",
												width: "100%",
											}}
										/>
									</Field>
								</div>
								<div className="dts-form-component">
									<Field label="">
										<PasswordInput
											name="password"
											placeholder="*Password"
											defaultValue={data?.password}
											errors={errors}
											required={true}
										/>
										{errors?.fields?.password && (
											<div className="dts-form-component__hint--error">
												{errorToString(errors.fields.password[0])}
											</div>
										)}
									</Field>
								</div>
							</div>
							<u>
								{isFormAuthSupported && (
									<Link to="/user/forgot-password">Forgot password?</Link>
								)}
							</u>
							<div
								className="dts-dialog__form-actions"
								style={{
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									gap: "0.8rem",
									marginTop: "2rem",
								}}
							>
								<SubmitButton
									className="mg-button mg-button-primary"
									label="Sign in"
									id="login-button"
									style={{
										width: "100%",
										padding: "10px 20px",
										marginBottom: "10px",
									}}
								/>

								{/* Divider */}
								<div
									style={{
										width: "100%",
										textAlign: "center",
										margin: "10px 0",
										position: "relative",
									}}
								>
									<hr
										style={{
											border: "none",
											borderTop: "1px solid #ccc",
											margin: "0",
										}}
									/>
									<span
										style={{
											position: "absolute",
											top: "-10px",
											left: "50%",
											transform: "translateX(-50%)",
											backgroundColor: "white",
											padding: "0 15px",
											color: "#666",
											fontSize: "14px",
										}}
									>
										OR
									</span>
								</div>

								<Link
									className="mg-button mg-button-outline"
									to="/sso/azure-b2c/login"
									style={{
										width: "100%",
										padding: "10px 20px",
										textAlign: "center",
										textDecoration: "none",
									}}
								>
									Sign in with Azure B2C SSO
								</Link>
							</div>
						</Form>
					</div>
				</main>
			</div>
		);
	}

	// Fallback - should not reach here if configuration is correct
	return (
		<div className="dts-page-container">
			<main className="dts-main-container">
				<div className="mg-container">
					<div className="dts-form dts-form--vertical">
						<div className="dts-form__intro">
							<h2 className="dts-heading-1">Authentication Not Available</h2>
							<p>
								No valid authentication methods are configured. Please contact
								your system administrator.
							</p>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
