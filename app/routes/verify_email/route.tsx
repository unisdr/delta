import {
	json
} from "@remix-run/node";

import {
	authLoader,
	authLoaderGetAuth,
	authAction,
	authActionGetAuth
} from "~/util/auth";

import {
		useLoaderData,
		useActionData
} from "@remix-run/react";

import {
	verifyEmail
} from "~/components/user/model";

import { formStringData } from "~/util/httputil";

import {
	redirect
} from "@remix-run/node";

import {
	Form,
	Field,
	FieldErrors,
	SubmitButton,
} from "~/components/form"

export const action = authAction(async (actionArgs) => {
	const { request } = actionArgs;
	const user = authActionGetAuth(actionArgs);
	const data = formStringData(await request.formData());
	const code = data.code || "";
	const userId = user.id
	const res = await verifyEmail(userId, code);
	if (!res.ok){
		return json({ data, errors: res.errors });
	}
	return redirect("/");
});

export const loader = authLoader(async (loaderArgs) => {
	const user = authLoaderGetAuth(loaderArgs)
	return json({ userEmail: user.email });
});

interface PageData {
	userEmail: string
}

export default function Data() {
	const loaderData = useLoaderData<typeof loader>();
	let pageData: PageData = {
		userEmail: ""
	}
	if (loaderData){
		pageData = loaderData
	}

	const actionData = useActionData<typeof action>();
	const errors = actionData?.errors
	const data = actionData?.data

 return (
		<div>
			<h2>Please verify your account</h2>
			<p>A one time password has been sent to your email.</p>

			<p>Enter the code we sent to you at {pageData.userEmail}</p>

			<Form errors={errors}>
				<Field label="Code">
					<input type="text" name="code" defaultValue={data?.code}></input>
					<FieldErrors errors={errors} field="code"></FieldErrors>
				</Field>
				<p>Code expires in 5:00 (TODO: remove this)</p>
				<p>
					<a href="#">Send again</a>
				</p>
				<SubmitButton label="Complete account setup"></SubmitButton>
			</Form>

		</div>
	);
}

