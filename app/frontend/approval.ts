export type approvalStatusIds = "pending" | "approved" | "rejected";

export const approvalStatusField =
{
	key: "approvalStatus", label: "Approval Status", type: "enum", required: true, enumData: [
		{key: "Open (Ongoing)", label: "Open (Ongoing)"},
		{key: "Completed", label: "Completed"},
		{key: "Validated", label: "Validated"}
	], uiRowNew: true
} as const;
