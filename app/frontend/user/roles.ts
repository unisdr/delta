export const ValidRoles = [
	{id: "admin", label: "Admin", desc: "Allows to admin"},
	{id: "contributor", label: "Contributor", desc: "Allows to contribute"},
	{id: "data-viewer", label: "Data Viewer", desc: "Allows to view"},
] as const;

export const Permissions = [
	{id: "ViewUsers", role: "admin", label: "View users"},
	{id: "EditUsers", role: "admin", label: "Edit other user details"},
	{id: "ViewData", role: "data-viewer", label: "View data"},
	{id: "EditData", role: "contributor", label: "Edit data"},
	{id: "InviteUsers", role: "admin", label: "Invite users"},
] as const;

export type PermissionId = typeof Permissions[number]["id"];

export const PermissionsMap = Permissions.reduce((acc, { id, role }) => {
	acc[id] = role;
	return acc;
}, {} as { [key: string]: string });

export function roleHasPermission(role: string, permission: PermissionId): boolean {
	if (!role) {
		return false;
	}

	const minRole = PermissionsMap[permission];

	switch (role) {
		case "admin":
			if (minRole === "admin" || minRole === "contributor" || minRole === "data-viewer") {
				return true;
			}
			return false;

		case "contributor":
			if (minRole === "contributor" || minRole === "data-viewer") {
				return true;
			}
			return false;

		case "data-viewer":
			if (minRole === "data-viewer") {
				return true;
			}
			return false;

		default:
			return false;
	}
}
