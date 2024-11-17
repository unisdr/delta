import {
	authActionWithRole,
	authLoaderWithRole
} from "~/util/auth";

import type {
	ActionFunctionArgs,
} from "@remix-run/node";
import {
	unstable_composeUploadHandlers,
	unstable_parseMultipartFormData,
} from "@remix-run/node";
import {
	UserError,
	importCSV
} from "~/backend.server/models/division";

import {
	useActionData,
	Link
} from "@remix-run/react";


export const loader = authLoaderWithRole("EditData", async () => {
	return null;
});

export const action = authActionWithRole("EditData", async ({request}: ActionFunctionArgs) => {
	let fileString = "";

	const uploadHandler = unstable_composeUploadHandlers(
		async ({name, contentType, data, filename}) => {
			console.log("Got file", {name, contentType, filename})
			const chunks: Uint8Array[] = [];
			for await (const chunk of data) {
				chunks.push(chunk);
			}
			const fileBuffer = Buffer.concat(chunks);
			fileString = fileBuffer.toString();
			return "test";
		},
	);
	await unstable_parseMultipartFormData(
		request,
		uploadHandler
	);
	try {
		let res = await importCSV(fileString)
		return {ok: true, imported: res.size};
	} catch (err) {
		if (err instanceof UserError) {
			return {ok: false, error: err.message};
		} else {
			console.error("Could not import divisions csv", err)
			return {ok: false, error: "Server error"};
		}
	}
});


export default function Screen() {
	let error = ""
	const actionData = useActionData<typeof action>();
	let submitted = false
	let imported = 0
	if (actionData) {
		submitted = true
		if (!actionData.ok) {
			error = actionData.error || "Server error"
		} else {
			imported = actionData.imported
		}
	}
	return (
		<form method="post" encType="multipart/form-data">
			{submitted && <p>Imported or updated {imported} records</p>}
			{error ? (
				<p>{error}</p>
			) : null}
			<label>
				File upload<br />
				<input name="file" type="file"></input>
			</label>
			<input type="submit" value="Submit" />
			<div>
				<Link to="/settings/geography">Back to List</Link>
			</div>
		</form>
	);
}
