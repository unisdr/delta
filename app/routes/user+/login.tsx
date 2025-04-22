import type { MetaFunction } from '@remix-run/node';

import {
	ActionFunctionArgs,
	json,
	LoaderFunctionArgs,
	redirect
} from "@remix-run/node";
import {
	useLoaderData,
	useActionData,
	Link,
} from "@remix-run/react";
import { useState, useEffect } from "react";
import {
	Form,
	Field,
	Errors as FormErrors,
	SubmitButton,
	validateFormAndToggleSubmitButton,
} from "~/frontend/form"
import { formStringData } from "~/util/httputil";
import {
	getUserFromSession,
	createUserSession
} from "~/util/session";
import {
	login,
} from "~/backend.server/models/user/auth"
import {
	errorToString
} from "~/frontend/form"
import { configAuthSupportedAzureSSOB2C } from "~/util/config"
import { FaEyeSlash, FaEye } from 'react-icons/fa';


interface LoginFields {
	email: string
	password: string
}

export const action = async ({ request }: ActionFunctionArgs) => {
	const formData = formStringData(await request.formData());
	const data: LoginFields = {
		email: formData.email || "",
		password: formData.password || "",
	}
	const res = await login(data.email, data.password);
	if (!res.ok) {
		let errors: FormErrors<LoginFields> = {
			fields: {
				email: ["Email or password do not match"],
				password: ["Email or password do not match"],
			}
		}
		return json({ data, errors }, { status: 400 }); // Return as a valid Remix response
	}

	// --- PATCH: Check if user is pending activation and redirect to verify-email ---
	const userSession = await getUserFromSession(request);
	if (userSession && userSession.user && userSession.user.emailVerified === false) {
		return redirect("/user/verify-email");
	}

	const headers = await createUserSession(res.userId);

	const url = new URL(request.url);
	let redirectTo = url.searchParams.get("redirectTo");
	redirectTo = getSafeRedirectTo(redirectTo);
	return redirect(redirectTo, { headers });
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const user = await getUserFromSession(request)
	const url = new URL(request.url);
	let redirectTo = url.searchParams.get("redirectTo");
	redirectTo = getSafeRedirectTo(redirectTo);

	if (user) {
		return redirect(redirectTo);
	}
	return { redirectTo: redirectTo, confAuthSupportedAzureSSOB2C: configAuthSupportedAzureSSOB2C() };
};

export function getSafeRedirectTo(redirectTo: string | null, defaultPath: string = "/"): string {
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
	const data = actionData?.data

	const [passwordVisible, setPasswordVisible] = useState(false);

	// Ensure password visibility is initialized on the client to avoid mismatch
	const [isClient, setIsClient] = useState(false);

	useEffect(() => {
		setIsClient(true);

		// Submit button enabling only when required fields are filled
		const submitButton = document.querySelector("[id='login-button']") as HTMLButtonElement;
		if (submitButton) {
			submitButton.disabled = true;

			validateFormAndToggleSubmitButton('login-form', 'login-button');	
		}
	}, []);

	const togglePasswordVisibility = () => {
		setPasswordVisible(!passwordVisible);
	};

	//console.log("Errors object:", errors); // Debugging

	return (
		<>
			<div className="dts-page-container">
				<main className="dts-main-container">
					<div className="mg-container">
						<Form id="login-form" className="dts-form dts-form--vertical" errors={errors}>
							<input type="hidden" value={loaderData.redirectTo} />
							<div className="dts-form__intro">
								<h2 className="dts-heading-1">Sign in</h2>
								<p>Enter your credentials to access your account.</p>
								<p style={{ marginBottom: "2px" }}>*Required information</p>
							</div>
							<div className="dts-form__body" style={{ marginBottom: "5px" }}>
								<div className="dts-form-component" style={{ marginBottom: "10px" }}>
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
												errors?.fields?.email && errors.fields.email.length > 0 // Check if email errors exist
													? "input-error"
													: "input-normal"
											}
											style={{
												paddingRight: "2.5rem", // Static style
												width: "100%", // Static style
											}}
										></input>

									</Field>
								</div>
								<div className="dts-form-component">
									<Field label="">
										<span className="mg-u-sr-only">Password*</span>
										<div
											className="password-wrapper"
											style={{
												display: 'flex',
												alignItems: 'center',
											}}
										>
											<input
												type={passwordVisible ? "text" : "password"}
												autoComplete="off"
												name="password"
												placeholder="*Password"
												defaultValue={data?.password}
												required
												className={
													errors?.fields?.password && errors.fields.password.length > 0 // Check if password errors exist
														? "input-error"
														: "input-normal"
												}
												style={{
													paddingRight: "2.5rem",
													width: "100%",
												}}
											/>
											{/* Password Visibility Toggle Icon */}

											{/* {passwordVisible ?  */}
											{isClient && (
												passwordVisible ? (
													<FaEye
														onClick={togglePasswordVisibility}
														className="dts-form-component__pwd-toggle:focus-visible"
														style={{
															right: '0.75rem',
															marginLeft: "-3rem",
															transform: 'translateY(10%)',
															cursor: 'pointer',
														}}
													/>
												) : (
													<FaEyeSlash
														onClick={togglePasswordVisibility}
														className="dts-form-component__pwd-toggle:focus-visible"
														style={{
															right: '0.75rem',
															marginLeft: "-3rem",
															transform: 'translateY(10%)',
															cursor: 'pointer',
														}}
													/>
												)
											)}
										</div>
										{errors?.fields?.password && (
											<div
												style={{
													color: "red",
													fontSize: "12px",
													marginTop: "0px",
													marginBottom: "0px",
												}}
											>
												{errorToString(errors.fields.password[0])}
											</div>
										)}
									</Field>
								</div>
							</div>
							<u><Link to="/user/forgot-password">Forgot password?</Link></u>
							<div className="dts-dialog__form-actions"
								style={{
									display: "flex", // Switch to horizontal layout
									flexDirection: "column", // Stack vertically for small screens
									alignItems: "center", // Center-align the buttons
									gap: "0.8rem", // Maintain consistent spacing
									marginTop: "2rem", // Keep default top margin
								}}

							>
								<SubmitButton className='mg-button mg-button-primary' label="Sign in"
									id="login-button"
									style={{
										width: "100%", // Full width on small screens
										padding: "10px 20px", // Ensure consistent padding
										marginBottom: "10px",
									}}

								></SubmitButton>
							</div>
							<div>
								{
									loaderData.confAuthSupportedAzureSSOB2C ?
										<Link className='mg-button mg-button-outline' to="/sso/azure-b2c/login"
											style={{
												width: "100%", // Full width on small screens
												padding: "10px 20px", // Ensure consistent padding
												marginTop: "5px",
											}}
										>Login using Azure B2C SSO</Link>
										: ''
								}
							</div>
						</Form>
					</div>
				</main>
			</div>
		</>
	);
}
