import { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Link } from "react-router-dom";

import { configAuthSupportedAzureSSOB2C } from "~/util/config";

import { validateInviteCode } from "~/backend.server/models/user/invite";

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const confAuthSupportedAzureSSOB2C: boolean =
		configAuthSupportedAzureSSOB2C();
	const url = new URL(request.url);
	const inviteCode = url.searchParams.get("inviteCode") || "";
	const state = url.searchParams.get("state") || "";
	const queryStringCode = url.searchParams.get("code") || "";
	const res = await validateInviteCode(inviteCode);

	return {
		inviteCode: inviteCode,
		inviteCodeValidation: res,
		code: queryStringCode,
		state: state,
		confAuthSupportedAzureSSOB2C: confAuthSupportedAzureSSOB2C,
	};
};

export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();
	const inviteCode = loaderData.inviteCode;

	if (!loaderData.inviteCodeValidation.ok) {
		return (
			<>
				<p>{loaderData.inviteCodeValidation.error}</p>
			</>
		);
	}

	return (
		<>
			<div className="mg-container">
				<form className="dts-form dts-form--vertical">
					<div className="dts-form__header">&nbsp;</div>
					<div className="dts-form__intro">
						<h1 className="dts-heading-1">
							Welcome to the DELTA Resilience system.
						</h1>
						<p>
							Track disaster impacts, including damages, losses, and human
							effects, to support better recovery and resilience.
						</p>
					</div>

					<div className="dts-form__actions">
						<Link
							className="mg-button mg-button-primary"
							to={`/user/accept-invite?inviteCode=${inviteCode}`}
						>
							Set up account
						</Link>

						{loaderData.confAuthSupportedAzureSSOB2C && (
							<>
								<Link
									className="mg-button mg-button-outline"
									to={`/sso/azure-b2c/invite?inviteCode=${inviteCode}&action=sso_azure_b2c-register`}
								>
									Set up using SSO
								</Link>
								<p>
									Note: For setup using SSO, please use the same email address
									where you received the invitation email.
								</p>
							</>
						)}
					</div>
				</form>
			</div>
		</>
	);
}
