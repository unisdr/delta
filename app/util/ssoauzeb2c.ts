import { jwtDecode } from "jwt-decode";
import { redirect } from "@remix-run/node";

import { 
	configSsoAzureB2C, 
} from "~/util/config";

export interface SSOAzureB2C {
	client_id: string;
	client_secret: string;
	login_userflow: string;
	login_redirect_url: string;
	login_redirect_url_admin: string;
	edit_userflow: string;
	edit_redirect_url: string;
	reset_userflow: string;
	reset_redirect_url: string;
	tenant: string;
}

type SSOAzureB2CErrorType = {
    error: string;
    error_description: string;
}

export interface SSOAzureB2CLoginError extends SSOAzureB2CErrorType {
}

export function baseURL(): string {
    const jsonAzureB2C:SSOAzureB2C = configSsoAzureB2C();
    const baseURL = `https://${jsonAzureB2C.tenant}.b2clogin.com/${jsonAzureB2C.tenant}.onmicrosoft.com/oauth2/v2.0`;
    return baseURL;
}

/**
 * Get the Application Name.
 * 
 * @param value 
 * @returns string
 */
export function loginGetCode() {
    const jsonAzureB2C:SSOAzureB2C = configSsoAzureB2C();
    let redirectURL = jsonAzureB2C.login_redirect_url.trim();
    let scope = 'openid+email';
    redirectURL = encodeURIComponent(redirectURL);
    const url = `${baseURL()}/authorize?p=${jsonAzureB2C.login_userflow}&client_id=${jsonAzureB2C.client_id}&nonce=defaultNonce&redirect_uri=${redirectURL}&scope=${scope}&response_type=code&prompt=login`;

    return redirect(url, 302);
}

export function loginGetCodeAdmin() {
    const jsonAzureB2C:SSOAzureB2C = configSsoAzureB2C();
    let redirectURL = jsonAzureB2C.login_redirect_url_admin.trim();
    let scope = 'openid+email';
    redirectURL = encodeURIComponent(redirectURL);
    const url = `${baseURL()}/authorize?p=${jsonAzureB2C.login_userflow}&client_id=${jsonAzureB2C.client_id}&nonce=defaultNonce&redirect_uri=${redirectURL}&scope=${scope}&response_type=code&prompt=login`;

    return redirect(url, 302);
}

export function decodeToken(pToken:string) {
    const decoded = jwtDecode(pToken);

    return decoded;
}

export function editProfile(pRedirectURL:string) {
    const jsonAzureB2C:SSOAzureB2C = configSsoAzureB2C();
    const userFlow = 'B2C_1_UN_UNDRR_PROFILE_EDITING';
    let redirectURL = pRedirectURL.trim();
    redirectURL = encodeURIComponent(redirectURL);
    const url = `${baseURL()}/authorize?p=${userFlow}&client_id=${jsonAzureB2C.client_id}&nonce=defaultNonce&redirect_uri=${redirectURL}&scope=openid&response_type=code&prompt=none`;
    
}

export function passwordReset(pRedirectURL:string) {
    const jsonAzureB2C:SSOAzureB2C = configSsoAzureB2C();
    const userFlow = 'B2C_1_UN_UNDRR_PASSWORD_RESET';
    let redirectURL = pRedirectURL.trim();
    redirectURL = encodeURIComponent(redirectURL);
    const url = `${baseURL()}/authorize?p=${userFlow}&client_id=${jsonAzureB2C.client_id}&nonce=defaultNonce&redirect_uri=${redirectURL}&scope=openid&response_type=code&prompt=none`;
}

/*
B2C_1_UN_UNDRR_PASSWORD_RESET
https://unb2c.b2clogin.com/unb2c.onmicrosoft.com/oauth2/v2.0/authorize?p=B2C_1_UN_UNDRR_PASSWORD_RESET&client_id=b12b15b7-889a-41c5-a0bf-50b8d31a68a2&nonce=defaultNonce&redirect_uri=https%3A%2F%2Fdrupal-testing.undrr.org%2Flogin%2Foauth2%2Fauthentication%2Funb2c%2Fcallback&scope=openid&response_type=code&prompt=login


B2C_1_UN_UNDRR_PROFILE_EDITING
https://unb2c.b2clogin.com/unb2c.onmicrosoft.com/oauth2/v2.0/authorize?p=B2C_1_UN_UNDRR_PASSWORD_RESET&client_id=b12b15b7-889a-41c5-a0bf-50b8d31a68a2&nonce=defaultNonce&redirect_uri=https%3A%2F%2Fdrupal-testing.undrr.org%2Flogin%2Foauth2%2Fauthentication%2Funb2c%2Fcallback&scope=openid&response_type=code&prompt=login


B2C_1_UN_UNDRR_SIGNUP_SIGNIN
https://unb2c.b2clogin.com/unb2c.onmicrosoft.com/oauth2/v2.0/authorize?p=B2C_1_UN_UNDRR_SIGNUP_SIGNIN&client_id=b12b15b7-889a-41c5-a0bf-50b8d31a68a2&nonce=defaultNonce&redirect_uri=https%3A%2F%2Fdrupal-testing.undrr.org%2Flogin%2Foauth2%2Fauthentication%2Funb2c%2Fcallback&scope=openid&response_type=code&prompt=login
/** */