import type {MetaFunction} from '@remix-run/node';

import {
	ActionFunctionArgs,
	LoaderFunctionArgs,
	redirect
} from "@remix-run/node";
import {
	useLoaderData,
	useActionData,
	Link,
} from "@remix-run/react";
import {
	Form,
	Field,
	Errors as FormErrors,
	SubmitButton,
} from "~/frontend/form"
import {formStringData} from "~/util/httputil";
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

export const action = async ({request}: ActionFunctionArgs) => {
	const formData = formStringData(await request.formData());
	const data: LoginFields = {
		email: formData.email || "",
		password: formData.password || "",
	}
	const res = await login(data.email, data.password);
	if (!res.ok) {
		let errors: FormErrors<LoginFields> = {
			form: ["Email or password do not match"],
		}
		return {data, errors};
	}
	

	const headers = await createUserSession(res.userId);

	const url = new URL(request.url);
	let redirectTo = url.searchParams.get("redirectTo");
	redirectTo = getSafeRedirectTo(redirectTo);
	return redirect(redirectTo, {headers});
};

export const loader = async ({request}: LoaderFunctionArgs) => {
	const user = await getUserFromSession(request)
	const url = new URL(request.url);
	let redirectTo = url.searchParams.get("redirectTo");
	redirectTo = getSafeRedirectTo(redirectTo);

	if (user) {
		return redirect(redirectTo);
	}
	return {redirectTo: redirectTo};
};

export function getSafeRedirectTo(redirectTo: string | null, defaultPath: string = "/"): string {
	if (redirectTo && redirectTo.startsWith("/")) {
		return redirectTo;
	}
	return defaultPath;
}

export const meta: MetaFunction = () => {
	return [
		{title: "Login - DTS"},
		{name: "description", content: "Login."},
	];
};

export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();

	const errors = actionData?.errors
	const data = actionData?.data

	return (
		<>


			
					<Form className="dts-form dts-form--vertical" errors={errors}>
						<input type="hidden" value={loaderData.redirectTo} />
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
							<SubmitButton className='mg-button mg-button-primary' label="Login"></SubmitButton>
						</div>

						<p>&nbsp;</p>
						<div>
							<Link className='mg-button mg-button-outline' to="/sso/azure-b2c/callback?action=login">Login using Azure B2C SSO</Link>
						</div>
					</Form>
		</>
	);
}
