import {
	authActionWithPerm,
	authLoaderWithPerm
} from "~/util/auth";

import type { } from "@remix-run/node";
import {
	unstable_composeUploadHandlers,
	unstable_parseMultipartFormData,
} from "@remix-run/node";
import {
	UserError,
	importZip
} from "~/backend.server/models/division";

import {
	useActionData,
	Link
} from "@remix-run/react";

import { NavSettings } from "~/routes/settings/nav";

import { MainContainer } from "~/frontend/container";
import { getCountryAccountsIdFromSession } from "~/util/session";

export const loader = authLoaderWithPerm("ManageCountrySettings", async () => {
	return null;
});

export const action = authActionWithPerm("ManageCountrySettings", async (actionArgs) => {
	const { request } = actionArgs;
	let fileBytes: Uint8Array | null = null;

	const countryAccountsId = await getCountryAccountsIdFromSession(request);

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
});


export default function Screen() {
	let error = ""
	const actionData = useActionData<typeof action>();
	let submitted = false
	let imported = 0
	let failed = 0
	let failedDetails: Record<string, string> = {}

	if (actionData) {
		submitted = true
		if (!actionData.ok) {
			error = actionData.error || "Server error"
		} else {
			imported = actionData.imported
			failed = actionData.failed
			failedDetails = actionData.failedDetails || {}
		}
	}

	return (
		<MainContainer
			title="Geographic levels"
			headerExtra={<NavSettings />}
		>
			<>
				<form method="post" encType="multipart/form-data">
					{submitted && (
						<div className="dts-form-component">
							<p className="dts-body-text">
								Successfully imported {imported} records
								{failed > 0 && ` (${failed} records failed)`}
							</p>

							{/* Display validation errors for failed imports */}
							{failed > 0 && Object.keys(failedDetails).length > 0 && (
								<div className="dts-message dts-message--error">
									<h3 className="dts-body-text-bold">Failed imports:</h3>
									<ul className="dts-list dts-list--bullet">
										{Object.entries(failedDetails).map(([divisionId, errorMsg]) => (
											<li key={divisionId}>
												<strong>{divisionId}:</strong> {errorMsg}
											</li>
										))}
									</ul>
								</div>
							)}
						</div>
					)}

					{error ? (
						<p className="dts-message dts-message--error">{error}</p>
					) : null}

					<div className="dts-form-component">
						<label>
							<span className="dts-form-component__label">Upload Division ZIP File</span>
							<input
								name="file"
								type="file"
								accept=".zip"
								className="dts-form-component__input"
							/>
						</label>
					</div>

					<div className="mg-grid mg-grid__col-6 dts-form__actions">
						<input
							className="mg-button mg-button-primary"
							type="submit"
							value="Upload and Import"
						/>
						<Link
							to="/settings/geography"
							className="mg-button mg-button-secondary"
						>
							Back to List
						</Link>
					</div>
				</form>
			</>
		</MainContainer>
	);
}
