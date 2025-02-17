export type approvalStatusIds = "pending" | "approved" | "rejected";

export const approvalStatusField =
{
	key: "approvalStatus", label: "Approval Status", type: "enum", required: true, enumData: [
		{key: "pending", label: "Pending"},
		{key: "approved", label: "Approved"},
		{key: "rejected", label: "Rejected"}
	], uiRowNew: true
} as const;
