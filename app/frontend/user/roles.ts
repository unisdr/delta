export const ValidRoles = [
	{ id: "data-viewer", label: "Data Viewer", desc: "View data and use analytics." },
	{ id: "data-collector", label: "Data Collector", desc: "Add, edit, import data." },
	{ id: "data-validator", label: "Data Validator", desc: "Validate data." },
	{ id: "admin", label: "Admin", desc: "Access and country settings." },
	{ id: "super_admin", label: "Super Admin", desc: "Global access and country account management." },
] as const;

export type RoleId = typeof ValidRoles[number]["id"];

export const Permissions = [
	{ id: "ViewUsers", role: "admin", label: "View users" },
	{ id: "EditUsers", role: "admin", label: "Edit other user details" },
	{ id: "InviteUsers", role: "admin", label: "Invite users" },
	{ id: "EditAPIKeys", role: "admin", label: "Edit API Keys" },
	{ id: "ViewData", role: "data-viewer", label: "View data" },
	{ id: "EditData", role: "data-collector", label: "Edit data" },
	{ id: "ViewApiDocs", role: "data-viewer", label: "View API Docs" },
	{ id: "EditHumanEffectsCustomDsg", role: "admin", label: "Edit custom disaggregations for human effects" },
	{ id: "ValidateData", role: "data-validator", label: "Validate data records" },
	{ id: "DeleteValidatedData", role: "data-validator", label: "Delete validated data records" },
	{ id: "ManageCountrySettings", role: "admin", label: "Manage country settings" },
	// Super admin specific permissions
	{ id: "manage_country_accounts", role: "super_admin", label: "Manage country accounts" },
	{ id: "create_country_account", role: "super_admin", label: "Create country account" },
	{ id: "activate_country_account", role: "super_admin", label: "Activate country account" },
	{ id: "deactivate_country_account", role: "super_admin", label: "Deactivate country account" },
	{ id: "modify_country_account", role: "super_admin", label: "Modify country account" },
] as const;

export type PermissionId = typeof Permissions[number]["id"];

export const permissions = {
	// Existing permissions
	ViewUsers: "ViewUsers",
	EditUsers: "EditUsers",
	InviteUsers: "InviteUsers",
	EditAPIKeys: "EditAPIKeys",
	ViewData: "ViewData",
	EditData: "EditData",
	ViewApiDocs: "ViewApiDocs",
	EditHumanEffectsCustomDsg: "EditHumanEffectsCustomDsg",
	ValidateData: "ValidateData",
	DeleteValidatedData: "DeleteValidatedData",
	ManageCountrySettings: "ManageCountrySettings",

	// Super admin specific permissions
	manage_country_accounts: "manage_country_accounts",
	create_country_account: "create_country_account",
	activate_country_account: "activate_country_account",
	deactivate_country_account: "deactivate_country_account",
	modify_country_account: "modify_country_account",
} as const;

export const PermissionsMap = Permissions.reduce((acc, { id, role }) => {
	acc[id] = role;
	return acc;
}, {} as { [key: string]: string });

export const roles = {
	"data-viewer": [
		"ViewData",
		"ViewApiDocs"
	] as PermissionId[],
	"data-collector": [
		"ViewData",
		"EditData",
		"ViewApiDocs"
	] as PermissionId[],
	"data-validator": [
		"ViewData",
		"EditData",
		"ViewApiDocs",
		// Data validators can validate and delete validated records
		"ValidateData",
		"DeleteValidatedData"
	] as PermissionId[],
	"admin": [
		"ViewUsers",
		"EditUsers",
		"InviteUsers",
		"EditAPIKeys",
		"ViewData",
		"EditData",
		"ViewApiDocs",
		"EditHumanEffectsCustomDsg",
		"ValidateData",
		"DeleteValidatedData",
		"ManageCountrySettings"
	] as PermissionId[],

	// Global role (cross-tenant)
	super_admin: [
		// Super admin specific permissions - no country-specific permissions for data sovereignty
		"manage_country_accounts",
		"create_country_account",
		"activate_country_account",
		"deactivate_country_account",
		"modify_country_account",
	] as PermissionId[],
} as const;

export function roleHasPermission(role: RoleId | string | null, permission: PermissionId): boolean {
	if (!role) {
		return false;
	}

	// Check if using the new roles structure
	if (roles[role as RoleId] && roles[role as RoleId].includes(permission)) {
		return true;
	}

	// Fallback to legacy hierarchy check
	if (!(permission in PermissionsMap)) {
		throw "invalid permission"
	}
	const hierarchy = ["data-viewer", "data-collector", "data-validator", "admin", "super_admin"];
	const minRole = PermissionsMap[permission];

	return hierarchy.indexOf(role) >= hierarchy.indexOf(minRole);
}

// Helper function to check if user is super admin
export function isSuperAdmin(role: RoleId | string | null): boolean {
	return role === "super_admin";
}

