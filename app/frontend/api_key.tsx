
import {
	UserFormProps,
	FormInputDef,
	FieldsView,
	FormView,
	ViewComponent
} from "~/frontend/form";

import { ApiKeyViewModel, UserCentricApiKeyFields } from "~/backend.server/models/api_key";
import React from "react";
import { formatDate } from "~/util/date";

export const route = "/settings/api-key"

export const fieldsDefCommon = [
	{ key: "name", label: "Name", type: "text", required: true },
] as const;

export const fieldsDef: FormInputDef<UserCentricApiKeyFields>[] = [
	...fieldsDefCommon,
	{ key: "assignedToUserId", label: "Assign to User", type: "text" }
];

export const fieldsDefView: FormInputDef<ApiKeyViewModel>[] = [
	{ key: "createdAt", label: "Created At", type: "other" },
	{ key: "managedByUser", label: "Managed By User", type: "other" },
	...fieldsDefCommon,
	{ key: "secret", label: "Secret", type: "text" },
];

interface ApiKeyFormProps extends UserFormProps<UserCentricApiKeyFields> {
	userOptions?: Array<{ value: string, label: string }>;
	isAdmin?: boolean;
}

export function ApiKeyForm(props: ApiKeyFormProps) {
	// Create field overrides for the user selection dropdown
	const fieldOverrides: Record<string, React.ReactElement | null | undefined> = {};

	// Handle user selection field for admins
	if (props.isAdmin) {
		// Check if there are user options available
		if (props.userOptions && props.userOptions.length > 0) {
			// Use a direct select element with the correct name to ensure proper form submission
			fieldOverrides.assignedToUserId = (
				<div key="assignedToUserId" className="dts-form-component">
					<div className="dts-form-component__label">
						<label htmlFor="assignedToUserId">Assign to User (Optional)</label>
					</div>
					<select
						id="assignedToUserId"
						name="assignedToUserId"
						className="form-control"
						defaultValue={props.fields?.assignedToUserId || ''}
					>
						<option value="">-- Select User (Optional) --</option>
						{props.userOptions.map(option => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
					<small className="form-text text-muted">
						If selected, this API key will only be valid when the assigned user is active.
					</small>
				</div>
			);
		} else {
			// Show a message when no users are available for assignment
			fieldOverrides.assignedToUserId = (
				<div key="assignedToUserId" className="dts-form-component">
					<div className="dts-form-component__label">
						<label htmlFor="assignedToUserId">Assign to User</label>
					</div>
					<div className="dts-form-component__label">
						No users are available for assignment. Please add users in the Access Management section first.
					</div>
				</div>
			);
		}
	}

	return (
		<FormView
			path={route}
			edit={props.edit}
			id={props.id}
			plural="API Keys"
			singular="API Key"
			errors={props.errors}
			fields={props.fields}
			fieldsDef={fieldsDef}
			override={fieldOverrides}
		/>
	);
}


interface ApiKeyViewProps {
	item: ApiKeyViewModel & {
		isActive?: boolean;
		issues?: string[];
		assignedUserId?: string | null;
		assignedUserEmail?: string | null;
	};
}

export function ApiKeyView(props: ApiKeyViewProps) {
	const item = props.item;

	// Determine if we need to show status information
	const showStatusInfo = 'isActive' in item;
	const isDisabled = showStatusInfo && item.isActive === false;

	// Prepare status message if key is disabled
	const statusMessage = isDisabled ? (
		<div key="status" style={{
			marginTop: '1rem',
			padding: '0.75rem',
			borderRadius: '0.25rem',
			backgroundColor: '#FEE2E2',
			color: '#B91C1C',
			border: '1px solid #F87171'
		}}>
			<h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>⚠️ This API key is disabled</h3>
			<p style={{ margin: '0' }}>
				Reason: {item.issues?.join(', ') || 'User status is inactive'}
			</p>
		</div>
	) : null;

	// Prepare assigned user information if available
	const assignedUserInfo = item.assignedUserId ? (
		<div key="assignedUser">
			<p>Assigned to User: {item.assignedUserEmail || item.assignedUserId}</p>
		</div>
	) : null;

	return (
		<ViewComponent
			path={route}
			id={props.item.id}
			plural="API Keys"
			singular="API Key"
		>
			{statusMessage}

			<FieldsView def={fieldsDefView} fields={item} override={{
				createdAt: (
					<div key="createdAt">
						<p>Created at: {formatDate(item.createdAt)}</p>
					</div>
				),
				managedByUser: (
					<React.Fragment key="managedByUser">
						<div>
							<p>Managed By: {item.managedByUser.email}</p>
						</div>
						{assignedUserInfo}
					</React.Fragment>
				)
			}} />
		</ViewComponent>
	);
}


