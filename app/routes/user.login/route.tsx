import type { MetaFunction } from '@remix-run/node';

import {
	ActionFunctionArgs,
	json,
	LoaderFunctionArgs,
	redirect
} from "@remix-run/node";
import {
	useActionData,
	Link,
} from "@remix-run/react";
import {
	Form,
	Field,
	Errors as FormErrors,
	SubmitButton,
} from "~/components/form"
import { formStringData } from "~/util/httputil";
import {
	getUserFromSession,
	createUserSession
} from "~/util/session";
import {
	login,
} from "~/backend.server/models/user"


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
	if (!res.ok){
		let errors: FormErrors<LoginFields> = {
			form: ["Email or password do not match"],
		}
		return json({ data, errors });
	}

	const headers = await createUserSession(res.userId);
	return redirect("/", { headers });
};

export const loader = async ({request}:LoaderFunctionArgs) => {
	const user = await getUserFromSession(request)
	if (user){
		return redirect("/");
	}
	return json(null);
};

export const meta: MetaFunction = () => {
	return [
		{ title: "Login - DTS" },
		{ name: "description", content: "Login." },
	];
};

export default function Screen() {
	const actionData = useActionData<typeof action>();

	const errors = actionData?.errors
	const data = actionData?.data

	return (
		<>
			<Form errors={errors}>
				<div className="dts-form-component">
					<Field label="Email">
						<span className="mg-u-sr-only">Email address*</span>
						<input type="email" autoComplete="off" name="email" placeholder="Enter email address*" defaultValue={data?.email} required></input>
					</Field>
				</div>
				<div className="dts-form-component">
					<Field label="Password">
						<span className="mg-u-sr-only">Password*</span>
						<input type="password" autoComplete="off" name="password" placeholder="Enter password*" defaultValue={data?.password} required></input>
					</Field>
				</div>
				
				<Link to="/user/forgot-password">Forgot password</Link>
				<div className="dts-dialog__form-actions">
					<SubmitButton label="Login"></SubmitButton>	
				</div>
				
			</Form>
			<p>&nbsp;</p>
			<div>
			<Link to="/sso/azure-b2c/callback?action=login">Login using Azure B2C SSO</Link>
			</div>
		</>
	);
}
