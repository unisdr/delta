import {
	json
} from "@remix-run/node";

import {
	authLoader,
	authLoaderGetAuth,
	authAction,
	authActionGetAuth,
	authLoaderAllowUnverifiedEmail,
	authActionAllowUnverifiedEmail
} from "~/util/auth";

import {
		useLoaderData,
		useActionData,
		Link
} from "@remix-run/react";

import {
	verifyEmail
} from "~/backend.server/models/user";

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

import { formatTimestamp } from "~/util/time";

export const action = authActionAllowUnverifiedEmail(async (actionArgs) => {
	const { request } = actionArgs;
	const { user } = authActionGetAuth(actionArgs);
	const data = formStringData(await request.formData());
	const code = data.code || "";
	const userId = user.id
	const res = await verifyEmail(userId, code);
	if (!res.ok){
		return json({ data, errors: res.errors });
	}
	return redirect("/");
});

export const loader = authLoaderAllowUnverifiedEmail(async (loaderArgs) => {
	const { user } = authLoaderGetAuth(loaderArgs)
	return json({
		userEmail: user.email,
		// passing this as date does not work in remix, the type of data received is string on the other end
		// set it explicitly to string here so the type matches
		sentAt: user.emailVerificationSentAt
	});
});


export default function Data() {
	const pageData = useLoaderData<typeof loader>();

	const actionData = useActionData<typeof action>();
	const errors = actionData?.errors
	const data = actionData?.data

 return (
		<div>
			<h2>Please verify your account</h2>

	{pageData.sentAt ? (
 	<p>A one-time password has been sent to your email on {formatTimestamp(pageData.sentAt)}.</p>
) : null}

			<p>Enter the code we sent to you at {pageData.userEmail}.</p>

			<Form errors={errors}>
				<Field label="Code">
					<input type="text" name="code" defaultValue={data?.code}></input>
					<FieldErrors errors={errors} field="code"></FieldErrors>
				</Field>
				<p>Code expires in 5:00 (TODO: remove this)</p>
				<p>
					<Link to="/user/verify-email-send-again">Send again</Link>
				</p>
				<SubmitButton label="Complete account setup"></SubmitButton>
			</Form>

		</div>
	);
}

