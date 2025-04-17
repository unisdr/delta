import {
	ActionFunctionArgs,
	json,
	LoaderFunctionArgs,
	redirect
} from "@remix-run/node";
import {
	useActionData,
	useLoaderData,
} from "@remix-run/react";
import { Link } from "react-router-dom";
import {
	Form,
	Field,
	SubmitButton,
	FieldErrors,
	FieldErrorsStandard,
} from "~/frontend/form";
import { formStringData } from "~/util/httputil";
import {
	createUserSession
} from "~/util/session";
import { 
	configAuthSupportedAzureSSOB2C
} from "~/util/config";
import { MainContainer } from "~/frontend/container";
import {acceptInvite, AcceptInviteFieldsFromMap, validateInviteCode} from "~/backend.server/models/user/invite";

export const loader = async ({request}:LoaderFunctionArgs) => {
	const url = new URL(request.url);
	const inviteCode = url.searchParams.get("inviteCode") || "";
	const state = url.searchParams.get("state") || "";
	const queryStringCode = url.searchParams.get("code") || "";
	const res = await validateInviteCode(inviteCode);

	return json({
		inviteCode: inviteCode,
		inviteCodeValidation: res,
		code: queryStringCode,
		state: state,
	});
};

export const action = async ({ request }: ActionFunctionArgs) => {
	const data = formStringData(await request.formData());
	const inviteCode = data["inviteCode"] || "";
	const data2 = AcceptInviteFieldsFromMap(data) 
	const res = await acceptInvite(inviteCode, data2);
	if (!res.ok) {
		return json({ data, errors: res.errors });
	}
	const headers = await createUserSession(res.userId);
	return redirect("/", { headers });
};

export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();
	const inviteCode = loaderData.inviteCode;
	const actionData = useActionData<typeof action>();

	const errors = actionData?.errors
	const data = actionData?.data

	if (!loaderData.inviteCodeValidation.ok) {
		return (
			<>
			<p>{loaderData.inviteCodeValidation.error}</p>
			</>
		)
		
	}

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
				
				<Form className="dts-form dts-form--vertical" errors={errors}>
					<div className="dts-form__body">
						<p>* Required information</p>
						
							<input name="inviteCode" type="hidden" defaultValue={inviteCode}></input>
							<Field label="First name *" extraClassName="dts-form-component">
								<input type="text" name="firstName" defaultValue={data?.firstName}></input>
							</Field>
							<FieldErrorsStandard errors={errors} field="firstName"></FieldErrorsStandard>

							<Field label="Last name" extraClassName="dts-form-component">
								<input type="text" name="lastName" defaultValue={data?.lastName}></input>
							</Field>
							<FieldErrorsStandard errors={errors} field="lastName"></FieldErrorsStandard>

							<Field label="Password *" extraClassName="dts-form-component">
								<input type="password" name="password" defaultValue={data?.password}></input>
							</Field>
							<FieldErrorsStandard errors={errors} field="password"></FieldErrorsStandard>

							<Field label="Repeat password *" extraClassName="dts-form-component">
								<input type="password" name="passwordRepeat" defaultValue={data?.passwordRepeat}></input>
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
						<SubmitButton label="Set up account"></SubmitButton>
					</div>
				</Form>
			</div>
		</>
		
	);
}


