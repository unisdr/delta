import {
	json,
} from "@remix-run/node";
import {
	useLoaderData,
	useActionData,
	Link,
		redirect
} from "@remix-run/react";
import {
	Form,
	Field,
	Errors as FormErrors,
	SubmitButton,
	FieldErrors
} from "~/frontend/form";
import { formStringData } from "~/util/httputil";
import {
	authAction,
	authActionGetAuth,
	authLoader,
	authLoaderGetAuth,
} from "~/util/auth";
import {
	setTotpEnabled
} from "~/backend.server/models/user";
import {
	redirectWithMessage
} from "~/util/session";


interface Fields {
	code: string
}

export const action = authAction(async (actionArgs) => {
	const { request } = actionArgs;
	const { user } = authActionGetAuth(actionArgs);
	const formData = formStringData(await request.formData());

	const token = formData.code || "";

	const res = await setTotpEnabled(user.id, token, false);

	let errors: FormErrors<Fields> = {}
	if (!res.ok){
		errors.form = [res.error];
		return json({ok: false, errors: errors})
	}

	return redirectWithMessage(request, "/", {type:"info", text:"TOTP disabled"})
});

export const loader = authLoader(async (loaderArgs) => {
	const { user } = authLoaderGetAuth(loaderArgs)
	if (!user.totpEnabled){
		return redirect("/user/totp-enable")
	}
	return json({enabled: user.totpEnabled});
});

export default function Screen() {
	const ld = useLoaderData<typeof loader>();

	const ad = useActionData<typeof action>();
	const errors = ad?.errors || {};
	const data = {code: ""};

	if (!ld.enabled){
		return (
			<>
				<p>TOTP already disabled</p>
			</>
		)
	}

	return (
		<>
			<p>Disable TOTP</p>
			<Form errors={errors}>
				<Field label="Generated Code">
					<input
						type="text"
						name="code"
						defaultValue={data.code}
					/>
					<FieldErrors errors={errors} field="code"></FieldErrors>
				</Field>
				<SubmitButton label="Disable TOTP" />
			</Form>
			<Link to="/user/settings">Back to User Settings</Link>
		</>
	);
}

