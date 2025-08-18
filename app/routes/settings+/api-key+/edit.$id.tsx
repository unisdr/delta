import {
	apiKeyCreate,
	apiKeyUpdate,
	apiKeyById,
	UserCentricApiKeyFields
} from "~/backend.server/models/api_key";

import { fieldsDef, ApiKeyForm } from "~/frontend/api_key";
import { FormScreen } from "~/frontend/form";
import { formSave } from "~/backend.server/handlers/form/form";
import { route } from "~/frontend/api_key";
import { authActionGetAuth, authActionWithPerm, authLoaderWithPerm } from "~/util/auth";
import { getCountryAccountsIdFromSession, getUserRoleFromSession } from "~/util/session";
import { dr } from "~/db.server";
import { roleHasPermission } from "~/frontend/user/roles";
import { userCountryAccounts } from "~/drizzle/schema";
import { eq } from "drizzle-orm";
import { useLoaderData } from "@remix-run/react";

export const loader = authLoaderWithPerm("EditAPIKeys", async (args) => {
	const { params, request } = args;
	// Get user role from session and check if they have EditAPIKeys permission
	const userRole = await getUserRoleFromSession(request);
	const isAdmin = roleHasPermission(userRole, "EditAPIKeys");

	// Debug info
	console.log("DEBUG - User role:", userRole);
	console.log("DEBUG - Is admin with EditAPIKeys permission:", isAdmin);

	// Get the API key if editing
	let item = null;
	if (params.id !== "new" && params.id) {
		item = await apiKeyById(params.id);
	}

	// Get users for admin selection
	const userOptions: Array<{ value: string, label: string }> = [];

	// Get the current country account ID from the session
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	console.log("DEBUG - Current country account ID:", countryAccountsId);

	// Get the current user ID from the userSession
	const currentUserId = (args as any).userSession?.user?.id;
	console.log("DEBUG - Current user ID:", currentUserId);

	if (isAdmin) {
		// Get users that belong to the same country account (tenant isolation)
		const usersInSameAccount = await dr.query.userCountryAccounts.findMany({
			where: eq(userCountryAccounts.countryAccountsId, countryAccountsId),
			with: {
				user: true
			}
		});

		console.log("DEBUG - Users in same account count:", usersInSameAccount.length);

		// Filter to only include verified users and exclude the current admin user
		const verifiedUsers = usersInSameAccount.filter(ua =>
			ua.user.emailVerified && ua.user.id !== currentUserId
		);
		console.log("DEBUG - Verified users (excluding current admin) count:", verifiedUsers.length);

		// Create options for the dropdown
		verifiedUsers.forEach(ua => {
			const user = ua.user;
			if (user.id && user.email && user.firstName && user.lastName) {
				userOptions.push({
					value: user.id,
					label: `${user.firstName} ${user.lastName} (${user.email})`
				});
			}
		});
	}

	console.log("DEBUG - User options for dropdown:", userOptions);

	return {
		item,
		userOptions,
		isAdmin
	};
});

export const action = authActionWithPerm("EditAPIKeys", async (actionArgs) => {
	const auth = authActionGetAuth(actionArgs);
	const { request } = actionArgs;

	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	return formSave<UserCentricApiKeyFields>({
		actionArgs,
		fieldsDef: fieldsDef,
		save: async (tx, id, fields) => {
			// Prepare data with user ID and country account
			const data = {
				...fields,
				assignedToUserId: fields.assignedToUserId || undefined,
				managedByUserId: auth.user?.id,
				countryAccountsId
			};

			// Create or update based on ID
			if (!id) {
				return apiKeyCreate(tx, data);
			} else {
				// For update, we need to use only the fields that apiKeyUpdate expects
				// The apiKeyUpdate function only requires the name field
				return apiKeyUpdate(tx, id, {
					name: fields.assignedToUserId
						? `${fields.name}__ASSIGNED_USER_${fields.assignedToUserId}`
						: fields.name,
					// These fields are required by the ApiKeyFields type but not used in the update function
					updatedAt: null,
					createdAt: new Date(), // Placeholder, not used
					secret: '', // Placeholder, not used
					managedByUserId: auth.user?.id || '',
					countryAccountsId: countryAccountsId
				});
			}
		},
		redirectTo: (id) => `${route}/${id}`,
	});
});

export default function Screen() {
	// Get the loader data to access userOptions and isAdmin
	const loaderData = useLoaderData<{ item: UserCentricApiKeyFields | null, userOptions: Array<{ value: string, label: string }>, isAdmin: boolean }>();

	// Debug the loader data
	console.log("DEBUG - Screen component - loaderData:", {
		userOptions: loaderData.userOptions,
		isAdmin: loaderData.isAdmin,
		userOptionsLength: loaderData.userOptions?.length || 0
	});

	// Create extraData with explicit console logging
	const extraData = {
		userOptions: loaderData.userOptions || [],
		isAdmin: loaderData.isAdmin || false
	};

	console.log("DEBUG - Screen component - extraData being passed to ApiKeyForm:", extraData);

	return (
		<FormScreen<UserCentricApiKeyFields>
			fieldsDef={fieldsDef}
			formComponent={ApiKeyForm}
			extraData={extraData}
		/>
	);
}
