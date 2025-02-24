export type approvalStatusIds = "open" | "completed";

export const approvalStatusField =
{
	key: "approvalStatus", label: "Approval Status", type: "enum", required: true, enumData: [
		{key: "open", label: "Open"},
		{key: "completed", label: "Completed"},
		// {key: "Validated", label: "Validated"}
	], uiRowNew: true
} as const;
