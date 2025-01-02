import type { MetaFunction } from '@remix-run/node';

import {
	ActionFunctionArgs,
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
	FieldErrors
} from "~/frontend/form"
import { formStringData } from "~/util/httputil";
import {
	getUserFromSession,
	createUserSession
} from "~/util/session";
import {
	login,
} from "~/backend.server/models/user"
import {
	errorToString
} from "~/frontend/form"




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
		return { data, errors };
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
	return { redirectTo: redirectTo };
};

export function getSafeRedirectTo(redirectTo: string | null, defaultPath: string = "/"): string {
	if (redirectTo && redirectTo.startsWith("/")) {
		return redirectTo;
	}
	return defaultPath;
}

export const meta: MetaFunction = () => {
	return [
		{ title: "Login - DTS" },
		{ name: "description", content: "Login." },
	];
};

export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();

	const errors = actionData?.errors
	const data = actionData?.data

	const [email, setEmail] = useState(data?.email || "");

	const [password, setPassword] = useState(data?.password || "");
	const [passwordVisible, setPasswordVisible] = useState(false);




	const togglePasswordVisibility = () => {
		setPasswordVisible(!passwordVisible);
	};

	return (
		<>
			<div className="dts-page-container">
				<main className="dts-main-container">
					<div className="mg-container">
						<Form className="dts-form dts-form--vertical" errors={errors}>
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
										<input type="email" autoComplete="off" name="email" placeholder="Enter email address*" defaultValue={data?.email} required className='{errors?.fields?.email?"input-error":""}'
											style={{
												paddingRight: "2.5rem",
												width: "100%",
												border: errors?.fields?.email ? "1px solid red" : "",
											}}
										></input>

									</Field>
								</div>
								<div className="dts-form-component">
									<Field label="">
										<span className="mg-u-sr-only">Password*</span>
										<div className='password-wrapper' style={{
											//position: 'relative',
											display: 'flex',
											alignItems: 'center',
											//zIndex: 1,
										}}
										>
											<input type={passwordVisible ? "text" : "password"} autoComplete="off" name="password" placeholder="Enter password*" defaultValue={data?.password} required className='{errors?.fields?.password?"input-error":""}'
												style={{
													paddingRight: "2.5rem",
													width: "100%",
													border: errors?.fields?.email ? "1px solid red" : "",
												}}
											></input>
											<img
												src={passwordVisible ? "/assets/icons/eye-hide-password.svg" : "/assets/icons/eye-show-password.svg"}
												alt={passwordVisible ? "Hide password" : "Show password"}
												onClick={togglePasswordVisibility}
												className="toggle-password-visibility"
												style={{
													right: '0.75rem',
													marginLeft: "-2.5rem", // Adjusts icon position relative to input
													cursor: 'pointer',
												}}
											/>
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
							<Link to="/user/forgot-password">Forgot password</Link>
							<div className="dts-dialog__form-actions">
								<SubmitButton className='mg-button mg-button-primary' label="Login"></SubmitButton>
							</div>
							<p style={{ marginBottom: "2px" }}>&nbsp;</p>
							<div>
								<Link className='mg-button mg-button-outline' to="/sso/azure-b2c/callback?action=login">Login using Azure B2C SSO</Link>
							</div>
						</Form>
					</div>
				</main>
			</div>
		</>
	);
}
function isFormValid() {
	throw new Error('Function not implemented.');
}

