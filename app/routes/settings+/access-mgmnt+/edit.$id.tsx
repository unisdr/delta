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
	AdminUpdateUserFields,
	adminUpdateUser,
	adminUpdateUserFieldsFromMap,
} from "~/backend.server/models/user";

import {
	ValidRoles
} from "~/frontend/user/roles";


import {
	authLoaderWithPerm,
	authActionWithPerm,
} from "~/util/auth";

import { formStringData } from "~/util/httputil";

import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";

import { redirectWithMessage } from "~/util/session";
import { toast } from "react-toastify"; // Importing toast notification library
import "react-toastify/dist/ReactToastify.css"; // Toast styles

import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { useNavigate } from "@remix-run/react";


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
			dateAdded: userTable.inviteSentAt, // Use invite_sent_at as the dateAdded
			addedBy: sql<string>`'System Admin'`.as("addedBy"), // Ensure type is string
		})
		.from(userTable)
		.where(eq(userTable.id, Number(id)));

	if (!res || res.length === 0) {
		throw new Response("Item not found", { status: 404 });
	}

	const item = res[0];

	return json({
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
	});
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
	const res = await adminUpdateUser(id, updatedData);

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
		<MainContainer title="Access management" headerExtra={<NavSettings />}>
			<>
				<h2>Edit User</h2>
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
							{fields.dateAdded ? new Date(fields.dateAdded).toLocaleDateString() : "N/A"}
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
							src="/public/assets/icons/trash-alt.svg"
							alt="Trash Icon"
							style={{ marginRight: "8px" }}
						/>
						Delete User
					</button>
				</div>
				<Form errors={errors}>
					{/* First Name, Last Name, and Email */}
					<div
						style={{
							display: "flex",
							flexWrap: "wrap",
							gap: "20px",
							marginBottom: "20px",
						}}
					>
						<div style={{ flex: "1 1 30%" }}>
							<Field label="">
								<label style={{ marginBottom: "5px", display: "block" }}>
									<span style={{ color: "red" }}>*</span> First Name
								</label>
								<input
									type="text"
									name="firstName"
									defaultValue={fields.firstName}
									required
									style={{
										width: "100%",
										padding: "10px",
										borderRadius: "4px",
										fontSize: "14px",
									}}
								/>
								<FieldErrors errors={errors} field="firstName"></FieldErrors>
							</Field>
						</div>
						<div style={{ flex: "1 1 30%" }}>
							<Field label="">
								<label style={{ marginBottom: "5px", display: "block" }}>Last Name</label>
								<input
									type="text"
									name="lastName"
									defaultValue={fields.lastName}
									style={{
										width: "100%",
										padding: "10px",
										borderRadius: "4px",
										fontSize: "14px",
									}}
								/>
								<FieldErrors errors={errors} field="lastName"></FieldErrors>
							</Field>
						</div>
						<div style={{ flex: "1 1 30%" }}>
							<Field label="">
								<label style={{ marginBottom: "5px", display: "block" }}>
									<span style={{ color: "red" }}>*</span> Email
								</label>
								<input
									type="email"
									name="email"
									defaultValue={fields.email}
									required
									style={{
										width: "100%",
										padding: "10px",
										borderRadius: "4px",
										fontSize: "14px",
									}}
								/>
								<FieldErrors errors={errors} field="email"></FieldErrors>
							</Field>
						</div>
					</div>

					<div style={{ marginBottom: "20px" }}>
						<Field label="">
							<label style={{ marginBottom: "5px", display: "block" }}>
								<span style={{ color: "red" }}>*</span> Organization
							</label>
							<input
								type="text"
								name="organization"
								defaultValue={fields.organization}
								required
								style={{
									width: "100%",
									padding: "10px",
									borderRadius: "4px",
									fontSize: "14px",
								}}
							/>
							<FieldErrors errors={errors} field="organization"></FieldErrors>
						</Field>
					</div>

					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							marginBottom: "20px",
						}}
					>
						{/* Role Field */}
						<div style={{ flex: "1", marginRight: "10px" }}>
							<Field label="">
								<label style={{ marginBottom: "5px", display: "block" }}>
									<span style={{ color: "red" }}>*</span> Role
								</label>
								<select
									name="role"
									defaultValue={fields.role}
									style={{
										width: "100%",
										padding: "10px",
										borderRadius: "4px",
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
								<FieldErrors errors={errors} field="role"></FieldErrors>
							</Field>
						</div>

						{/* Generated System Identifier Field */}
						<div style={{ flex: "1", marginLeft: "10px" }}>
							<Field label="">
								<label style={{ marginBottom: "5px", display: "block" }}>
									Generated system identifier
								</label>
								<input
									type="text"
									name="generatedSystemIdentifier"
									value={fields.generatedSystemIdentifier}
									disabled
									style={{
										width: "100%",
										padding: "10px",
										borderRadius: "4px",
										fontSize: "14px",
									}}
								/>
							</Field>
						</div>
					</div>

					<div
						style={{
							display: "flex",
							justifyContent: "flex-end",
							gap: "20px",
							marginTop: "20px",
						}}
					>
						<Link to="/settings/access-mgmnt/" className="mg-button mg-button-outline">
							Discard
						</Link>
						<SubmitButton className="mg-button mg-button-primary" label="Save Changes" />
					</div>
				</Form>
			</>
		</MainContainer>
	);
}
