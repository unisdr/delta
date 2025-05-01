import { dr } from "~/db.server";
import {
	eq,
	sql,
} from "drizzle-orm";

import {
	userTable
} from '~/drizzle/schema';

import {
	json,
	MetaFunction,
} from "@remix-run/node";

import {
	useLoaderData,
	useActionData,
	Link
} from "@remix-run/react";

import {
	Form,
	Field,
	SubmitButton,
	FieldErrors,
	FormResponse
} from "~/frontend/form";

import {
	ValidRoles
} from "~/frontend/user/roles";


import {
	authLoaderWithPerm,
	authActionWithPerm,
} from "~/util/auth";

import { formStringData } from "~/util/httputil";

import { MainContainer } from "~/frontend/container";

import { redirectWithMessage, sessionCookie } from "~/util/session";
import "react-toastify/dist/ReactToastify.css"; // Toast styles

import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { useNavigate } from "@remix-run/react";
import { adminUpdateUser, AdminUpdateUserFields, adminUpdateUserFieldsFromMap } from "~/backend.server/models/user/update_user";
import { format } from "date-fns";


export const meta: MetaFunction = () => {
	return [
		{ title: "Edit User - DTS" },
		{ name: "description", content: "Edit User." },
	];
};

export const loader = authLoaderWithPerm("EditUsers", async (loaderArgs) => {
	const { id } = loaderArgs.params;
	if (!id) {
		throw new Response("Missing item ID", { status: 400 });
	}

	//const res = await dr.select().from(userTable).where(eq(userTable.id, Number(id)));
	const res = await dr
		.select({
			id: userTable.id,
			email: userTable.email,
			firstName: userTable.firstName,
			lastName: userTable.lastName,
			role: userTable.role,
			organization: userTable.organization,
			emailVerified: userTable.emailVerified, // Include emailVerified
			// Dynamically calculate dateAdded and addedBy
			dateAdded: userTable.createdAt,
			addedBy: sql<string>`'System Admin'`.as("addedBy"), // Ensure type is string
		})
		.from(userTable)
		.where(eq(userTable.id, Number(id)));

	if (!res || res.length === 0) {
		throw new Response("Item not found", { status: 404 });
	}

	const item = res[0];

	return {
		data: {
			id: item.id,
			email: item.email,
			firstName: item.firstName,
			lastName: item.lastName,
			organization: item.organization,
			role: item.role,
			emailVerified: item.emailVerified, // Return emailVerified
			dateAdded: item.dateAdded || null, // Handle null or missing values
			addedBy: item.addedBy || "System Admin", // Fallback if value is missing
		},
	};
})

type ActionResponse = FormResponse<AdminUpdateUserFields>

export const action = authActionWithPerm("EditUsers", async (actionArgs) => {
	const { request, params } = actionArgs;
	const id = Number(params.id);

	// Check if ID is missing
	if (!id) {
		throw new Response("Missing ID", { status: 400 });
	}

	// Parse form data and map to fields
	const formData = formStringData(await request.formData());
	const updatedData = adminUpdateUserFieldsFromMap(formData);

	// Trim fields to prevent whitespace-only input from being considered valid
if (!updatedData.firstName || updatedData.firstName.trim() === "") {
	return json<ActionResponse>({
	  ok: false,
	  data: updatedData,
	  errors: {
		fields: { firstName: ["First name is required"] },
	  },
	});
  }
  
  if (!updatedData.email || updatedData.email.trim() === "") {
	return json<ActionResponse>({
	  ok: false,
	  data: updatedData,
	  errors: {
		fields: { email: ["Email is required"] },
	  },
	});
  }
  
  if (!updatedData.organization || updatedData.organization.trim() === "") {
	return json<ActionResponse>({
	  ok: false,
	  data: updatedData,
	  errors: {
		fields: { organization: ["Organisation is required"] },
	  },
	});
  }

	// Retrieve the existing user data for comparison
	const existingUser = await dr
		.select({
			email: userTable.email,
			firstName: userTable.firstName,
			lastName: userTable.lastName,
			organization: userTable.organization,
			role: userTable.role,
		})
		.from(userTable)
		.where(eq(userTable.id, id))
		.limit(1);

	if (!existingUser || existingUser.length === 0) {
		throw new Response("User not found", { status: 404 });
	}

	const currentUser = existingUser[0];

	// Dynamically compare existing user data with updated data
	const hasChanges = Object.keys(updatedData).some(
		key => (updatedData as Record<string, any>)[key] !== (currentUser as Record<string, any>)[key]
	);

	// If no changes detected, redirect with a "No changes made" message
	if (!hasChanges) {
		return redirectWithMessage(request, "/settings/access-mgmnt/", {
			type: "info",
			text: "No changes were made",
		});
	}

	// Perform the update
	const session = await sessionCookie().getSession(request.headers.get("Cookie"));
	const res = await adminUpdateUser(id, updatedData, session.get("userId"));

	// Handle errors
	if (!res.ok) {
		return json<ActionResponse>({
			ok: false,
			data: updatedData,
			errors: res.errors,
		});
	}

	// Redirect with a success message if changes were saved
	return redirectWithMessage(request, "/settings/access-mgmnt/", {
		type: "info",
		text: "Changes saved",
	});
});


export default function Screen() {
	let fields: AdminUpdateUserFields;
	const loaderData = useLoaderData<typeof loader>();
	const navigate = useNavigate(); // For programmatic navigation

	// Add derived fields like `activated` and use `id` as the Generated system identifier
	fields = {
		...loaderData.data,
		activated: loaderData.data.emailVerified === true, // Derive activated from emailVerified
		generatedSystemIdentifier: loaderData.data.id.toString(), // Use `id` as the dynamic value for generatedSystemIdentifier
	};

	let errors = {};

	const actionData = useActionData<typeof action>();
	if (actionData) {
		fields = {
			...fields,
			...actionData.data,
		};

		if (!actionData.ok) {
			errors = actionData.errors;
		}
	}

	const hasFields = (obj: any): obj is { fields: Record<string, string[]> } => {
		return obj && typeof obj === 'object' && 'fields' in obj;
	};

	type ErrorsType = {
		fields: Partial<Record<keyof AdminUpdateUserFields, string[]>>;
		form?: string[];
	};

	const safeErrors: ErrorsType = hasFields(errors) ? errors : { fields: {} };

	// Function to handle "Delete User"
	const handleDeleteUser = () => {
		Swal.fire({
			title: "Are you sure you want to delete this user?",
			text: "This data cannot be recovered after being deleted.",
			icon: "warning",
			showCancelButton: true,
			confirmButtonColor: "#d33", // Red for "Delete user"
			cancelButtonColor: "#3085d6", // Blue for "Do not delete"
			confirmButtonText: '<i class="fas fa-trash"></i> Delete user',
			cancelButtonText: "Do not delete",
		}).then(async (result) => {
			if (result.isConfirmed) {
				try {
					// Redirect to the delete route
					await fetch(`/settings/access-mgmnt/delete/${fields.generatedSystemIdentifier}`, {
						method: "GET",
					});
					Swal.fire({
						title: "Deleted!",
						text: "The user has been deleted.",
						icon: "success",
					}).then(() => {
						navigate("/settings/access-mgmnt/"); // Redirect to access management page
					});
				} catch (error) {
					Swal.fire("Error", "Something went wrong while deleting the user.", "error");
				}
			}
		});
	};


	return (
		<MainContainer title="Edit User">
			<div className="dts-form__header">
				<Link to="/settings/access-mgmnt/" className="mg-button mg-button--small mg-button-system">
					Back
				</Link>
			</div>
			<>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: "20px",
					}}
				>
					<div style={{ lineHeight: "1.5em" }}>
						<h2>
							{fields.firstName} {fields.lastName}
						</h2>
						<p style={{ marginBottom: "0.5em", display: "flex", alignItems: "center" }}>
							<span
								className={`status-dot ${fields.activated ? "activated" : "pending"}`}
								style={{
									height: "10px",
									width: "10px",
									borderRadius: "50%",
									backgroundColor: fields.activated ? "#007bff" : "#ccc",
									marginRight: "8px",
								}}
							></span>
							{fields.activated ? "Account activated" : "Account activation pending"}
						</p>
						<p style={{ marginBottom: "0.5em" }}>
							<strong>Date added:</strong>{" "}
							{fields.dateAdded ? format(new Date(fields.dateAdded), "dd-MM-yyyy") : "N/A"}
						</p>
						<p>
							<strong>Added by:</strong> {fields.addedBy || "System Admin"}
						</p>
					</div>
					<button
						className="mg-button mg-button-system mg-button-system--transparent"
						style={{ display: "flex", alignItems: "center" }}
						onClick={handleDeleteUser}
					>
						<img
							src="/assets/icons/trash-alt.svg"
							alt="Trash Icon"
							style={{ marginRight: "8px" }}
						/>
						Delete User
					</button>
				</div>

				{Array.isArray(safeErrors.form) && safeErrors.form.length > 0 && (
					<div className="dts-alert dts-alert--error mg-space-b">
						<div className="dts-alert__icon">
							<svg aria-hidden="true" focusable="false" role="img">
								<use href="/assets/icons/error.svg#error" />
							</svg>
						</div>
						<div>
							<p>{safeErrors.form[0]}</p>
						</div>
					</div>
				)}

				<Form errors={safeErrors}>
					{/* First Name, Last Name, and Email */}
					<div
						className="mg-grid mg-grid__col-3"
					>
						<div className="dts-form-component">
							<label aria-invalid={!!safeErrors.fields.firstName}>
								<div className="dts-form-component__label">
									<span style={{ color: "red" }}>*</span>First Name
								</div>
								<input
									type="text"
									name="firstName"
									defaultValue={fields.firstName}
									required
									autoComplete="given-name"
									className={safeErrors.fields.firstName ? "error" : ""}
									aria-describedby={safeErrors.fields.firstName ? "firstNameError" : undefined}
								/>
							</label>
							{safeErrors.fields.firstName && (
								<div className="dts-form-component__hint">
									<div
										className="dts-form-component__hint--error"
										id="firstNameError"
										aria-live="assertive"
									>
										{safeErrors.fields.firstName[0]}
									</div>
								</div>
							)}
						</div>
						<div className="dts-form-component">
							<label aria-invalid={!!safeErrors.fields.lastName}>
								<div className="dts-form-component__label">
									<span ></span>Last Name
								</div>
								<input
									type="text"
									name="lastName"
									defaultValue={fields.lastName}
									autoComplete="family-name"
									className={safeErrors.fields.lastName ? "error" : ""}
									aria-describedby={safeErrors.fields.lastName ? "lastNameError" : undefined}
								/>
							</label>
							{safeErrors.fields.lastName && (
								<div className="dts-form-component__hint">
									<div
										className="dts-form-component__hint--error"
										id="lastNameError"
										aria-live="assertive"
									>
										{safeErrors.fields.lastName[0]}
									</div>
								</div>
							)}
						</div>
						<div className="dts-form-component">
							<label aria-invalid={!!safeErrors.fields.email}>
								<div className="dts-form-component__label">
									<span style={{ color: "red" }}>*</span>Email
								</div>
								<input
									type="email"
									name="email"
									defaultValue={fields.email}
									required
									autoComplete="email"
									className={safeErrors.fields.email ? "error" : ""}
									aria-describedby={safeErrors.fields.email ? "emailError" : undefined}
								/>
							</label>
							{safeErrors.fields.email && (
								<div className="dts-form-component__hint">
									<div
										className="dts-form-component__hint--error"
										id="emailError"
										aria-live="assertive"
									>
										{safeErrors.fields.email[0]}
									</div>
								</div>
							)}
						</div>
					</div>
					<div className="mg-grid mg-grid__col-3">
						<div className="dts-form-component mg-grid__col--span-2">
							<label aria-invalid={!!safeErrors.fields.organization}>
								<div className="dts-form-component__label">
									<span style={{ color: "red" }}>*</span> Organisation
								</div>
								<input
									type="text"
									name="organization"
									defaultValue={fields.organization}
									required
									autoComplete="organization"
									className={safeErrors.fields.organization ? "error" : ""}
									aria-describedby={safeErrors.fields.organization ? "organizationError" : undefined}
								/>
							</label>
							{safeErrors.fields.organization && (
								<div className="dts-form-component__hint">
									<div
										className="dts-form-component__hint--error"
										id="organizationError"
										aria-live="assertive"
									>
										{safeErrors.fields.organization[0]}
									</div>
								</div>
							)}
						</div>
					</div>

					<div className="mg-grid mg-grid__col-3">
						{/* Role Field */}
						<div className="dts-form-component">
							<label aria-invalid={!!safeErrors.fields.role}>
								<div className="dts-form-component__label">
									<span style={{ color: "red" }}>*</span> Role
								</div>
								<select
									name="role"
									defaultValue={fields.role}
									className={safeErrors.fields.role ? "error" : ""}
									aria-describedby={safeErrors.fields.role ? "roleError" : undefined}
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
							</label>
							{safeErrors.fields.role && (
								<div className="dts-form-component__hint">
									<div
										className="dts-form-component__hint--error"
										id="roleError"
										aria-live="assertive"
									>
										{safeErrors.fields.role[0]}
									</div>
								</div>
							)}
						</div>

						{/* Generated System Identifier Field */}
						<div className="dts-form-component">
							<label>
								<div className="dts-form-component__label">
									<span>Generated system identifier</span>
								</div>
								<input
									type="text"
									name="generatedSystemIdentifier"
									value={fields.generatedSystemIdentifier}
									disabled
								/>
							</label>
						</div>
					</div>

					<div className="dts-form__actions">
						<div
							style={{
								display: "flex",
								justifyContent: "flex-end",
								gap: "20px",
							}}
						>
							<Link to="/settings/access-mgmnt/" className="mg-button mg-button-outline">
								Discard
							</Link>
							<SubmitButton className="mg-button mg-button-primary" label="Save Changes" />
						</div>
					</div>
				</Form>
			</>
		</MainContainer>
	);
}
