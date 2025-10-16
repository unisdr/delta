import {
	unstable_composeUploadHandlers,
	unstable_parseMultipartFormData,
} from "@remix-run/node";
import {
	UserError,
	importZip
} from "~/backend.server/models/division";

export async function handleRequest(request: Request, countryAccountsId: string) {
	let fileBytes: Uint8Array | null = null;

	const uploadHandler = unstable_composeUploadHandlers(
		async ({ name, contentType, data, filename }) => {
			console.log("Got file", { name, contentType, filename })
			const chunks: Uint8Array[] = [];
			for await (const chunk of data) {
				chunks.push(chunk);
			}
			const fileBuffer = Buffer.concat(chunks);
			fileBytes = new Uint8Array(fileBuffer);
			return "test";
		},
	);
	await unstable_parseMultipartFormData(
		request,
		uploadHandler
	);
	try {
		if (!fileBytes) {
			throw "File was not set"
		}
		// Pass tenant context to importZip function
		const res = await importZip(fileBytes, countryAccountsId)
		if (!res.success) {
			throw new UserError(res.error || "Import failed");
		}
		// Return detailed information including any failed division details
		return {
			ok: true,
			imported: res.data.imported,
			failed: res.data.failed,
			failedDetails: res.data.failedDetails || {}
		};
	} catch (err) {
		if (err instanceof UserError) {
			return { ok: false, error: err.message };
		} else {
			console.error("Could not import divisions csv", err)
			return { ok: false, error: "Server error" };
		}
	}
}
