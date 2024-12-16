import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData } from "@remix-run/react";

import { formStringData } from "~/util/httputil";
import { createUserSession } from "~/util/session";

import { Form, Field, FieldErrors, SubmitButton } from "~/frontend/form";

import {
  setupAdminAccount,
  setupAdminAccountFieldsFromMap,
} from "~/backend.server/models/user";

export const action = async ({ request }: ActionFunctionArgs) => {
  const data = formStringData(await request.formData());
  const data2 = setupAdminAccountFieldsFromMap(data);
  const res = await setupAdminAccount(data2);
  if (!res.ok) {
    return json({ data, errors: res.errors });
  }

  const headers = await createUserSession(res.userId);
  return redirect("/user/verify-email", { headers });
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
	const actionData = useActionData<typeof action>();
  
	const errors = actionData?.errors;
	const data = actionData?.data;
  
	return (
	  <>
		<Form className="dts-form dts-form--vertical">
		  <div className="dts-form__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
			<a
			  href="/setup/admin-account-welcome"
			  className="mg-button mg-button--small mg-button-system"
			>
			  Back
			</a>
			<span>Disaster tracking system</span>
		  </div>
		  <div className="dts-form__intro" style={{ marginBottom: "20px" }}>
			<h2 className="dts-heading-1" style={{ margin: "0 0 10px", fontSize: "24px", fontWeight: "bold" }}>Set up account</h2>
			<p style={{ margin: "0", fontSize: "14px", color: "#555" }}>Create your account by filling in the required details.</p>
		  </div>
		  <div className="dts-form__body">
			<p style={{ marginBottom: "15px", fontSize: "14px"}}>*Required information</p>
  
			{/* Email Address Field */}
			<div className="dts-form-component" style={{ marginBottom: "15px" }}>
			  <Field label="">
				<input
				  type="email"
				  name="email"
				  defaultValue={data?.email}
				  autoComplete="on"
				  placeholder="Email address*"
				  required
				  style={{
					width: "100%",
					padding: "10px",
					fontSize: "14px",
					borderRadius: "4px",
					border: "1px solid #ccc",
				  }}
				/>
				<FieldErrors errors={errors} field="email" />
			  </Field>
			</div>
  
			{/* First Name Field */}
			<div className="dts-form-component" style={{ marginBottom: "15px" }}>
			  <Field label="">
				<input
				  type="text"
				  name="firstName"
				  defaultValue={data?.firstName}
				  placeholder="First name*"
				  required
				  style={{
					width: "100%",
					padding: "10px",
					fontSize: "14px",
					borderRadius: "4px",
					border: "1px solid #ccc",
				  }}
				/>
				<FieldErrors errors={errors} field="firstName" />
			  </Field>
			</div>
  
			{/* Last Name Field */}
			<div className="dts-form-component" style={{ marginBottom: "15px" }}>
			  <Field label="">
				<input
				  type="text"
				  name="lastName"
				  defaultValue={data?.lastName}
				  placeholder="Last name"
				  style={{
					width: "100%",
					padding: "10px",
					fontSize: "14px",
					borderRadius: "4px",
					border: "1px solid #ccc",
				  }}
				/>
				<FieldErrors errors={errors} field="lastName" />
			  </Field>
			</div>
  
			{/* Password Field */}
			<div className="dts-form-component" style={{ marginBottom: "15px", position: "relative" }}>
			  <Field label="">
				<input
				  type="password"
				  name="password"
				  defaultValue={data?.password}
				  minLength={12}
				  placeholder="Enter password*"
				  required
				  style={{
					width: "100%",
					padding: "10px",
					fontSize: "14px",
					borderRadius: "4px",
					border: "1px solid #ccc",
					paddingRight: "40px",
				  }}
				  id="password"
				/>
				<button
				  type="button"
				  className="dts-form-component__pwd-toggle"
				  aria-label="Toggle password visibility"
				  style={{
					position: "absolute",
					right: "10px",
					top: "50%",
					transform: "translateY(-50%)",
					background: "none",
					border: "none",
					cursor: "pointer",
				  }}
				  onClick={() => {
					const input = document.getElementById("password");
					if (input !== null && input instanceof HTMLInputElement) {
					  if (input.type === "password") {
						input.type = "text";
						const nextSibling = input.nextSibling;
						if (nextSibling !== null && nextSibling instanceof Element) {
						  const img = nextSibling.querySelector("img");
						  if (img !== null) {
							img.src = "/assets/icons/eye-hide-password.svg";
						  }
						}
					  } else {
						input.type = "password";
						const nextSibling = input.nextSibling;
						if (nextSibling !== null && nextSibling instanceof Element) {
						  const img = nextSibling.querySelector("img");
						  if (img !== null) {
							img.src = "/assets/icons/eye-show-password.svg";
						  }
						}
					  }
					}
				  }}
				>
				  <img src="/assets/icons/eye-show-password.svg" alt="Toggle password visibility" style={{ width: "20px", height: "20px" }} />
				</button>
				<FieldErrors errors={errors} field="password" />
			  </Field>
			</div>
  
			{/* Confirm Password Field */}
			<div className="dts-form-component" style={{ marginBottom: "15px", position: "relative" }}>
			  <Field label="">
				<input
				  type="password"
				  name="passwordRepeat"
				  defaultValue={data?.passwordRepeat}
				  minLength={12}
				  placeholder="Confirm password*"
				  required
				  style={{
					width: "100%",
					padding: "10px",
					fontSize: "14px",
					borderRadius: "4px",
					border: "1px solid #ccc",
					paddingRight: "40px",
				  }}
				  id="passwordRepeat"
				/>
				<button
				  type="button"
				  className="dts-form-component__pwd-toggle"
				  aria-label="Toggle password visibility"
				  style={{
					position: "absolute",
					right: "10px",
					top: "50%",
					transform: "translateY(-50%)",
					background: "none",
					border: "none",
					cursor: "pointer",
				  }}
				  onClick={() => {
					const input = document.getElementById("passwordRepeat");
					if (input !== null && input instanceof HTMLInputElement) {
					  if (input.type === "password") {
						input.type = "text";
						const nextSibling = input.nextSibling;
						if (nextSibling !== null && nextSibling instanceof Element) {
						  const img = nextSibling.querySelector("img");
						  if (img !== null) {
							img.src = "/assets/icons/eye-hide-password.svg";
						  }
						}
					  } else {
						input.type = "password";
						const nextSibling = input.nextSibling;
						if (nextSibling !== null && nextSibling instanceof Element) {
						  const img = nextSibling.querySelector("img");
						  if (img !== null) {
							img.src = "/assets/icons/eye-show-password.svg";
						  }
						}
					  }
					}
				  }}
			
				>
				  <img src="/assets/icons/eye-hide-password.svg" alt="Toggle password visibility" style={{ width: "20px", height: "20px" }} />
				</button>
				<FieldErrors errors={errors} field="passwordRepeat" />
			  </Field>
			</div>
		  </div>
		  {/* Password Requirements */}
		  <div className="dts-form-component__hint" style={{fontSize: "14px", color: "#555" }}>
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
  
		  {/* Submit Button */}
		  <div className="dts-form__actions" style={{ marginTop: "20px", textAlign: "center" }}>
			<button
			  type="submit"
			  className="mg-button mg-button-primary"
			  style={{
				backgroundColor: "#007bff",
				color: "#fff",
				padding: "10px 20px",
				fontSize: "14px",
				borderRadius: "4px",
				border: "none",
				cursor: "pointer",
			  }}
			>
			  Set up account
			</button>
		  </div>
		</Form>
	  </>
	);
  }  