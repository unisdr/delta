import {
	json,
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
	FieldErrors
} from "~/components/form";
import { formStringData } from "~/util/httputil";
import {
	authAction,
	authActionGetAuth,
	authLoader,
	authLoaderGetAuth,
} from "~/util/auth";
import {
	setTotpEnabled,
	generateTotpIfNotSet
} from "~/.server/models/user";
import {
	redirectWithMessage,
} from "~/util/session";

export const action = authAction(async (actionArgs) => {
	const { request } = actionArgs;
	const { user } = authActionGetAuth(actionArgs);
	const formData = formStringData(await request.formData());

	const token = formData.code || "";

	const res = await setTotpEnabled(user.id, token, true);

	let errors: FormErrors<{}> = {}
	if (!res.ok){
		errors.form = [res.error];
		return json({ok: false, errors: errors})
	}

	return redirectWithMessage(request, "/user/settings", {type:"info", text:"TOTP enabled"})
});

export const loader = authLoader(async (loaderArgs) => {
	const { user } = authLoaderGetAuth(loaderArgs)
	const res = await generateTotpIfNotSet(user.id)
	console.log("totp res", res)
	return json(res);
});

export default function Screen() {
	const ld = useLoaderData<typeof loader>();

	const ad = useActionData<typeof action>();
	const errors = ad?.errors || {};
	const data = {code: ""};

	if (!ld.ok){
		return (
			<>
				<p>TOTP already enabled</p>
			</>
		)
	}

	const qrCodeUrl = `/api/qrcode?text=` + encodeURIComponent(ld.secretUrl);

	return (
		<>
			<p>Enable TOTP</p>
			<p>{ld.secret}</p>
			<p>{ld.secretUrl}</p>
			<img src={qrCodeUrl} alt="QR Code" />
			<Form errors={errors}>
				<Field label="Generated Code">
					<input
						type="text"
						name="code"
						defaultValue={data.code}
					/>
					<FieldErrors errors={errors} field="code"></FieldErrors>
				</Field>
				<SubmitButton label="Enable TOTP" />
			</Form>
			<Link to="/user/settings">Back to User Settings</Link>
		</>
	);
}

