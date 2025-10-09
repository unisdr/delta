import { json, MetaFunction } from "@remix-run/node";
import {
	useLoaderData,
	useActionData,
	Link,
	useNavigate,
	useFetcher,
} from "@remix-run/react";
import { Form, SubmitButton, FormResponse } from "~/frontend/form";
import { getCountryRoles } from "~/frontend/user/roles";
import { authLoaderWithPerm, authActionWithPerm } from "~/util/auth";
import { formStringData } from "~/util/httputil";
import { MainContainer } from "~/frontend/container";
import {
	redirectWithMessage,
	sessionCookie,
	getUserFromSession,
	getCountryAccountsIdFromSession,
} from "~/util/session";
import {
	adminUpdateUser,
	AdminUpdateUserFields,
	adminUpdateUserFieldsFromMap,
} from "~/backend.server/models/user/update_user";
import { format } from "date-fns";
import { ConfirmDialog } from "~/frontend/components/ConfirmDialog";
import { notifyError } from "~/frontend/utils/notifications";
import { useEffect, useRef } from "react";
import { getUserCountryAccountsByUserIdAndCountryAccountsId } from "~/db/queries/userCountryAccounts";

export const meta: MetaFunction = () => {
	return [
		{ title: "Edit User - DELTA Resilience" },
		{ name: "description", content: "Edit User." },
	];
};

export const loader = authLoaderWithPerm("EditUsers", async (loaderArgs) => {
	const { request, params } = loaderArgs;
	const { id } = params;
	if (!id) {
		throw new Response("Missing item ID", { status: 400 });
	}

	// Get user session and tenant context
	const userSession = await getUserFromSession(request);
	if (!userSession) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	const item = await getUserCountryAccountsByUserIdAndCountryAccountsId(
		id,
		countryAccountsId
	);

	if (!item) {
		throw new Response(
			"User not found or you don't have permission to edit this user",
			{ status: 404 }
		);
	}

	return {
		data: {
			id: item.user.id,
			email: item.user.email,
			firstName: item.user.firstName,
			lastName: item.user.lastName,
			organization: item.user.organization,
			role: item.user_country_accounts.role,
			emailVerified: item.user.emailVerified,
			dateAdded: item.user.createdAt || null,
			addedBy: "System Admin",
		},
	};
});

type ActionResponse = FormResponse<AdminUpdateUserFields>;

export const action = authActionWithPerm("EditUsers", async (actionArgs) => {
	const { request, params } = actionArgs;
	const id = params.id;

	if (!id) {
		throw new Response("Missing ID", { status: 400 });
	}

	const session = await sessionCookie().getSession(
		request.headers.get("Cookie")
	);
	const countryAccountsId = session.get("countryAccountsId");

	if (!countryAccountsId) {
		throw new Response("Unauthorized - No tenant context", { status: 401 });
	}

	const userCountryAccounts =
		await getUserCountryAccountsByUserIdAndCountryAccountsId(
			id,
			countryAccountsId
		);
	if (!userCountryAccounts) {
		throw new Response("Unauthorized Access", { status: 401 });
	}

	const userToEdit = userCountryAccounts.user;

	if (!userToEdit) {
		throw new Response("User not found", { status: 404 });
	}

	const formData = formStringData(await request.formData());
	console.log("formData", formData);

	const updatedData = adminUpdateUserFieldsFromMap(formData);
	console.log("updatedData", updatedData);

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

	const res = await adminUpdateUser(
		id,
		updatedData,
		session.get("userId"),
		countryAccountsId
	);

	if (!res.ok) {
		return json<ActionResponse>({
			ok: false,
			data: updatedData,
			errors: res.errors,
		});
	}

	return redirectWithMessage(request, "/settings/access-mgmnt/", {
		type: "info",
		text: "Changes saved",
	});
});

export default function Screen() {
	let fields: AdminUpdateUserFields;
	const loaderData = useLoaderData<typeof loader>();
	const navigate = useNavigate();
	const fetcher = useFetcher();
	const dialogRef = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		if (fetcher.state === "idle" && fetcher.data) {
			const data = fetcher.data as any;
			if (data.ok) {
				navigate("/settings/access-mgmnt/", {
					state: {
						message: { type: "info", text: "The user has been deleted." },
					},
				});
			} else {
				notifyError(
					data.error || "Something went wrong while deleting the user."
				);
			}
		}
	}, [fetcher.state, fetcher.data, navigate]);

	fields = {
		...loaderData.data,
		activated: loaderData.data.emailVerified === true,
		generatedSystemIdentifier: loaderData.data.id.toString(),
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
		return obj && typeof obj === "object" && "fields" in obj;
	};

	type ErrorsType = {
		fields: Partial<Record<keyof AdminUpdateUserFields, string[]>>;
		form?: string[];
	};

	const safeErrors: ErrorsType = hasFields(errors) ? errors : { fields: {} };

	const handleDeleteClick = () => {
		dialogRef.current?.showModal();
	};

	const handleConfirmDelete = () => {
		dialogRef.current?.close();
		fetcher.load(
			`/settings/access-mgmnt/delete/${fields.generatedSystemIdentifier}`
		);
	};

	const handleCancelDelete = () => {
		dialogRef.current?.close();
	};

	return (
		<MainContainer title="Edit User">
			<div className="dts-form__header">
				<Link
					to="/settings/access-mgmnt/"
					className="mg-button mg-button--small mg-button-system"
				>
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
						<p
							style={{
								marginBottom: "0.5em",
								display: "flex",
								alignItems: "center",
							}}
						>
							<span
								className={`status-dot ${
									fields.activated ? "activated" : "pending"
								}`}
								style={{
									height: "10px",
									width: "10px",
									borderRadius: "50%",
									backgroundColor: fields.activated ? "#007bff" : "#ccc",
									marginRight: "8px",
								}}
							></span>
							{fields.activated
								? "Account activated"
								: "Account activation pending"}
						</p>
						<p style={{ marginBottom: "0.5em" }}>
							<strong>Date added:</strong>{" "}
							{fields.dateAdded
								? format(new Date(fields.dateAdded), "dd-MM-yyyy")
								: "N/A"}
						</p>
						<p>
							<strong>Added by:</strong> {fields.addedBy || "System Admin"}
						</p>
					</div>
					<button
						className="mg-button mg-button-system mg-button-system--transparent"
						style={{ display: "flex", alignItems: "center" }}
						onClick={handleDeleteClick}
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
					<div className="mg-grid mg-grid__col-3">
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
									aria-describedby={
										safeErrors.fields.firstName ? "firstNameError" : undefined
									}
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
									<span></span>Last Name
								</div>
								<input
									type="text"
									name="lastName"
									defaultValue={fields.lastName}
									autoComplete="family-name"
									className={safeErrors.fields.lastName ? "error" : ""}
									aria-describedby={
										safeErrors.fields.lastName ? "lastNameError" : undefined
									}
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
									readOnly={true}
									autoComplete="email"
									className={safeErrors.fields.email ? "error" : ""}
									aria-describedby={
										safeErrors.fields.email ? "emailError" : undefined
									}
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
									aria-describedby={
										safeErrors.fields.organization
											? "organizationError"
											: undefined
									}
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
						<div className="dts-form-component">
							<label aria-invalid={!!safeErrors.fields.role}>
								<div className="dts-form-component__label">
									<span style={{ color: "red" }}>*</span> Role
								</div>
								<select
									name="role"
									defaultValue={fields.role}
									className={safeErrors.fields.role ? "error" : ""}
									aria-describedby={
										safeErrors.fields.role ? "roleError" : undefined
									}
								>
									<option value="" disabled>
										Select a role
									</option>
									{getCountryRoles().map((role) => (
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
							<Link
								to="/settings/access-mgmnt/"
								className="mg-button mg-button-outline"
							>
								Discard
							</Link>
							<SubmitButton
								className="mg-button mg-button-primary"
								label="Save Changes"
							/>
						</div>
					</div>
				</Form>

				<ConfirmDialog
					dialogRef={dialogRef}
					confirmLabel="Delete user"
					cancelLabel="Do not delete"
					confirmIcon={
						<svg aria-hidden="true" focusable="false" role="img">
							<use href="/assets/icons/trash-alt.svg#delete" />
						</svg>
					}
					confirmButtonFirst={false}
					confirmMessage="This data cannot be recovered after being deleted."
					title="Are you sure you want to delete this user?"
					onConfirm={handleConfirmDelete}
					onCancel={handleCancelDelete}
				/>
			</>
		</MainContainer>
	);
}
