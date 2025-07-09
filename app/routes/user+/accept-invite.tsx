import {
	ActionFunctionArgs,
	LoaderFunctionArgs,
	redirect,
	MetaFunction
} from "@remix-run/node";
import {
	useActionData,
	useLoaderData,
} from "@remix-run/react";
import {
	Form,
	Field,
	SubmitButton,
	FieldErrorsStandard,
} from "~/frontend/form";
import { formStringData } from "~/util/httputil";
import {
	createUserSession,
	getCountrySettingsFromSession
} from "~/util/session";
import {acceptInvite, AcceptInviteFieldsFromMap, validateInviteCode} from "~/backend.server/models/user/invite";

import { useState, useEffect } from "react";

export const meta: MetaFunction = () => {
  return [
	{ title: "Create your account - DTS" },
	{ name: "description", content: "Create your account page." },
  ];
};

export const loader = async ({request}:LoaderFunctionArgs) => {
	const url = new URL(request.url);
	const inviteCode = url.searchParams.get("inviteCode") || "";
	const state = url.searchParams.get("state") || "";
	const queryStringCode = url.searchParams.get("code") || "";
	const res = await validateInviteCode(inviteCode);

	var email="";
	if(res.ok==true){
		email=res.email;
	}

	return {
		inviteCode: inviteCode,
		inviteCodeValidation: res,
		code: queryStringCode,
		state: state,
		email: email,
	};
};

export const action = async ({ request }: ActionFunctionArgs) => {
	const data = formStringData(await request.formData());
	const inviteCode = data["inviteCode"] || "";
	const data2 = AcceptInviteFieldsFromMap(data) 

	const url = new URL(request.url);
	const baseUrl = `${url.protocol}//${url.host}`;

	const settings = await getCountrySettingsFromSession(request);
	const res = await acceptInvite(inviteCode, data2, baseUrl, settings.websiteName);
	if (!res.ok) {
		return { data, errors: res.errors };
	}
	const headers = await createUserSession(res.userId);
	return redirect("/", { headers });
};

export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();
	const inviteCode = loaderData.inviteCode;
	const email = loaderData.email;
	const actionData = useActionData<typeof action>();

	const errors = actionData?.errors
	const data = actionData?.data

	const [firstname, setFirstname] = useState(data?.firstName || "");
  	const [password, setPassword] = useState(data?.password || "");
  	const [passwordRepeat, setPasswordRepeat] = useState(data?.passwordRepeat || "");

	const [passwordType, setPasswordType] = useState("password");
  	const [passwordRepeatType, setPasswordRepeatType] = useState("password");

	if (!loaderData.inviteCodeValidation.ok) {
		return (
			<>
			<p>{loaderData.inviteCodeValidation.error}</p>
			</>
		)
	}

	
	// Function to check if all form fields are valid
	const isFormValid = () => {
		const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
		const hasUppercase = /[A-Z]/.test(password);
		const hasLowercase = /[a-z]/.test(password);
		const hasNumber = /\d/.test(password);
		const hasSpecialChar = /[@$!%*?&_]/.test(password);

		const hasTwoOfTheFollowing = [hasUppercase, hasLowercase, hasNumber, hasSpecialChar].filter(Boolean).length >= 2;

		return (
			emailRegex.test(email) &&
			firstname &&
			password &&
			passwordRepeat &&
			password === passwordRepeat &&
			hasTwoOfTheFollowing &&
			password.length >= 12 &&
			password !== email
		);
	};

	useEffect(() => {
		// Submit button enabling only when required fields are filled
		const submitButton = document.querySelector("[id='setup-button']") as HTMLButtonElement;
		const imgToggle = document.querySelector("[id='passwordToggleImg']") as HTMLImageElement;
		const imgToggle2 = document.querySelector("[id='passwordToggleImg2']") as HTMLImageElement;
		if (submitButton) {
			// submitButton.disabled = true;
			// validateFormAndToggleSubmitButton('setup-form', 'setup-button');
			submitButton.disabled = !isFormValid(); // Initially disable submit if form is not valid
		}
		if (imgToggle) {
			imgToggle.style.display='block';
		}
		if (imgToggle2) {
			imgToggle2.style.display='block';
		}
	}, [email, firstname, password, passwordRepeat]);



	const togglePasswordVisibility = () => {
		setPasswordType(passwordType === "password" ? "text" : "password");
	};

	const toggleConfirmPasswordVisibility = () => {
		setPasswordRepeatType(passwordRepeatType === "password" ? "text" : "password");
	};

	return (
		<>
			<div className="mg-container">
				<form className="dts-form dts-form--vertical">
					<div className="dts-form__header">
						<a href={ `/user/accept-invite-welcome?inviteCode=${inviteCode}` } className="mg-button mg-button--small mg-button-system">Back</a>
					</div>
					<div className="dts-form__intro">
						<h2 className="dts-heading-1">Create your account</h2>
						<p>Create your account by filling in the required details.</p>
					</div>
				</form>
				
				<Form id="setup-form" className="dts-form dts-form--vertical" errors={errors}>
					<div className="dts-form__body">
						<p>* Required information</p>
						
							<input name="inviteCode" type="hidden" defaultValue={inviteCode}></input>
							
							<Field label="" extraClassName="dts-form-component">
								<input type="text" 
									name="email" 
									placeholder="Email address*"
									defaultValue={email} readOnly ></input>
							</Field>

							<Field label="" extraClassName="dts-form-component">
								<input type="text" 
									name="firstName" 
									placeholder="First name*"
									onChange={(e) => setFirstname(e.target.value)}
									defaultValue={data?.firstName} autoFocus required></input>
							</Field>
							<FieldErrorsStandard errors={errors} field="firstName"></FieldErrorsStandard>

							<Field label="" extraClassName="dts-form-component">
								<input type="text" 
									name="lastName" 
									placeholder="Last name"
									defaultValue={data?.lastName}></input>
							</Field>
							<FieldErrorsStandard errors={errors} field="lastName"></FieldErrorsStandard>

							<Field label="" extraClassName="dts-form-component">
								<div className="dts-form-component__pwd">
									<input type={passwordType} 
										name="password" 
										placeholder="Enter password*"
										minLength={12}
										id="password"
										onChange={(e) => setPassword(e.target.value)}
										defaultValue={data?.password} required></input>
									<button
										type="button"
										onClick={togglePasswordVisibility}
										aria-label="Toggle password visibility"
										className="dts-form-component__pwd-toggle mg-button" 
									>
										{passwordType === "password" ?
											<img src="/assets/icons/eye-hide-password.svg" id="passwordToggleImg" style={{display:"none"}} alt=""></img> :
											<img src="/assets/icons/eye-show-password.svg" id="passwordToggleImg" style={{display:"none"}} alt=""></img>
										}
									</button>
								</div>
							</Field>
							<FieldErrorsStandard errors={errors} field="password"></FieldErrorsStandard>

							<Field label="" extraClassName="dts-form-component">
								<div className="dts-form-component__pwd">
									<input type={passwordRepeatType} 
										placeholder="Confirm password*"
										minLength={12}
										id="passwordRepeat"
										name="passwordRepeat" 
										onChange={(e) => setPasswordRepeat(e.target.value)}
										defaultValue={data?.passwordRepeat} required></input>
									<button
											type="button"
											onClick={toggleConfirmPasswordVisibility}
											aria-label="Toggle password visibility"
											className="dts-form-component__pwd-toggle mg-button" 
										>
											{passwordRepeatType === "password" ?
												<img src="/assets/icons/eye-hide-password.svg" id="passwordToggleImg2" style={{display:"none"}} alt=""></img> :
												<img src="/assets/icons/eye-show-password.svg" id="passwordToggleImg2" style={{display:"none"}} alt=""></img>
											}
									</button>
								</div>
							</Field>
							<FieldErrorsStandard errors={errors} field="passwordRepeat"></FieldErrorsStandard>
							
							<div className="dts-form-component__hint">
								<ul id="passwordDescription">
									<li>At least 12 characters long</li>
									<li>Must include two of the following:
									<ul>
										<li>Uppercase letters</li>
										<li>Lowercase letters</li>
										<li>Numbers</li>
										<li>Special characters</li>
									</ul>
									</li>
									<li>Cannot be the same as the username</li>
									<li>Should not be a simple or commonly used password</li>
								</ul>
							</div>
					</div>
					<div className="dts-form__actions">
						<SubmitButton id="setup-button" label="Set up account"></SubmitButton>
					</div>
				</Form>
			</div>
		</>
		
	);
}


