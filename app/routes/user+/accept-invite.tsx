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
	const confAuthSupportedAzureSSOB2C:boolean = configAuthSupportedAzureSSOB2C();
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
		confAuthSupportedAzureSSOB2C: confAuthSupportedAzureSSOB2C,
	});
};

export const action = async ({ request }: ActionFunctionArgs) => {
	const data = formStringData(await request.formData());
	const inviteCode = data["inviteCode"] || "";
	const data2 = AcceptInviteFieldsFromMap(data) 
	const res = await acceptInvite(inviteCode, data2);
	if (!res.ok){
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
		<MainContainer title="Accept invite">
		<>
			<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.</p>
			<p>* Required information</p>
			<Form className="dts-form dts-form--vertical" errors={errors}>
				<div className="dts-form-component">
					<input name="inviteCode" type="hidden" defaultValue={inviteCode}></input>
					<Field label="First name *">
						<input type="text" name="firstName" defaultValue={data?.firstName}></input>
						<FieldErrors errors={errors} field="firstName"></FieldErrors>
					</Field>
					<Field label="Last name">
						<input type="text" name="lastName" defaultValue={data?.lastName}></input>
						<FieldErrors errors={errors} field="lastName"></FieldErrors>
					</Field>
					<Field label="Password *">
						<input type="password" name="password" defaultValue={data?.password}></input>
						<FieldErrors errors={errors} field="password"></FieldErrors>
					</Field>
					<Field label="Repeat password *">
						<input type="password" name="passwordRepeat" defaultValue={data?.passwordRepeat}></input>
						<FieldErrors errors={errors} field="passwordRepeat"></FieldErrors>
					</Field>
					<SubmitButton label="Setup account"></SubmitButton>
				</div>
			</Form>
			<p>&nbsp;</p>
			<div>
				{
					loaderData.confAuthSupportedAzureSSOB2C ? 
						<>
							<Link className="mg-button mg-button-outline" to={ `/sso/azure-b2c/invite?inviteCode=${inviteCode}&action=sso_azure_b2c-register` }>
								Complete the registration by logging-in using Azure B2C SSO</Link>
							&nbsp;
							<span>Note: Use the email address where you received the invitation email.</span>
						</>
					: ''
				}
			</div>
		</>
		</MainContainer>
	);
}


