import {
	json,
	MetaFunction,
} from "@remix-run/node";

import {
	useLoaderData,
	useActionData,
	Link,
	Form
} from "@remix-run/react";
import {useState} from "react";

import {
	adminInviteUser,
	AdminInviteUserFields,
	adminInviteUserFieldsFromMap,
} from "~/backend.server/models/user";

import {
	Errors,
	Field,
	FormResponse,
	FieldErrors,
	SubmitButton
} from "~/frontend/form";
import {ValidRoles} from "~/frontend/user/roles";

import {
	authActionWithPerm,
	authLoaderWithPerm,
} from "~/util/auth";

import {formStringData} from "~/util/httputil";
import {redirectWithMessage} from "~/util/session";
import {NavSettings} from "~/routes/settings/nav";
import {MainContainer} from "~/frontend/container";

import { toast } from "react-toastify"; // Importing toast notification library
import "react-toastify/dist/ReactToastify.css"; // Toast styles

export const meta: MetaFunction = () => {
	return [
		{ title: "Adding New User - DTS" },
		{ name: "description", content: "Invite User." },
	];
};

export const loader = authLoaderWithPerm("InviteUsers", async () => {
	return {
		data: adminInviteUserFieldsFromMap({})
	}
})

type ActionResponse = FormResponse<AdminInviteUserFields>

type ErrorsType = {
	fields: Partial<Record<keyof AdminInviteUserFields, string[]>>;
	form?: string[];
};


export const action = authActionWithPerm("InviteUsers", async (actionArgs) => {
	const { request } = actionArgs;
	const formData = formStringData(await request.formData());
	const data = adminInviteUserFieldsFromMap(formData);
  
	const errors: ErrorsType = { fields: {} };
  
	// Validate required fields
	if (!data.firstName) {
	  errors.fields.firstName = ["First name is required"];
	}
	if (!data.email) {
	  errors.fields.email = ["Email is required"];
	}
	if (!data.organization) {
	  errors.fields.organization = ["Organization is required"];
	}
  
	if (Object.keys(errors.fields).length > 0) {
	  return json<ActionResponse>({
		ok: false,
		data: data,
		errors: errors,
	  });
	}
  
	try {
	  const res = await adminInviteUser(data);
  
	  if (!res.ok) {
		return json<ActionResponse>({
		  ok: false,
		  data: data,
		  errors: res.errors,
		});
	  }
  
	  // Redirect with flash message
	  return redirectWithMessage(request, "/settings/access-mgmnt/", {
		type: "info",
		text: "User has been successfully added!",
	  });
	} catch (error) {
	  console.error("An unexpected error occurred:", error);
  
	  return json<ActionResponse>({
		ok: false,
		data: data,
		errors: {
		  fields: {},
		},
	  });
	}
  });

  function isErrorResponse(actionData: any): actionData is { errors: ErrorsType } {
	return actionData?.errors !== undefined;
}

// Capitalizes the first letter of a string
function capitalizeFirstLetter(str: string) {
	if (!str) return str;
	return str.charAt(0).toUpperCase() + str.slice(1);
}
  
  export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
  
	let fields = loaderData?.data || {};
	const errors: ErrorsType = isErrorResponse(actionData) ? actionData.errors : { fields: {} };
  
	const [selectedRole, setSelectedRole] = useState(fields.role || "");
  
	const roleDesc = ValidRoles.find((role) => role.id === selectedRole)?.desc || "";
  
	return (
	  <MainContainer title="Access Management" headerExtra={<NavSettings />}>
		<h2 style={{ marginBottom: "20px" }}>Add User</h2>
		<Form method="post" >
		  {/* First Name, Last Name, and Email */}
		  <div
			style={{
			  display: "flex",
			  flexWrap: "wrap",
			  gap: "20px",
			  marginBottom: "20px",
			}}
		  >
			{/* First Name Field */}
			<div style={{ flex: "1 1 30%" }}>
			  <Field label="">
				<label style={{ marginBottom: "5px", display: "block" }}>
				  <span style={{ color: "red" }}>*</span> First Name
				</label>
				<input
				  type="text"
				  name="firstName"
				  defaultValue={fields.firstName}
				  placeholder="Enter first name"
				  style={{
					width: "100%",
					padding: "10px",
					borderRadius: "4px",
					border: errors.fields.firstName ? "1px solid red" : "1px solid #ccc",
					fontSize: "14px",
				  }}
				/>
				{errors.fields.firstName && (
				  <div
					style={{
					  color: "red",
					  fontSize: "12px",
					  marginTop: "5px",
					}}
				  >
					{errors.fields.firstName[0]}
				  </div>
				)}
			  </Field>
			</div>
  
			{/* Last Name Field */}
			<div style={{ flex: "1 1 30%" }}>
			  <Field label="">
				<label style={{marginBottom: "5px", display: "block" }}>
				  Last Name
				</label>
				<input
				  type="text"
				  name="lastName"
				  defaultValue={fields.lastName}
				  placeholder="Enter last name"
				  style={{
					width: "100%",
					padding: "10px",
					borderRadius: "4px",
					border: errors.fields.lastName ? "1px solid red" : "1px solid #ccc",
					fontSize: "14px",
				  }}
				/>
				{errors.fields.lastName && (
				  <div
					style={{
					  color: "red",
					  fontSize: "12px",
					  marginTop: "5px",
					}}
				  >
					{errors.fields.lastName[0]}
				  </div>
				)}
			  </Field>
			</div>
  
			{/* Email Field */}
			<div style={{ flex: "1 1 30%" }}>
			  <Field label="">
				<label style={{ marginBottom: "5px", display: "block" }}>
				  <span style={{ color: "red" }}>*</span> Email
				</label>
				<input
				  type="email"
				  name="email"
				  defaultValue={fields.email}
				  placeholder="Enter email"
				  style={{
					width: "100%",
					padding: "10px",
					borderRadius: "4px",
					border: errors.fields.email ? "1px solid red" : "1px solid #ccc",
					fontSize: "14px",
				  }}
				/>
				{errors.fields.email && (
				  <div
					style={{
					  color: "red",
					  fontSize: "12px",
					  marginTop: "5px",
					}}
				  >
					{errors.fields.email[0]}
				  </div>
				)}
			  </Field>
			</div>
		  </div>
  
		  {/* Organization Field */}
		  <div style={{ marginBottom: "20px" }}>
			<Field label="">
			  <label style={{ marginBottom: "5px", display: "block" }}>
				<span style={{ color: "red" }}>*</span> Organization
			  </label>
			  <input
				type="text"
				name="organization"
				defaultValue={fields.organization}
				placeholder="Enter organization"
				style={{
				  width: "100%",
				  padding: "10px",
				  borderRadius: "4px",
				  border: errors.fields.organization ? "1px solid red" : "1px solid #ccc",
				  fontSize: "14px",
				}}
			  />
			  {errors.fields.organization && (
				<div
				  style={{
					color: "red",
					fontSize: "12px",
					marginTop: "5px",
				  }}
				>
				  {errors.fields.organization[0]}
				</div>
			  )}
			</Field>
		  </div>
  
		  {/* Hydro-met CHE User Checkbox */}
		  <div style={{ marginBottom: "20px" }}>
			<Field label="">
			  <div style={{ display: "flex", alignItems: "center", height: "24px" }}>
				<input
				  type="checkbox"
				  name="hydrometCheUser"
				  defaultChecked={fields.hydrometCheUser}
				  aria-describedby="validationMsgId"
				  style={{ width: "24px", height: "24px", marginRight: "10px" }}
				/>
				<label style={{ margin: 0, lineHeight: "24px" }}>
				  Hydro-met CHE User
				</label>
			  </div>
			</Field>
		  </div>
  
		  {/* Role Dropdown */}
		  <div style={{ marginBottom: "20px" }}>
			<Field label="">
			  <label style={{ marginBottom: "5px", display: "block" }}>
				<span style={{ color: "red" }}>*</span> Role
			  </label>
			  <select
				name="role"
				value={selectedRole}
				onChange={(e) => setSelectedRole(e.target.value)}
				style={{
				  width: "100%",
				  padding: "10px",
				  borderRadius: "4px",
				  border: errors.fields.role ? "1px solid red" : "1px solid #ccc",
				  fontSize: "14px",
				}}
			  >
				<option value="" disabled>
				  Select a role
				</option>
				{ValidRoles.map((role) => (
				  <option key={role.id} value={role.id}>
					{role.label}
				  </option>
				))}
			  </select>
			  {errors.fields.role && (
				<div
				  style={{
					color: "red",
					fontSize: "12px",
					marginTop: "5px",
				  }}
				>
				  {errors.fields.role[0]}
				</div>
			  )}
			</Field>
			<div style={{ marginTop: "20px" }}>
			  <p>
				You have selected:{" "}
				<b>{selectedRole || "No role selected"}</b> as the user role.
			  </p>
			  {roleDesc && (
				<p>
				  {/*A <b>{selectedRole}</b> is able to <i>{roleDesc}</i>*/}
				  <b>{capitalizeFirstLetter(selectedRole)}</b> is able to <i>{capitalizeFirstLetter(roleDesc)}</i>
				</p>
			  )}
			</div>
		  </div>
  
		  {/* Action Buttons */}
		  <div
			style={{
			  display: "flex",
			  justifyContent: "flex-end",
			  gap: "20px",
			}}
		  >
			<Link
			  to="/settings/access-mgmnt"
			  className="mg-button mg-button-outline"
			  style={{
				padding: "10px 20px",
				borderRadius: "4px",
				fontSize: "14px",
			  }}
			>
			  Discard
			</Link>
			<SubmitButton
			  className="mg-button mg-button-primary"
			  label="Add User"
			/>
		  </div>
		</Form>
	  </MainContainer>
	);
  }