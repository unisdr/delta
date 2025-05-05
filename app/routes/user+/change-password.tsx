import { useActionData, Link, MetaFunction } from "@remix-run/react";
import {
  Form,
  Field,
  Errors as FormErrors,
  SubmitButton,
  FieldErrorsStandard,
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
import { useState, useEffect, ChangeEvent } from "react";

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

export const meta: MetaFunction = () => {
  return [
    { title: "Reset Password - DTS" },
    { name: "description", content: "Changing password" },
  ];
};

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

  const [currentPassword, setCurrentPassword] = useState(data?.currentPassword || "");
  const [newPassword, setNewPassword] = useState(data?.newPassword || "");
  const [confirmPassword, setConfirmPassword] = useState(data?.confirmPassword || "");

  // Function to check if all form fields are valid
  const isFormValid = () => {
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSpecialChar = /[@$!%*?&_]/.test(newPassword);

    const hasTwoOfTheFollowing = [hasUppercase, hasLowercase, hasNumber, hasSpecialChar].filter(Boolean).length >= 2;

    return (
      currentPassword &&
      newPassword &&
      confirmPassword &&
      newPassword === confirmPassword &&
      hasTwoOfTheFollowing &&
      newPassword.length >= 12 &&
      newPassword !== currentPassword
    );
  };

  // Update button disabled state when form fields change
  useEffect(() => {
    const submitButton = document.querySelector("button[type='submit']") as HTMLButtonElement;
    if (submitButton) {
      submitButton.disabled = !isFormValid();
    }
  }, [currentPassword, newPassword, confirmPassword]);

  return (
    <MainContainer title="Reset Password">
      <div className="mg-container">
        <Form className="dts-form dts-form--vertical" errors={errors}>
          <div className="dts-form__header">
            <Link
              to="/user/settings"
              className="mg-button mg-button--small mg-button-system"
            >
              Back
            </Link>
          </div>
          
          <div className="dts-form__intro">
            <p>Please enter current and new password in the input field below.</p>
          </div>

          <div className="dts-form__body">
            <p>*Required information</p>
            <div className="dts-form-component">
              <label>
                <div className="dts-form-component__pwd">
                  <PasswordInput
                    placeholder="Current password*"
                    name="currentPassword"
                    defaultValue={data?.currentPassword}
                    errors={errors}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <FieldErrorsStandard errors={errors} field="currentPassword" />
              </label>
            </div>

            <div className="dts-form-component">
              <label>
                <div className="dts-form-component__pwd">
                  <PasswordInput
                    placeholder="New password*"
                    name="newPassword"
                    defaultValue={data?.newPassword}
                    errors={errors}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                  />
                </div>
                <FieldErrorsStandard errors={errors} field="newPassword" />
              </label>
            </div>

            <div className="dts-form-component">
              <label>
                <div className="dts-form-component__pwd">
                  <PasswordInput
                    placeholder="Confirm password*"
                    name="confirmPassword"
                    defaultValue={data?.confirmPassword}
                    errors={errors}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <FieldErrorsStandard errors={errors} field="confirmPassword" />
              </label>
            </div>
          </div>

          <div className="dts-form-component__hint">
            <ul id="passwordDescription">
              <li>At least 12 characters long</li>
              <li>
                Must include two of the following:
                <ul>
                  <li>Uppercase letters</li>
                  <li>Lowercase letters</li>
                  <li>Numbers</li>
                  <li>Special characters</li>
                </ul>
              </li>
              <li>Must be different from the default password</li>
              <li>Cannot be the same as the username</li>
              <li>Should not be a simple or commonly used password</li>
            </ul>
          </div>

          <div className="dts-form__actions">
            <SubmitButton
              className="mg-button mg-button-primary"
              label="Reset password"
            />
          </div>
        </Form>
      </div>
    </MainContainer>
  );
}
