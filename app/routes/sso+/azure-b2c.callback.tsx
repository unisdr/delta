import { redirect, LoaderFunction } from "@remix-run/node";

import { useLoaderData } from "@remix-run/react";

import { createUserSession, sessionCookie } from "~/util/session";

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
} from "~/backend.server/models/user/auth";
import { getUserCountryAccountsByUserId } from "~/db/queries/userCountryAccounts";
import { getInstanceSystemSettingsByCountryAccountId } from "~/db/queries/instanceSystemSetting";
// import {setupAdminAccountFieldsFromMap, setupAdminAccountSSOAzureB2C} from "~/backend.server/models/user/admin";

interface interfaceQueryStringState {
	action: string;
	inviteCode: string;
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
	const urlSSOCode2Token = `${baseURL()}/token?p=${
		jsonAzureB2C.login_userflow
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
	console.log("NODE_ENV", process.env.NODE_ENV);
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

	console.log("queryStringState= ", queryStringState);

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

        console.log("jsonQueryStringState.action", jsonQueryStringState.action);
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
					return redirect("/select-instance", { headers: headers });
				}
			}
		}
	} else if (queryStringState == "azure_sso_b2c-login" && queryStringCode) {
		try {
			const data2 = await _code2Token(queryStringCode);

			if (data2.okay) {
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
						return redirect("/select-instance", { headers: headers });
					}
					// return redirect("/", { headers });
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
			<>
				<div>
					<h1>Error: received server error response</h1>
					<p>{loaderData.errors}</p>
				</div>
			</>
		);
	}

	return (
		<div>
			<p></p>
		</div>
	);
}
