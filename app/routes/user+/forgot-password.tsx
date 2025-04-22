import {
	ActionFunctionArgs,
	json,
	MetaFunction,
} from "@remix-run/node";
import {
	useActionData,
} from "@remix-run/react";
import {
	Form,
	Field,
	Errors as FormErrors,
	SubmitButton,
	FormMessage,
	errorToString
} from "~/frontend/form"
import { formStringData } from "~/util/httputil";
import {
	resetPasswordSilentIfNotFound
} from "~/backend.server/models/user/password";
import { redirectWithMessage } from "~/util/session";

import "react-toastify/dist/ReactToastify.css";

import { useEffect } from "react";

import { validateFormAndToggleSubmitButton } from "~/frontend/form";

interface FormFields {
	email: string
}

export const action = async ({ request }: ActionFunctionArgs) => {
	const formData = formStringData(await request.formData());
	let data: FormFields = {
		email: formData.email || ""
	}

	let errors: FormErrors<FormFields> = {}

	if (!data.email) {
		errors = {
			fields: {
				email: ["Email is required"],
			}
		}
		return json({ data, errors })
	}


	// do not show an error message if the email is not found in the database
	await resetPasswordSilentIfNotFound(data.email);


	// Redirect with flash message using redirectWithMessage
	return redirectWithMessage(request, "/user/login", {
		type: "info",
		text: "if the provided email address exist in the system, an email will be sent with instructions to help you recover your password. Please check your inbox and follow the provided steps to regain access to your account."
	});
};

export const loader = async () => {
	return json(null);
};

export const meta: MetaFunction = () => {
	return [
		{ title: "Forgot Password - DTS" },
		{ name: "description", content: "Forgot Password." },
	];
};

export default function Screen() {
	const actionData = useActionData<typeof action>();
	const errors = actionData?.errors
	const data = actionData?.data

	useEffect(() => {
		// Submit button enabling only when required fields are filled
		const submitButton = document.querySelector("[id='reset-password-button']") as HTMLButtonElement;
		if (submitButton) {
			submitButton.disabled = true;
			validateFormAndToggleSubmitButton('reset-password-form', 'reset-password-button');
		}
	}, []);

	return (
		<>
			<div className="dts-page-container">
				<main className="dts-main-container">
					<div className="mg-container">
						<Form id="reset-password-form" className="dts-form dts-form--vertical" errors={errors}>
							<div className="dts-form__header">
								<a href="/user/login" className="mg-button mg-button--small mg-button-system">
									Back
								</a>
							</div>
							<div className="dts-form__intro">
								<h2 className="dts-heading-1" style={{ marginBottom: "5px" }}>Forgot your password?</h2>
								<p style={{ marginBottom: "2px" }}>Please provide us with the email address associated with your account. We will send an email to help you reset your password.</p>
							</div>
							<div className="dts-form__body" style={{ marginBottom: "2px" }}>
								<p style={{ marginBottom: "2px" }}>*Required information</p>
								{data?.email ? (
									<FormMessage>
										<p>Password reminder sent to {data.email}</p>
									</FormMessage>
								) : null}

								<Field label="">
									<input type="email" autoComplete="off" name="email" placeholder="*E-mail address" required
										style={{
											padding: "10px 20px", // Increased padding for larger height
											fontSize: "16px", // Larger font size
											width: "100%",
											borderRadius: "4px",
											border: errors?.fields?.email ? "1px solid red" : "1px solid #ccc", // Ensures border consistency
											boxSizing: "border-box" // Ensures padding does not affect the width
										}}></input>
									{errors?.fields?.email && (
										<div
											style={{
												color: "red",
												fontSize: "12px",
												marginTop: "0px",
												marginBottom: "0px",
											}}
										>
											{errorToString(errors.fields.email[0])}
										</div>
									)}
								</Field>
								<SubmitButton className='mg-button mg-button-primary' label="Reset Password"
									id="reset-password-button"
									style={{
										width: "100%",
										marginTop: "20px",
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
