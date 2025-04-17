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
import { useState } from "react";

import {
	Field,
	FormResponse,
	SubmitButton
} from "~/frontend/form";
import { ValidRoles } from "~/frontend/user/roles";

import {
	authActionWithPerm,
	authLoaderWithPerm,
} from "~/util/auth";

import { formStringData } from "~/util/httputil";
import { redirectWithMessage } from "~/util/session";

import { MainContainer } from "~/frontend/container";

import "react-toastify/dist/ReactToastify.css"; // Toast styles
import { adminInviteUser, AdminInviteUserFields, adminInviteUserFieldsFromMap } from "~/backend.server/models/user/invite";

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
		<MainContainer title="Add User">
			<div className="dts-form__header">
				<Link to="/settings/access-mgmnt/" className="mg-button mg-button--small mg-button-system">
					Back
				</Link>
			</div>
			<Form method="post" >
				<div className="mg-grid mg-grid__col-3">
					{/* First Name */}
					<div className="dts-form-component">
						<label>
							<div className="dts-form-component__label">
								<span style={{ color: "red" }}>
									<abbr title="mandatory">*</abbr>
								</span>First name
							</div>
							<input
								type="text"
								name="firstName"
								placeholder="Enter first name"
								defaultValue={fields.firstName}
								required
								autoComplete="given-name"
								className={errors.fields.firstName ? "error" : ""}
							/>
							{errors.fields.firstName && (
								<div style={{ color: "red", fontSize: "12px" }}>{errors.fields.firstName[0]}</div>
							)}
						</label>
					</div>

					{/* Last Name */}
					<div className="dts-form-component">
						<label>
							<div className="dts-form-component__label">
								<span>Last name</span>
							</div>
							<input
								type="text"
								name="lastName"
								placeholder="Enter last name"
								defaultValue={fields.lastName}
								autoComplete="family-name"
								className={errors.fields.lastName ? "error" : ""}
							/>
							{errors.fields.lastName && (
								<div style={{ color: "red", fontSize: "12px" }}>{errors.fields.lastName[0]}</div>
							)}
						</label>
					</div>

					{/* Email */}
					<div className="dts-form-component">
						<label>
							<div className="dts-form-component__label">
								<span style={{ color: "red" }}>
									<abbr title="mandatory">*</abbr>
								</span>Email
							</div>
							<input
								type="email"
								name="email"
								placeholder="Enter Email"
								defaultValue={fields.email}
								required
								autoComplete="email"
								className={errors.fields.email ? "error" : ""}
							/>
							{errors.fields.email && (
								<div style={{ color: "red", fontSize: "12px" }}>{errors.fields.email[0]}</div>
							)}
						</label>
					</div>

					{/* Organization */}
					<div className="dts-form-component mg-grid__col--span-2">
						<label>
							<div className="dts-form-component__label">
								<span style={{ color: "red" }}>
									<abbr title="mandatory">*</abbr>
								</span>Organisation
							</div>
							<input
								type="text"
								name="organization"
								placeholder="Enter organisation"
								defaultValue={fields.organization}
								required
								autoComplete="organization"
								className={errors.fields.organization ? "error" : ""}
							/>
							{errors.fields.organization && (
								<div style={{ color: "red", fontSize: "12px" }}>{errors.fields.organization[0]}</div>
							)}
						</label>
					</div>
				</div>

				<div className="mg-grid mg-grid__col-3">
					{/* Role Dropdown */}
					<div className="dts-form-component">
						<label>
							<div className="dts-form-component__label">
								<span style={{ color: "red" }}>
									<abbr title="mandatory">*</abbr>
								</span>Role
							</div>
							<select
								name="role"
								value={selectedRole}
								onChange={(e) => setSelectedRole(e.target.value)}
								required
								autoComplete="off"
								className={errors.fields.role ? "error" : ""}
							>
								<option value="">select role</option>
								{ValidRoles.map((role) => (
									<option key={role.id} value={role.id}>
										{role.label}
									</option>
								))}
							</select>
							{errors.fields.role && (
								<div style={{ color: "red", fontSize: "12px" }}>{errors.fields.role[0]}</div>
							)}
						</label>
					</div>
				</div>

				{/* Role Summary */}
				<div className="dts-form__additional-content mg-grid__col--span-2">
					<div className="dts-heading-5">
						You have selected {selectedRole || "[Role]"}
					</div>
					{roleDesc && (
						<div>
							A <b>{capitalizeFirstLetter(selectedRole)}</b> is able to <i>{capitalizeFirstLetter(roleDesc)}</i>
						</div>
					)}
				</div>



				{/* Action Buttons */}
				<div className="dts-form__actions dts-form__actions--standalone">
					<SubmitButton
						className="mg-button mg-button-primary"
						label="Add User"
					/>
					<Link
						to="/settings/access-mgmnt"
						className="mg-button mg-button-outline"
					>
						Discard
					</Link>

				</div>

			</Form>
		</MainContainer>
	);
}
