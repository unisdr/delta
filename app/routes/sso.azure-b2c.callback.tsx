import {
	json,
	redirect
} from "@remix-run/node";

import { 
	useLoaderData,
	Link
 } from "@remix-run/react";

import {
	authLoaderGetAuth,
	authLoaderWithRole
} from "~/util/auth";

import { 
	configSsoAzureB2C 
} from "~/util/config";

import { SSOAzureB2C as interfaceSSOAzureB2C} from "~/util/ssoauzeb2c";

import {
	logiStep1GetCode
} from "~/util/ssoauzeb2c"

export const loader = authLoaderWithRole("ViewData", async (loaderArgs) => {
	const { user } = authLoaderGetAuth(loaderArgs);
	const jsonAzureB2C:interfaceSSOAzureB2C = configSsoAzureB2C();
	const ssoAzureUserFlow = 'B2C_1_UN_UNDRR_SIGNUP_SIGNIN';
	const urlSSO = 'https://' + jsonAzureB2C.tenant + '.b2clogin.com/' + jsonAzureB2C.tenant + '.onmicrosoft.com/oauth2/v2.0';
	const urlSSOLogin= urlSSO + '/authorize?p='+ ssoAzureUserFlow +'&client_id='+ jsonAzureB2C.client_id +'&nonce=defaultNonce&redirect_uri='+ encodeURIComponent( jsonAzureB2C.login_redirect_url ) +'&scope=openid+email&response_type=code&prompt=login';
	const urlSSOCode2Token = urlSSO + '/token?p='+ ssoAzureUserFlow;
	const url = new URL(loaderArgs.request.url);
	const code = url.searchParams.get('code') || '';

	// https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch
	//// Code is working
	// if (code) {
	// 	try {
	// 		const response = await fetch(urlSSOCode2Token, {
	// 			method: 'POST',
	// 			headers:{
	// 			'Content-Type': 'application/x-www-form-urlencoded'
	// 			},    
	// 			body: new URLSearchParams({
	// 				'client_id': jsonAzureB2C.client_id,
	// 				'client_secret': jsonAzureB2C.client_secret,
	// 				'code': code,
	// 				'grant_type': 'authorization_code'
	// 			})
	// 		});

	// 		const result = await response.json();
	// 		console.log( result );
	// 	}
	// 	catch (error) { 
	// 		console.error('Error:', error); 
	// 	}
	// }

	console.log(logiStep1GetCode());
	
	// console.log( url.searchParams.get('code') );
	

	return json({ message: `Hello ${user.email}`, urlSSOLogin:urlSSOLogin, code:code });
});

// http://dts.ddev.site:3000/sso/azure-b2c/callback
// https://app.dts.ddev.site/sso/azure-b2c/callback
export default function SsoAzureB2cCallback() {
	const loaderData = useLoaderData<typeof loader>();

	return (
	  <div>
		<p>STEP 1: <Link to={ loaderData.urlSSOLogin }>{ loaderData.urlSSOLogin }</Link></p>
		<p>STEP 2x: { loaderData.code }</p>
	  </div>
	);
}
/**
 * https://app.dts.ddev.site/sso/azure-b2c/callback/?error=redirect_uri_mismatch&error_description=AADB2C90006%3a+The+redirect+URI+%27http%3a%2f%2fdts.ddev.site%3a3000%2fsso%2fazure-b2c%2fcallback%27+provided+in+the+request+is+not+registered+for+the+client+id+%279d907c9b-edb6-4969-9460-c683b1845eb7%27.%0d%0aCorrelation+ID%3a+19f167f7-e5d5-4422-bb72-7d352351795e%0d%0aTimestamp%3a+2024-10-29+12%3a18%3a30Z%0d%0a
 */