import {
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
} from "~/frontend/form"
import { formStringData } from "~/util/httputil";
import {
	loginTotp,
	authActionGetAuth,
	authLoaderGetAuth,
	authLoaderAllowNoTotp,
	authActionAllowNoTotp,
} from "~/util/auth";


interface LoginFields {
	email: string
	password: string
}

export const action = authActionAllowNoTotp(async (actionArgs) => {
	const { request } = actionArgs;
	const {user, sessionId} = authActionGetAuth(actionArgs);
	const formData = formStringData(await request.formData());
	const code = formData.code || "";
	const res = await loginTotp(user.id, sessionId, code);
	if (!res.ok){
		let errors: FormErrors<LoginFields> = {
			form: [res.error],
		}
		return { errors };
	}
	return redirect("/");
});

export const loader = authLoaderAllowNoTotp(async (loaderArgs) => {
	const { user, session } = authLoaderGetAuth(loaderArgs)
	if (!user.totpEnabled){
		return redirect("/");
	}
	if (session.totpAuthed){
		return redirect("/");
	}
	return null;
});


export default function Screen() {
	const actionData = useActionData<typeof action>();
	const errors = actionData?.errors
	return (
		<>
			<section>
				<div className="mg-container">
					<Form errors={errors}>
						<Field label="Generated Code">
							<input
								type="text"
								name="code"
							/>
						</Field>
						<SubmitButton className="mg-button mg-button-primary" label="Login with TOTP" />
					</Form>
				</div>
			</section>
		</>
	);
}
