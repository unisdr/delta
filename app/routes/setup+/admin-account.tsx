import type {
	ActionFunctionArgs,
} from "@remix-run/node";
import {
	json,
	redirect
} from "@remix-run/node";
import {
	useActionData,
} from "@remix-run/react";

import { formStringData } from "~/util/httputil";
import { createUserSession } from "~/util/session";

import {
	Form,
	Field,
	FieldErrors,
	SubmitButton,
} from "~/frontend/form"

import {
	setupAdminAccount,
	setupAdminAccountFieldsFromMap,
} from "~/backend.server/models/user";

export const action = async ({ request }: ActionFunctionArgs) => {
	const data = formStringData(await request.formData());
	const data2 = setupAdminAccountFieldsFromMap(data) 
	const res = await setupAdminAccount(data2);
	if (!res.ok){
		return json({ data, errors: res.errors });
	}

	const headers = await createUserSession(res.userId);
	return redirect("/user/verify-email", { headers });
};

export const loader = async () => {
	return json(null);
};

export default function Screen() {
	const actionData = useActionData<typeof action>();

	const errors = actionData?.errors
	const data = actionData?.data

	return (
		<>
			<h2>Setup account</h2>
			<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.</p>
			<p>* Required information</p>
			<Form errors={errors}>
				<Field label="Email *">
					<input type="email" name="email" defaultValue={data?.email}></input>
					<FieldErrors errors={errors} field="email"></FieldErrors>
				</Field>
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
		</>
	);
}

