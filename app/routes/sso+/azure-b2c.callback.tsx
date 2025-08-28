import { redirect, LoaderFunction } from "@remix-run/node";

import { useLoaderData } from "@remix-run/react";

import { createUserSession, sessionCookie, superAdminSessionCookie } from "~/util/session";

import {
	configSsoAzureB2C,
	configAuthSupportedAzureSSOB2C,
} from "~/util/config";

import {
	SSOAzureB2C as interfaceSSOAzureB2C,
	baseURL,
	decodeToken,
} from "~/util/ssoauzeb2c";
import {
	loginAzureB2C,
	registerAzureB2C,
	checkSuperAdminByEmail,
	loginSuperAdminAzureB2C,
} from "~/backend.server/models/user/auth";
import { getUserCountryAccountsByUserId } from "~/db/queries/userCountryAccounts";
import { getInstanceSystemSettingsByCountryAccountId } from "~/db/queries/instanceSystemSetting";
import Messages from "~/components/Messages";
// import {setupAdminAccountFieldsFromMap, setupAdminAccountSSOAzureB2C} from "~/backend.server/models/user/admin";

interface interfaceQueryStringState {
	action?: string;
	inviteCode?: string;
	origin?: string;
	redirectTo?: string;
	isAdmin?: boolean;
	adminLogin?: number;
}

interface interfaceAzureB2CData {
	email: string;
	firstName: string;
	lastName: string;
}

export type typeAzureB2CData =
	| {
		okay: true;
		email: string;
		firstName: string;
		lastName: string;
		errors: "";
	}
	| {
		okay: false;
		email: string;
		firstName: string;
		lastName: string;
		errors: string;
	};

async function _code2Token(paramCode: string): Promise<typeAzureB2CData> {
	const jsonAzureB2C: interfaceSSOAzureB2C = configSsoAzureB2C();
	const urlSSOCode2Token = `${baseURL()}/token?p=${jsonAzureB2C.login_userflow
		}`;
	let token: object = {};
	let token_idp: object = {};
	let data: interfaceAzureB2CData = {
		email: "",
		firstName: "",
		lastName: "",
	};

	try {
		// WORKING
		const response = await fetch(urlSSOCode2Token, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				client_id: jsonAzureB2C.client_id,
				client_secret: jsonAzureB2C.client_secret,
				code: paramCode,
				grant_type: "authorization_code",
			}),
		});
		const result = await response.json();

		if ("id_token" in result) {
			token = decodeToken(result.id_token);
			// console.log(token);
			if ("idp_access_token" in token) {
				// console.log( token.idp_access_token );
				token_idp = decodeToken(String(token.idp_access_token));
				// console.log( token_idp );
				if ("family_name" in token_idp) {
					data.lastName = String(token_idp.family_name);
				}
				if ("given_name" in token_idp) {
					data.firstName = String(token_idp.given_name);
				}
				if ("unique_name" in token_idp) {
					data.email = String(token_idp.unique_name);
				}
			} else {
				if ("family_name" in token) {
					data.lastName = String(token.family_name);
				}
				if ("given_name" in token) {
					data.firstName = String(token.given_name);
				}
				if ("emails" in token) {
					data.email = String(token.emails);
				}
			}
		} else if ("error" in result && "error_description" in result) {
			return {
				okay: false,
				email: data.email,
				firstName: data.firstName,
				lastName: data.lastName,
				errors: String(result.error_description),
			};
		}

		return {
			okay: true,
			email: data.email,
			firstName: data.firstName,
			lastName: data.lastName,
			errors: "",
		};
	} catch (error) {
		return {
			okay: false,
			email: data.email,
			firstName: data.firstName,
			lastName: data.lastName,
			errors: String(error),
		};
	}
}

export const loader: LoaderFunction = async ({ request }) => {
	// console.log("NODE_ENV", process.env.NODE_ENV);
	// console.log("NODE_ENV", process.env.SSO_AZURE_B2C_CLIENT_SECRET)

	// const jsonAzureB2C:interfaceSSOAzureB2C = configSsoAzureB2C();
	const confAuthSupportedAzureSSOB2C: boolean =
		configAuthSupportedAzureSSOB2C();
	const url = new URL(request.url);
	const queryStringCode = url.searchParams.get("code") || "";
	const queryStringDesc = url.searchParams.get("error_description") || "";
	const queryStringState = url.searchParams.get("state") || "";
	let data: { [key: string]: string } = {};
	data["email"] = "";
	data["password"] = "";
	data["firstName"] = "";
	data["lastName"] = "";

	// console.log("queryStringState= ", queryStringState);
	// console.log("DEBUG: queryStringState received:", queryStringState);
	// https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch
	if (queryStringDesc) {
		return { errors: queryStringDesc };
	} else if (queryStringState.includes("%7B") && queryStringCode) {
		//data is a JSON encoded, data needs to be decoded
		let jsonQueryStringState: interfaceQueryStringState = {
			action: "",
			inviteCode: "",
		};
		try {
			jsonQueryStringState = JSON.parse(decodeURIComponent(queryStringState));
		} catch (error) {
			console.error("An error occurred:", error);
		}

		// console.log("jsonQueryStringState.action", jsonQueryStringState.action);
		// User opted to use Azure B2C SSO.
		if (jsonQueryStringState.action == "sso_azure_b2c-register") {
			const data2 = await _code2Token(queryStringCode);

			if (data2.okay) {
				let retLogin = await registerAzureB2C(
					data2.email,
					data2.firstName,
					data2.lastName
				);
				if (!retLogin.ok) {
					return {
						errors: retLogin.error,
						inviteCode: "",
						inviteCodeValidation: { ok: false, error: "" },
						confAuthSupportedAzureSSOB2C: confAuthSupportedAzureSSOB2C,
					};
				}

				const headers = await createUserSession(retLogin.userId);
				const userCountryAccounts = await getUserCountryAccountsByUserId(
					retLogin.userId
				);

				if (userCountryAccounts && userCountryAccounts.length === 1) {
					const countrySettings =
						await getInstanceSystemSettingsByCountryAccountId(
							userCountryAccounts[0].countryAccountsId
						);

					const session = await sessionCookie().getSession(
						headers["Set-Cookie"]
					);
					session.set(
						"countryAccountsId",
						userCountryAccounts[0].countryAccountsId
					);
					session.set("userRole", userCountryAccounts[0].role);
					session.set("countrySettings", countrySettings);
					const setCookie = await sessionCookie().commitSession(session);

					return redirect("/", {
						headers: { "Set-Cookie": setCookie },
					});
				} else if (userCountryAccounts && userCountryAccounts.length > 1) {
					return redirect("/user/select-instance", { headers: headers });
				}
			}
		}
	} else if ((queryStringState == "azure_sso_b2c-login" || queryStringState.includes("{")) && queryStringCode) {
		// console.log("DEBUG: Processing SSO login with code and state");
		try {
			const data2 = await _code2Token(queryStringCode);

			if (data2.okay) {
				// First check if this is a super admin
				const superAdminCheck = await checkSuperAdminByEmail(data2.email);
				// console.log("DEBUG: superAdminCheck.ok:", superAdminCheck.ok);

				// Get the cookies to check for admin login marker
				const cookieHeader = request.headers.get("Cookie") || "";
				// console.log("DEBUG: Cookies:", cookieHeader);

				// Retrieve session from request cookies to read login origin set on /admin/login
				const session = await sessionCookie().getSession(cookieHeader);
				const sessionLoginOrigin = session.get("loginOrigin");
				// console.log("DEBUG: Session login origin:", sessionLoginOrigin);

				// OPTION 2: Use State Parameter as Primary Source of Truth
				let isFromAdminLogin = false;
				let adminRedirectTo = "/admin/country-accounts";

				// 1. First priority: Check state parameter (most reliable)
				try {
					if (queryStringState.includes("{")) {
						const stateObj: interfaceQueryStringState = JSON.parse(
							decodeURIComponent(queryStringState)
						);
						// console.log("DEBUG: Parsed state object:", stateObj);

						// If state parameter contains admin info, use that regardless of session
						if (stateObj && (stateObj.adminLogin || stateObj.origin === "admin" || stateObj.isAdmin)) {
							isFromAdminLogin = true;
							// Get redirectTo from state if available
							if (stateObj.redirectTo) {
								adminRedirectTo = stateObj.redirectTo;
							}
							// console.log("DEBUG: Admin login detected from state parameter");
						}
					}
				} catch (error) {
					console.error("Error parsing state parameter:", error);
				}

				// 2. Fallback: Check session only if state doesn't indicate admin
				if (!isFromAdminLogin) {
					isFromAdminLogin = sessionLoginOrigin === "admin";
					// console.log("DEBUG: Using session fallback for admin detection:", isFromAdminLogin);
				}

				// console.log("DEBUG: Final isFromAdminLogin:", isFromAdminLogin);
				// console.log("DEBUG: Final adminRedirectTo:", adminRedirectTo);

				// If this is a super admin coming from admin login
				// If this is a super admin coming from admin login
				if (superAdminCheck.ok && isFromAdminLogin) {
					// console.log("DEBUG: Super admin SSO login detected");

					// Login super admin via SSO
					const superAdminLogin = await loginSuperAdminAzureB2C(
						data2.email,
						data2.firstName,
						data2.lastName
					);

					if (!superAdminLogin.ok) {
						return { errors: "Super admin login failed" };
					}

					// Create super admin session WITHOUT affecting existing cookies
					const session = await superAdminSessionCookie().getSession();
					session.set("superAdminId", superAdminLogin.superAdminId);
					const superAdminCookie = await superAdminSessionCookie().commitSession(session);

					// console.log("DEBUG: Redirecting super admin to:", adminRedirectTo);
					return redirect(adminRedirectTo, {
						headers: { "Set-Cookie": superAdminCookie }
					});
				}

				// Regular user login flow
				// console.log("DEBUG: Processing regular user login");
				let retLogin = await loginAzureB2C(
					data2.email,
					data2.firstName,
					data2.lastName
				);

				if (!retLogin.ok) {
					return { errors: retLogin.error };
				}

				if (retLogin.userId == "0") {
					console.error("Error:", "System error.");
					return { errors: "System error." };
				} else {
					const headers = await createUserSession(retLogin.userId);
					const userCountryAccounts = await getUserCountryAccountsByUserId(
						retLogin.userId
					);

					if (userCountryAccounts && userCountryAccounts.length === 1) {
						const countrySettings =
							await getInstanceSystemSettingsByCountryAccountId(
								userCountryAccounts[0].countryAccountsId
							);

						const session = await sessionCookie().getSession(
							headers["Set-Cookie"]
						);
						session.set(
							"countryAccountsId",
							userCountryAccounts[0].countryAccountsId
						);
						session.set("userRole", userCountryAccounts[0].role);
						session.set("countrySettings", countrySettings);
						const setCookie = await sessionCookie().commitSession(session);

						return redirect("/", {
							headers: { "Set-Cookie": setCookie },
						});
					} else if (userCountryAccounts && userCountryAccounts.length > 1) {
						return redirect("/user/select-instance", { headers: headers });
					}
				}
			}
		} catch (error) {
			console.error("Error:", error);
			return { errors: error };
		}
	}

	/*else if (queryStringState == 'azure_sso_b2c-admin-setup' && queryStringCode) {
		const data2 = await _code2Token(queryStringCode);

		if (data2.okay) {
			data['email'] = data2.email;
			data['password'] = '';
			data['firstName'] = data2.firstName;
			data['lastName'] = data2.lastName;

			try {
				const data3 = setupAdminAccountFieldsFromMap(data) 
				const res = await setupAdminAccountSSOAzureB2C(data3);
				if (!res.ok){
					console.error( res.errors );
					return { data, errors: res.errors };
				}
				const headers = await createUserSession(res.userId);
				return redirect("/user/verify-email", { headers });
			}
			catch (error) { 
				console.error('Error:', error); 
				return { errors:error };
			}
		}
	}*/

	return { errors: "" };
};

// https://app.dts.ddev.site/sso/azure-b2c/callback
export default function SsoAzureB2cCallback() {
	const loaderData = useLoaderData<typeof loader>();

	if (loaderData.errors) {
		return (
			<div className="dts-page-container">
				<main className="dts-main-container">
					<div className="mg-container">
						<div className="dts-form dts-form--vertical">
							<div className="dts-form__header"></div>
							<div className="dts-form__intro">
								<Messages
									header="Authentication Error"
									messages={loaderData.errors ? [loaderData.errors] : ["An error occurred during authentication."]}
								/>
								<h2 className="dts-heading-1">Sign in failed</h2>
								<p>There was a problem with your authentication attempt.</p>
							</div>
							<div className="dts-form__footer">
								<a href="/user/login" className="mg-button mg-button--primary">
									Return to Login
								</a>
							</div>
						</div>
					</div>
				</main>
			</div>
		);
	}

	return (
		<div>
			<p></p>
		</div>
	);
}