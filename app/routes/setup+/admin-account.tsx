import { useState, useEffect } from "react";
import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";

import { formStringData } from "~/util/httputil";
import { createUserSession } from "~/util/session";

interface ActionData {
  errors?: {
    form?: string[];
    fields?: {
      [key: string]: string[];
    };
  };
}

import {
  setupAdminAccount,
  setupAdminAccountFieldsFromMap,
} from "~/backend.server/models/user";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export const meta: MetaFunction = () => {
  return [
    { title: "Account Setup - DTS" },
    { name: "description", content: "Admin setup." },
  ];
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const data = formStringData(await request.formData());
    const data2 = setupAdminAccountFieldsFromMap(data);
    const res = await setupAdminAccount(data2);
    if (!res.ok) {
      //console.log('Errors in setupAdminAccount:', res.errors);
      return ({ data, errors: res.errors });
    }
    const headers = await createUserSession(res.userId);
    //console.log('Redirecting to verify-email');
    return redirect("/user/verify-email", { headers });
  } catch (error) {
    console.error('Error during form submission:', error);
    return ({ error: 'Unexpected error occurred.' });
  }
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

  // Function to check if all form fields are valid
  const isFormValid = () => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);

    const hasTwoOfTheFollowing = [hasUppercase, hasLowercase, hasNumber, hasSpecialChar].filter(Boolean).length >= 2;

    return (
      emailRegex.test(email) &&
      firstname &&
      password &&
      passwordRepeat &&
      password === passwordRepeat &&
      hasTwoOfTheFollowing &&
      password.length >= 12 &&
      password !== email
    );
  };

  useEffect(() => {
    const submitButton = document.querySelector("button[type='submit']") as HTMLButtonElement;
    if (submitButton) {
      submitButton.disabled = !isFormValid(); // Initially disable submit if form is not valid
    }
  }, [email, firstname, secondname, password, passwordRepeat]); // Re-run when these dependencies change

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setter(event.target.value);
  };

  const togglePasswordVisibility = () => {
    setPasswordType(passwordType === "password" ? "text" : "password");
  };

  const toggleConfirmPasswordVisibility = () => {
    setPasswordRepeatType(passwordRepeatType === "password" ? "text" : "password");
  };

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
                  style={{
                    border: actionData?.errors?.fields?.email ? "1px solid red" : "",
                  }}
                />
                {actionData?.errors?.fields?.email && (
                  <div
                    style={{
                      color: "red",
                      fontSize: "12px",
                      marginTop: "0px",
                      marginBottom: "0px",
                    }}
                  >
                    {(actionData.errors.fields as any).email?.[0]}
                  </div>
                )}
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
                    {passwordType === "password" ?
                      <FaEyeSlash style={{ fontSize: '1rem', position: 'absolute', right: '0.1rem', transform: 'translateY(-39%)', top: '50%', cursor: 'pointer', }} /> :
                      <FaEye style={{ fontSize: '1rem', position: 'absolute', right: '0.1rem', transform: 'translateY(-39%)', top: '50%', cursor: 'pointer', }} />}
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
                    {passwordRepeatType === "password" ?
                      <FaEyeSlash style={{ fontSize: '1rem', position: 'absolute', right: '0.1rem', transform: 'translateY(-39%)', top: '50%', cursor: 'pointer', }} /> :
                      <FaEye style={{ fontSize: '1rem', position: 'absolute', right: '0.1rem', transform: 'translateY(-39%)', top: '50%', cursor: 'pointer', }} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="dts-form-component__hint" style={{ fontSize: "14px" }}>
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
              //disabled={!isFormValid()}
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
