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
} from "~/components/form"
import { formStringData } from "~/util/httputil";
import {
	createUserSession
} from "~/util/session";
import {
	acceptInvite,
	AcceptInviteFieldsFromMap,
	validateInviteCode,
} from "~/backend.server/models/user"
import { loginGetCode } from "~/util/ssoauzeb2c"

export const loader = async ({request}:LoaderFunctionArgs) => {
	const url = new URL(request.url);
	const inviteCode = url.searchParams.get("inviteCode") || "";
	const sso = url.searchParams.get("sso") || "";
	const res = await validateInviteCode(inviteCode);
	return json({
		inviteCode: inviteCode,
		sso: sso,
		inviteCodeValidation: res
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
	const inviteCode = loaderData.inviteCode
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
			<h2>Accept invite</h2>
			<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.</p>
			<p>* Required information</p>
			<Form errors={errors}>
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
			</Form>
			<p>&nbsp;</p>
			<div>
				loginGetCode
				<Link to={ `/user/accept-invite?inviteCode=${inviteCode}&sso=sso_azure_b2c` }>Complete the registration by logging-in using Azure B2C SSO</Link>
			</div>
		</>
	);
}


