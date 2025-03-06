export type approvalStatusIds =
	| "draft"
	| "completed-waiting-for-approval"
	| "approved"
	| "sent-for-review"
	| "published";

export const approvalStatusField = {
	key: "approvalStatus",
	label: "Approval Status",
	type: "approval_status",
	enumData: [
		{ key: "draft", label: "Draft" },
		{
			key: "completed-waiting-for-approval",
			label: "Completed / Waiting for approval",
		},
		{ key: "approved", label: "Approved" },
		{ key: "sent-for-review", label: "Sent for review" },
		{ key: "published", label: "Published" },
	],
	uiRowNew: true,
} as const;
