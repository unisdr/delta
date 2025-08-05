import type { MetaFunction } from "@remix-run/node";

import {
	ActionFunctionArgs,
	LoaderFunctionArgs,
	redirect,
} from "@remix-run/node";
import { useActionData } from "@remix-run/react";
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
import { createSuperAdminSession, getSuperAdminSession } from "~/util/session";
import { superAdminLogin } from "~/backend.server/models/user/auth";
import { configAuthSupportedAzureSSOB2C } from "~/util/config";
import PasswordInput from "~/components/PasswordInput";
import Messages from "~/components/Messages";

interface LoginFields {
	email: string;
	password: string;
}

export const action = async ({ request }: ActionFunctionArgs) => {
	const formData = formStringData(await request.formData());
	const data: LoginFields = {
		email: formData.email || "",
		password: formData.password || "",
	};
	const res = await superAdminLogin(data.email, data.password);
	if (!res.ok) {
		let errors: FormErrors<LoginFields> = {
			fields: {
				email: ["Email or password do not match"],
				password: ["Email or password do not match"],
			},
		};
		return Response.json({ data, errors }, { status: 400 });
	}

	const headers = await createSuperAdminSession(res.superAdminId);

	let redirectTo = "/admin/country-accounts";
	redirectTo = getSafeRedirectTo(redirectTo);
	return redirect(redirectTo, { headers });
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const superAdminSession = await getSuperAdminSession(request);
	let redirectTo = "/admin/country-accounts";
    
	if (superAdminSession) {
        return redirect(redirectTo);
	}
    redirectTo = "/admin/login";
	return {
		redirectTo: redirectTo,
		confAuthSupportedAzureSSOB2C: configAuthSupportedAzureSSOB2C(),
	};
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
		{ title: "Sign-in - Super Admin - DTS" },
		{ name: "description", content: "Login." },
	];
};


export default function Screen() {
	const actionData = useActionData<typeof action>();

	const errors = actionData?.errors || {};
	const data = actionData?.data;

	useEffect(() => {
		// Submit button enabling only when required fields are filled
		const submitButton = document.querySelector(
			"[id='login-button']"
		) as HTMLButtonElement;
		if (submitButton) {
			submitButton.disabled = true;

			validateFormAndToggleSubmitButton("login-form", "login-button");
		}
	}, []);

	return (
		<>
			<div className="dts-page-container">
				<main className="dts-main-container">
					<div className="mg-container">
						<Form
							id="login-form"
							className="dts-form dts-form--vertical"
							errors={errors}
						>
							{/* <input type="hidden" value={loaderData.redirectTo} /> */}
							<div className="dts-form__header"></div>
							<div className="dts-form__intro">
								{errors.general && <Messages messages={errors.general} />}
								<h2 className="dts-heading-1">Sign in - Admin Management</h2>
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
										></input>
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
							<div
								className="dts-dialog__form-actions"
								style={{
									display: "flex",
									flexDirection: "column", // Stack vertically for small screens
									alignItems: "center", // Center-align the buttons
									gap: "0.8rem", // Maintain consistent spacing
									marginTop: "2rem", // Keep default top margin
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
								></SubmitButton>
							</div>
						</Form>
					</div>
				</main>
			</div>
		</>
	);
}
