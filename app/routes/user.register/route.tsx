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
import {
	Form,
	Field,
	FieldErrors,
	Errors as FormErrors,
	SubmitButton,
} from "~/components/form"

import { formStringData } from "~/util/httputil";
import { register } from "~/components/user/model";

export const action = async ({ request }: ActionFunctionArgs) => {
	const data = formStringData(await request.formData());
	const email = data.email || "";
	const password = data.password || "";

	const res = await register({email, password});
	if (!res.ok){
		return json({ data, errors: res.errors });
	}

	return redirect("/register");
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
			<pre>/register</pre>
			<Form errors={errors}>
				<Field label="Email">
					<input type="email" name="email" defaultValue={data?.email}></input>
					<FieldErrors errors={errors} field="email"></FieldErrors>
				</Field>
				<Field label="Password">
					<input type="password" name="password" defaultValue={data?.password}></input>
					<FieldErrors errors={errors} field="password"></FieldErrors>
				</Field>
				<SubmitButton label="Register"></SubmitButton>
			</Form>
		</>
	);
}
