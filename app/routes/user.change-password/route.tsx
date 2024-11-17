import {
	json,
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
	FieldErrors
} from "~/components/form";
import { formStringData } from "~/util/httputil";
import {
	authAction,
	authActionGetAuth
} from "~/util/auth";
import {
	ChangePasswordFields,
	changePassword
} from "~/backend.server/models/user";
import {
	redirectWithMessage
} from "~/util/session";

export const action = authAction(async (actionArgs): Promise<ActionResponse> => {
	const { request } = actionArgs;
	const { user } = authActionGetAuth(actionArgs);
	const formData = formStringData(await request.formData());

	const data: ChangePasswordFields = {
		currentPassword: formData.currentPassword || "",
		newPassword: formData.newPassword || "",
		confirmPassword: formData.confirmPassword || "",
	};

	const res = await changePassword(user.id, data);

	if (!res.ok){
		return json({ok: false, data, errors: res.errors})
	}

	return redirectWithMessage(request, "/user/settings", {type:"info", text:"Password changed."})
});

interface ActionResponse {
	ok: boolean;
	data?: ChangePasswordFields;
	errors?: FormErrors<ChangePasswordFields>;
}

function changePasswordFieldsCreateEmpty(): ChangePasswordFields {
  return {
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  };
}

export default function Screen() {
	const actionData = useActionData<typeof action>();
	const errors = actionData?.errors || {};
	const data = actionData?.data || changePasswordFieldsCreateEmpty();

	return (
		<>
			<header className="dts-page-title">
				<div className="mg-container">
					<h1 className="dts-heading-1">Change Password</h1>
				</div>
			</header>
			<section>
				<div className="mg-container">
					<div>
						<Form errors={errors}>
							<Field label="Current Password">
								<input
									type="password"
									name="currentPassword"
									defaultValue={data.currentPassword}
								/>
								<FieldErrors errors={errors} field="currentPassword"></FieldErrors>
							</Field>
							<Field label="New Password">
								<input
									type="password"
									name="newPassword"
									defaultValue={data.newPassword}
								/>
								<FieldErrors errors={errors} field="newPassword"></FieldErrors>
							</Field>
							<Field label="Confirm New Password">
								<input
									type="password"
									name="confirmPassword"
									defaultValue={data.confirmPassword}
								/>
								<FieldErrors errors={errors} field="confirmPassword"></FieldErrors>
							</Field>
							<SubmitButton label="Change Password" />
						</Form>

					</div>
				</div>
			</section>
			<Link to="/user/settings">Back to User Settings</Link>
		</>
	);
}

