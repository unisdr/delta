export type approvalStatusIds =
	| "draft"
	| "waiting-for-validation"
	| "needs-revision"
	| "validated"
	| "published";

export const approvalStatusField = {
	key: "approvalStatus",
	label: "Record Status",
	type: "approval_status",
	enumData: [
		{ key: "draft", label: "Draft" },
		{
			key: "waiting-for-validation",
			label: "Waiting for validation",
		},
		{ key: "needs-revision", label: "Needs revision" },
		{ key: "validated", label: "Validated" },
		{ key: "published", label: "Published" },
	],
	uiRowNew: true,
} as const;
