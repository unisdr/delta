import {
	json,
	redirect,
	LoaderFunctionArgs,
	ActionFunctionArgs
} from "@remix-run/node";
import {
	useActionData,
	useLoaderData
} from "@remix-run/react";
import {
	Form,
	Field,
	Errors as FormErrors,
	SubmitButton,
	FieldErrors,
	FormMessage
} from "~/components/form"

import {
	resetPassword,
} from "~/components/user/model"

import { formStringData } from "~/util/httputil";

function getData(request: Request){
	const url = new URL(request.url);
	const token = url.searchParams.get("token") || "";
	const email = url.searchParams.get("email") || "";
	return { token, email }
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const {token, email} = getData(request)
	if (!token || !email) {
		return json({error: "Invalid password reset link"})
	}
	return json(null);
};

interface FormData {
	password: string
}

export const action = async ({ request }: ActionFunctionArgs) => {
	const {token, email} = getData(request)
	const formData = formStringData(await request.formData());
	const data: FormData = {
		password: formData.password || "",
	}

	let errors: FormErrors<FormData> = {}
	let res = await resetPassword(email, token, data.password);
	if (!res.ok){
		errors.fields = {password: [res.error || "Server error"]}
	}
	return json({errors})
	
	
}

export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();
	if (loaderData?.error){
		return (
			<>
				<p>{loaderData.error}</p>
			</>
		)
	}

	const actionData = useActionData<typeof action>();
	const errors = actionData?.errors

	return (
		<>
			<Form errors={errors}>

			{false ? (
				<FormMessage>
				<p>Password reminder sent to xxxx</p>
				</FormMessage>
			) : null}

				<input name="email" type="hidden" defaultValue="data.email"></input>
				<input name="token" type="hidden" defaultValue="data.token"></input>

				<Field label="New Password">
					<input type="password" name="password"></input>
					<FieldErrors errors={errors} field="password"></FieldErrors>
				</Field>
				<SubmitButton label="Set Password"></SubmitButton>
			</Form>
		</>
	);
}
