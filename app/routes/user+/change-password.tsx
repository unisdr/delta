import { useActionData, Link } from "@remix-run/react";
import {
  Form,
  Field,
  Errors as FormErrors,
  SubmitButton,
  FieldErrors,
} from "~/frontend/form";
import { formStringData } from "~/util/httputil";
import { authAction, authActionGetAuth } from "~/util/auth";
import {
  ChangePasswordFields,
  changePassword,
} from "~/backend.server/models/user/password";
import { redirectWithMessage } from "~/util/session";
import { MainContainer } from "~/frontend/container";
import PasswordInput from "~/components/PasswordInput";

export const action = authAction(
  async (actionArgs): Promise<ActionResponse> => {
    const { request } = actionArgs;
    const { user } = authActionGetAuth(actionArgs);
    const formData = formStringData(await request.formData());

    const data: ChangePasswordFields = {
      currentPassword: formData.currentPassword || "",
      newPassword: formData.newPassword || "",
      confirmPassword: formData.confirmPassword || "",
    };

    const res = await changePassword(user.id, data);

    if (!res.ok) {
      return { ok: false, data, errors: res.errors };
    }

    return redirectWithMessage(request, "/user/settings", {
      type: "info",
      text: "Password changed.",
    });
  }
);

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
    <MainContainer title="Reset Password">
      <>
        <div className="dts-form dts-form--vertical">
          <Link to="/user/settings">Back to User Settings</Link>
          <h2>Reset your password</h2>
          <h3>
            Please enter current and new password in the input field below.
          </h3>
        </div>
        <Form className="dts-form dts-form--vertical" errors={errors}>
          <div className="dts-form-component">
            <Field label="">
              <label style={{ marginBottom: "5px", display: "block" }}>
                <span style={{ color: "red" }}>*</span> Required information
              </label>
              <PasswordInput
                placeholder="Current password*"
                name="currentPassword"
                defaultValue={data?.currentPassword}
                errors={errors}
              />
              <FieldErrors
                errors={errors}
                field="currentPassword"
              ></FieldErrors>
            </Field>
            <Field label="">
              <PasswordInput
                placeholder="New password*"
                name="newPassword"
                defaultValue={data?.newPassword}
                errors={errors}
              />
              <FieldErrors errors={errors} field="newPassword"></FieldErrors>
            </Field>
            <Field label="">
              <PasswordInput
                placeholder="Confirm password*"
                name="confirmPassword"
                defaultValue={data?.confirmPassword}
                errors={errors}
              />
              <FieldErrors
                errors={errors}
                field="confirmPassword"
              ></FieldErrors>
            </Field>
            <div>
              <ul>
                <li>At least 12 characters long</li>
                <li>Must include two of the following:</li>
                <ul>
                  <li>Uppercase letters</li>
                  <li>Lowercase letters</li>
                  <li>Numbers letters</li>
                  <li>Special characters</li>
                </ul>
                <li>Must be different from the default password</li>
                <li>Cannot be the same as the username</li>
                <li>Should not be a simple or commonly used password</li>
              </ul>
            </div>
            <SubmitButton
              className="mg-button mg-button-primary"
              label="Reset password"
              style={{
                paddingRight: "1rem",
                width: "100%",
              }}
            />
          </div>
        </Form>
      </>
    </MainContainer>
  );
}
