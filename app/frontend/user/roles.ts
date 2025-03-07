export const ValidRoles = [
	{id: "data-viewer", label: "Data Viewer", desc: "View data and use analytics."},
	{id: "data-collector", label: "Data Collector", desc: "Add, edit, import data."},
	{id: "data-validator", label: "Data Validator", desc: "Validate data."},
	{id: "admin", label: "Admin", desc: "Access and country settings."},
] as const;

export type RoleId = typeof ValidRoles[number]["id"];

export const Permissions = [
	{id: "ViewUsers", role: "admin", label: "View users"},
	{id: "EditUsers", role: "admin", label: "Edit other user details"},
	{id: "InviteUsers", role: "admin", label: "Invite users"},
	{id: "EditAPIKeys", role: "admin", label: "Edit API Keys"},
	{id: "ViewData", role: "data-viewer", label: "View data"},
	{id: "EditData", role: "data-collector", label: "Edit data"},
	{id: "ViewApiDocs", role: "data-viewer", label: "View API Docs"},
	{id: "EditHumanEffectsCustomDsg", role: "admin", label: "Edit custom disaggregations for human effects"},
] as const;

export type PermissionId = typeof Permissions[number]["id"];

export const PermissionsMap = Permissions.reduce((acc, {id, role}) => {
	acc[id] = role;
	return acc;
}, {} as {[key: string]: string});


export function roleHasPermission(role: string, permission: PermissionId): boolean {
	if (!role) {
		return false;
	}
	if (!(permission in PermissionsMap)) {
		throw "invalid permission"
	}
	const hierarchy = ["data-viewer", "data-collector", "data-validator", "admin"];
	const minRole = PermissionsMap[permission];

	return hierarchy.indexOf(role) >= hierarchy.indexOf(minRole);
}

