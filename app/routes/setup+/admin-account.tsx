import { useState } from "react";
import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";

import { formStringData } from "~/util/httputil";
import { createUserSession } from "~/util/session";

// Define the structure for the response to handle errors
interface ActionData {
  errors?: { [key: string]: string[] };
}

import {
  setupAdminAccount,
  setupAdminAccountFieldsFromMap,
} from "~/backend.server/models/user";

export const action = async ({ request }: ActionFunctionArgs) => {
	try {
  const data = formStringData(await request.formData());
  console.log('Form data received:', data); // Log received data

  const data2 = setupAdminAccountFieldsFromMap(data);
  const res = await setupAdminAccount(data2);
  if (!res.ok) {
	console.log('Errors in setupAdminAccount:', res.errors); // Log any errors
    return json({ data, errors: res.errors });
  }

  console.log('User ID for session:', res.userId); // Log user ID received
  const headers = await createUserSession(res.userId);
  console.log('Redirecting to verify-email'); // Log redirection
  return redirect("/user/verify-email", { headers });
}catch (error) {
    console.error('Error during form submission:', error); // Log unexpected errors
    return json({ error: 'Unexpected error occurred.' });
  }
};

export const loader = async () => {
  return json(null);
};

export const meta: MetaFunction = () => {
  return [
    { title: "Admin Account Setup - DTS" },
    { name: "description", content: "Admin setup." },
  ];
};

export default function Screen() {
  const [email, setEmail] = useState("");
  const [firstname, setFirstname] = useState("");
  const [secondname, setSecondname] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [passwordType, setPasswordType] = useState("password");
  const [passwordRepeatType, setPasswordRepeatType] = useState("password");

  const actionData = useActionData<ActionData>();

  const togglePasswordVisibility = () => {
    setPasswordType(passwordType === "password" ? "text" : "password");
  };

  const toggleConfirmPasswordVisibility = () => {
    setPasswordRepeatType(
      passwordRepeatType === "password" ? "text" : "password"
    );
  };

  const isButtonDisabled =
    !email || !firstname || !secondname || !password || !passwordRepeat;

  return (
    <div className="dts-page-container">
      <main className="dts-main-container">
        <div className="mg-container">
          <Form method="post" className="dts-form dts-form--vertical">
            <div className="dts-form__header">
              <a
                href="/setup/admin-account-welcome"
                className="mg-button mg-button--small mg-button-system"
              >
                Back
              </a>
              <span>Disaster Tracking System</span>
            </div>
            <div className="dts-form__intro">
              <h2 className="dts-heading-1">Set up account</h2>
              <p>Create your account by filling in the required details.</p>
            </div>
            <div className="dts-form__body">
              <p>*Required information</p>
              <div className="dts-form-component" style={{ marginBottom: "10px" }}>
                <label htmlFor="email"></label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Email address*"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="dts-form-component" style={{ marginBottom: "10px" }}>
                <label htmlFor="firstName"></label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  placeholder="First name*"
                  required
                  value={firstname}
                  onChange={(e) => setFirstname(e.target.value)}
                />
              </div>
              <div className="dts-form-component" style={{ marginBottom: "10px" }}>
                <label htmlFor="secondname"></label>
                <input
                  type="text"
                  id="secondname"
                  name="secondname"
                  placeholder="Last name"
                  value={secondname}
                  onChange={(e) => setSecondname(e.target.value)}
                />
              </div>
              <div className="dts-form-component" style={{ marginBottom: '10px' }}>
                <label htmlFor="password"></label>
                <div className="password-container" style={{ marginBottom: "1px", position: "relative" }}>
                  <input
                    type={passwordType}
                    id="password"
                    name="password"
                    placeholder="Enter password*"
                    minLength={12}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
						width: "100%",
						paddingRight: "40px",
					  }}
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    aria-label="Toggle password visibility"
                    className="password-toggle"
                    style={{
                      position: "absolute",
                      right: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <img
                      src={
                        passwordType === "password"
                          ? "/assets/icons/eye-show-password.svg"
                          : "/assets/icons/eye-hide-password.svg"
                      }
                      alt={
                        passwordType === "password"
                          ? "Show password"
                          : "Hide password"
                      }
                    />
                  </button>
                </div>
              </div>
              <div className="dts-form-component" style={{ marginBottom: "10px" }}>
                <label htmlFor="passwordRepeat"></label>
                <div className="password-container" style={{ marginBottom: "1px", position: "relative" }}>
                  <input
                    type={passwordRepeatType}
                    id="passwordRepeat"
                    name="passwordRepeat"
                    placeholder="Confirm password*"
                    minLength={12}
                    required
                    value={passwordRepeat}
                    onChange={(e) => setPasswordRepeat(e.target.value)}
					style={{
						width: "100%",
						paddingRight: "40px",
					  }}
                  />
                  <button
                    type="button"
                    onClick={toggleConfirmPasswordVisibility}
                    aria-label="Toggle confirm password visibility"
                    className="password-toggle"
					style={{
						position: "absolute",
						right: "10px",
						top: "50%",
						transform: "translateY(-50%)",
						background: "none",
						border: "none",
						cursor: "pointer",
					  }}
                  >
                    <img
                      src={
                        passwordRepeatType === "password"
                          ? "/assets/icons/eye-show-password.svg"
                          : "/assets/icons/eye-hide-password.svg"
                      }
                      alt={
                        passwordRepeatType === "password"
                          ? "Show password"
                          : "Hide password"
                      }
                    />
                  </button>
                </div>
              </div>
              {actionData?.errors && (
                <div className="error-messages">
                  Check your input: {JSON.stringify(actionData.errors)}
                </div>
              )}
            </div>

			  {/* Password Requirements */}
		  <div className="dts-form-component__hint" style={{fontSize: "14px" }}>
			<ul>
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
			  <li>Cannot be the same as the username</li>
			  <li>Should not be a simple or commonly used password</li>
			</ul>
		  </div>

            <div className="dts-form__actions">
              <button
                type="submit"
                className="mg-button mg-button-primary"
                disabled={isButtonDisabled}
              >
                Set up account
              </button>
            </div>
          </Form>
        </div>
      </main>
    </div>
  );
}
