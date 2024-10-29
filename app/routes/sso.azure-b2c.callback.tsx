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
	configSsoAzureB2C, 
	SSOAzureB2C
} from "~/util/config";

export const loader = authLoaderWithRole("ViewData", async (loaderArgs) => {
	const { user } = authLoaderGetAuth(loaderArgs);
	const jsonAzureB2C:SSOAzureB2C = configSsoAzureB2C();
	const ssoAzureUserFlow = 'B2C_1_UN_UNDRR_SIGNUP_SIGNIN';
	const urlSSO = 'https://' + jsonAzureB2C.tenant + '.b2clogin.com/' + jsonAzureB2C.tenant + '.onmicrosoft.com/oauth2/v2.0/authorize?p='+ ssoAzureUserFlow +'&client_id='+ jsonAzureB2C.client_id +'&nonce=defaultNonce&redirect_uri='+ encodeURIComponent( jsonAzureB2C.redirect_url ) +'&scope=openid+email&response_type=code&prompt=login';
	const url = new URL(loaderArgs.request.url);

	
	console.log( url.searchParams.get('code') );
	

	return json({ message: `Hello ${user.email}`, urlSSO:urlSSO, });
});

export default function SsoAzureB2cCallback() {
	const loaderData = useLoaderData<typeof loader>();

	console.log( loaderData.urlSSO );

	return (
	  <div>
		STEP 1: <Link to={ loaderData.urlSSO }>{ loaderData.urlSSO }</Link>
	  </div>
	);
}
