import { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { MainContainer } from "~/frontend/container";
import { ValidRoles } from "~/frontend/user/roles";

/**
 * Meta function for the page
 */
export const meta: MetaFunction = () => {
	return [
		{ title: "Access Denied - DTS" },
		{ name: "description", content: "Unauthorized access error page." },
	];
};

/**
 * Loader function to handle error parameters
 */
export async function loader({ request }: LoaderFunctionArgs): Promise<{
	reason: string;
	requiredRole: string;
	requiredPermission: string;
	currentRole: string;
	recordStatus: string;
	entityType: string;
}> {
	const url = new URL(request.url);
	const reason = url.searchParams.get("reason") || "unauthorized";
	const requiredRole = url.searchParams.get("requiredRole") || "";
	const requiredPermission = url.searchParams.get("requiredPermission") || "";
	const currentRole = url.searchParams.get("currentRole") || "";
	const recordStatus = url.searchParams.get("status") || "";
	const entityType = url.searchParams.get("entityType") || "record";

	return {
		reason,
		requiredRole,
		requiredPermission,
		currentRole,
		recordStatus,
		entityType
	};
}

/**
 * Error page for unauthorized tenant access
 */
export default function UnauthorizedError() {
	const {
		reason,
		requiredRole,
		requiredPermission,
		currentRole,
		recordStatus,
		entityType
	} = useLoaderData<typeof loader>();

	// Find role label if available
	const getRoleLabel = (roleId: string) => {
		const role = ValidRoles.find(r => r.id === roleId);
		return role ? role.label : roleId;
	};

	// Define user-friendly messages for different error reasons
	let errorTitle = "Access Denied";
	let errorMessage = "You do not have permission to access this resource.";
	let errorDetails = "Please contact your administrator if you believe this is an error.";

	switch (reason) {
		case "insufficient_role":
			errorTitle = "Higher Role Required";
			errorMessage = `This action requires ${requiredRole ? getRoleLabel(requiredRole) : "a higher"} role privileges.`;
			errorDetails = currentRole
				? `Your current role (${getRoleLabel(currentRole)}) does not have sufficient permissions.`
				: "Please contact your administrator if you believe you should have access.";
			break;

		case "missing_permission":
			errorTitle = "Permission Required";
			errorMessage = `You do not have the required permission: ${requiredPermission || "Unknown"}.`;
			errorDetails = "Please contact your administrator if you believe you should have access to this feature.";
			break;

		case "no_edit_permission":
			errorTitle = "Edit Permission Required";
			errorMessage = `You do not have permission to edit ${entityType}s.`;
			errorDetails = "This action requires 'Edit Data' permission. Please contact your administrator if you believe you should have access.";
			break;

		case "no_delete_permission":
			errorTitle = "Delete Permission Required";
			errorMessage = `You do not have permission to delete ${entityType}s.`;
			errorDetails = "This action requires 'Delete Validated Data' permission. Please contact your administrator if you believe you should have access.";
			break;

		case "record_not_found":
			errorTitle = `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} Not Found`;
			errorMessage = `The requested ${entityType} does not exist or you do not have permission to access it.`;
			errorDetails = `Please verify the ${entityType} ID and ensure you have access to this instance's data.`;
			break;

		case "record_not_editable":
			errorTitle = `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} Cannot Be Edited`;
			errorMessage = `This ${entityType} cannot be edited due to its current status: ${recordStatus || "Unknown"}.`;
			errorDetails = "Only records with 'Draft' or 'Waiting for validation' status can be edited.";
			break;

		case "record_not_deletable":
			errorTitle = `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} Cannot Be Deleted`;
			errorMessage = `This ${entityType} cannot be deleted due to its current status: ${recordStatus || "Unknown"}.`;
			errorDetails = "Published records cannot be deleted. Only Data validators/Admins can delete validated records.";
			break;

		case "parent_record_not_found":
			errorTitle = "Parent Record Not Found";
			errorMessage = "The parent record does not exist or you do not have permission to access it.";
			errorDetails = "Please verify the parent record ID and ensure you have access to this instance's data.";
			break;

		case "no-tenant":
			errorTitle = "No Country Instance Selected";
			errorMessage = "Your account is not associated with any country instance.";
			errorDetails = "Please contact your administrator or technical support for assistance.";
			break;

		case "unauthorized":
			errorTitle = "Access Denied";
			errorMessage = "You do not have permission to access this resource.";
			errorDetails = "Please contact your administrator if you believe this is an error.";
			break;
	}

	return (
		<MainContainer title={errorTitle}>
			<div className="mg-grid">
				<div className="mg-grid__col mg-grid__col--12 mg-grid__col--md-8 mg-grid__col--md-offset-2">
					<div className="mg-card mg-card--error mg-u-margin-bottom--lg">
						<div className="mg-card__header">
							<h2 className="mg-card__title">{errorTitle}</h2>
						</div>
						<div className="mg-card__body">
							<p className="mg-u-margin-bottom--md">{errorMessage}</p>
							<p className="mg-u-font-size--sm mg-u-color--gray-60">{errorDetails}</p>
						</div>
					</div>

					<div className="mg-u-text-align--center mg-u-margin-top--lg">
						<a href="/" className="mg-button mg-button--primary mg-u-margin-right--md">
							Return to Dashboard
						</a>
						<a href="javascript:history.back()" className="mg-button mg-button--secondary">
							Go Back
						</a>
					</div>
				</div>
			</div>
		</MainContainer>
	);
}