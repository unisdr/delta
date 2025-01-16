import {
	json,
	redirect,
	LoaderFunction
} from "@remix-run/node";

import { 
	useLoaderData,
	Link
 } from "@remix-run/react";

import { createUserSession } from "~/util/session";

import { 
	configSsoAzureB2C 
} from "~/util/config";

import { 
	SSOAzureB2C as interfaceSSOAzureB2C, 
	baseURL,
	decodeToken,
	loginGetCode
} from "~/util/ssoauzeb2c";

import {
	setupAdminAccountSSOAzureB2C,
	setupAdminAccountFieldsFromMap,
	loginAzureB2C
} from "~/backend.server/models/user";


import { object } from "prop-types";

export const loader:LoaderFunction = async ( { request } ) => {
	console.log("NODE_ENV", process.env.NODE_ENV)
	// console.log("NODE_ENV", process.env.SSO_AZURE_B2C_CLIENT_SECRET)

	const jsonAzureB2C:interfaceSSOAzureB2C = configSsoAzureB2C();
	const urlSSOCode2Token = `${ baseURL() }/token?p=${ jsonAzureB2C.login_userflow }`;
	const url = new URL(request.url);
	const queryStringCode = url.searchParams.get('code') || '';
	const queryStringError = url.searchParams.get('error') || '';
	const queryStringDesc = url.searchParams.get('error_description') || '';
	const queryStringAction = url.searchParams.get('action') || '';
	let data: { [key: string]: string } = {};
	data['email'] = '';
	data['password'] = '';
	data['firstName'] = '';
	data['lastName'] = '';

	let token:object = {};
	let token_idp:object = {};

	// https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch
	if (queryStringDesc) {
		return json({ errors:queryStringDesc });
	}
	else if (queryStringAction == 'login') {
		return loginGetCode('');
	}
	else if (queryStringCode) {
		try {
			// WORKING
			const response = await fetch(urlSSOCode2Token, {
				method: 'POST',
				headers:{
				'Content-Type': 'application/x-www-form-urlencoded'
				},    
				body: new URLSearchParams({
					'client_id': jsonAzureB2C.client_id,
					'client_secret': jsonAzureB2C.client_secret,
					'code': queryStringCode,
					'grant_type': 'authorization_code'
				})
			});

			const result = await response.json();
			console.log( result );
			if ("id_token" in result) {
				token=decodeToken( result.id_token );
				console.log(token);
				if ("idp_access_token" in token) {
					console.log( token.idp_access_token );
					token_idp=decodeToken( String(token.idp_access_token) );
					console.log( token_idp );
					if ('family_name' in token_idp) {
						data['lastName'] = String(token_idp.family_name);
					}
					if ('given_name' in token_idp) {
						data['firstName'] = String(token_idp.given_name);
					}
					if ('unique_name' in token_idp) {
						data['email'] = String(token_idp.unique_name);
					}
				}
				else {
					if ('family_name' in token) {
						data['lastName'] = String(token.family_name);
					}
					if ('given_name' in token) {
						data['firstName'] = String(token.given_name);
					}
					if ('emails' in token) {
						data['email'] = String(token.emails);
					}
				}
			}
			else if ('error' in result && 'error_description' in result) {
				return json({ errors: result.error_description }, { status: 500 });
			}

			let retLogin = await loginAzureB2C(data['email'], data['firstName'], data['lastName']);
			if (!retLogin.ok) {
				return json({ errors:retLogin.error });
			}
	
			if (retLogin.userId == 0) {
				const data2 = setupAdminAccountFieldsFromMap(data) 
				const res = await setupAdminAccountSSOAzureB2C(data2);
				if (!res.ok){
					console.error( res.errors );
					return json({ data, errors: res.errors });
				}
				const headers = await createUserSession(res.userId);
				return redirect("/user/verify-email", { headers });
			}
			else {
				const headers = await createUserSession(retLogin.userId);
				return redirect("/", { headers });
			}		
		}
		catch (error) { 
			console.error('Error:', error); 
			return json({ errors:error });
		}
	}

	return json({ errors:'' });
};

// https://app.dts.ddev.site/sso/azure-b2c/callback
export default function SsoAzureB2cCallback() {
	const loaderData = useLoaderData<typeof loader>();

	if (loaderData.errors) {
		return <>
			<div>
				<h1>Error: received server error response</h1>
				<p>{ loaderData.errors }</p>
			</div>
			<div>
				<Link to="/setup/admin-account-sso">Setup using SSO</Link>
			</div>
		</>;
	}

	return (
	  <div>
		<p></p>
	  </div>
	);
}