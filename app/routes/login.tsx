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
	Errors as FormErrors,
	SubmitButton,
} from "~/components/form"
import { login } from "~/util/auth"
import { formStringData } from "~/util/httputil";
import { createUserSession } from "~/util/session";

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
	console.log("login attempt done", data.email, data.password, res)
	if (!res.ok){
		let errors: FormErrors<LoginFields> = {
			form: ["Email or password do not match"],
		}

		return json({ data, errors });
	}

	const headers = await createUserSession(res.userId);

	console.log("headers to set", headers)

	return redirect("/", { headers });
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
			<pre>/login</pre>
			<Form errors={errors}>
				<Field label="Email">
					<input type="email" name="email" defaultValue={data?.email}></input>
				</Field>
				<Field label="Password">
					<input type="password" name="password" defaultValue={data?.password}></input>
				</Field>
				<SubmitButton label="Login"></SubmitButton>
			</Form>
		</>
	);
}
