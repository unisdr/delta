import { MainContainer } from "~/frontend/container";
import {
  json,
  redirect,
  LoaderFunctionArgs,
  ActionFunctionArgs,
} from "@remix-run/node";
import { useActionData, useLoaderData } from "@remix-run/react";
import {
  Form,
  Field,
  SubmitButton,
  FieldErrors,
  FormMessage,
} from "~/frontend/form";

import { resetPassword } from "~/backend.server/models/user/password";

import { formStringData } from "~/util/httputil";
import PasswordInput from "~/components/PasswordInput";

function getData(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const email = url.searchParams.get("email") || "";
  return { token, email };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { token, email } = getData(request);
  if (!token || !email) {
    return json({ error: "Invalid password reset link" });
  }
  return json(null);
};

interface FormData {
  newPassword: string;
  confirmPassword: string;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { token, email } = getData(request);
  const formData = formStringData(await request.formData());
  const data: FormData = {
    newPassword: formData.newPassword || "",
    confirmPassword: formData.confirmPassword || "",
  };

  let res = await resetPassword(
    email,
    token,
    data.newPassword,
    data.confirmPassword
  );
  if (!res.ok) {
    return { ok: false, data, errors: res.errors };
  }
//   return json({ errors });
  return redirect("/user/login");
};

export default function Screen() {
  const loaderData = useLoaderData<typeof loader>();
  if (loaderData?.error) {
    return (
      <>
        <p>{loaderData.error}</p>
      </>
    );
  }

  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors;

  return (
    <MainContainer title="">
      <>
        <div className="dts-form dts-form--vertical">
          <h2>Reset your password</h2>
          <h3>
            Please enter current and new password in the input field below.
          </h3>
          <h4>* Required information</h4>
          <Form className="dts-form dts-form--vertical" errors={errors}>
            {false ? (
              <FormMessage>
                <p>Password reminder sent to xxxx</p>
              </FormMessage>
            ) : null}
            <input name="email" type="hidden" defaultValue="data.email"></input>
            <input name="token" type="hidden" defaultValue="data.token"></input>
            <div className="dts-form-component">
              <Field label="">
                <PasswordInput
                  placeholder="New password*"
                  name="newPassword"
                  errors={errors}
                  style={{ width: "100%" }}
                />
                <FieldErrors errors={errors} field="newPassword"></FieldErrors>
              </Field>
              <Field label="">
                <PasswordInput
                  placeholder="Confirm password*"
                  name="confirmPassword"
                  errors={errors}
                  style={{ width: "100%" }}
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
                  <li>Cannot be the same as the username</li>
                  <li>Should not be a simple or commonly used password</li>
                </ul>
              </div>

              <SubmitButton
                label="Reset password"
                style={{
                  paddingRight: "1rem",
                  width: "100%",
                }}
              ></SubmitButton>
            </div>
          </Form>
        </div>
      </>
    </MainContainer>
  );
}
