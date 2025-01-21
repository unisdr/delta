
/**
 * See Remix documentaion on how to handle environment variables
 * depending on the hosting platform: 
 * https://remix.run/docs/en/main/guides/envvars
 */
import {SSOAzureB2C as interfaceSSOAzureB2C} from "~/util/ssoauzeb2c";
import { stringToBoolean } from "~/util/string";

/**
 * Get the Website URL.
 */
export function configSiteURL(): string {
	const value = process.env.WEBSITE_URL || 'http://localhost:3000';
	return value;
};

/**
 * Get the Website Name.
 */
export function configSiteName(): string {
	const value = process.env.WEBSITE_NAME || 'Disaster Losses Tracking System';
	return value + ' - DTS';
};

/**
 * Get the Country Name.
 */
export function configCountryName(): string {
	const value = process.env.COUNTRY_NAME || '';
	return value;
};

/**
 * Get the Website Logo Image URL.
 */
export function configSiteLogo(): string {
	// const value = process.env.WEBSITE_LOGO || '';

	//Temporary not to break the layout
	const value = process.env.WEBSITE_LOGO || 'https://rawgit.com/PreventionWeb/templates/master/dts/dist/assets/images/dldt-logo-mark.svg';
	return value;
};

export function configSsoAzureB2C(): interfaceSSOAzureB2C {
	const data: interfaceSSOAzureB2C = {
		client_id: _configSsoAzureB2ClientID(),
		client_secret: _configSsoAzureB2ClientSecret(),
		login_userflow: _configSsoAzureB2CLoginUserFlow(),
		login_redirect_url_admin: _configSsoAzureB2CLoginRedirectURLAdmin(),
		login_redirect_url: _configSsoAzureB2CLoginRedirectURL(),
		edit_userflow: _configSsoAzureB2CEditUserFlow(),
		edit_redirect_url: _configSsoAzureB2CEditRedirectURL(),
		reset_userflow: _configSsoAzureB2CResetUserFlow(),
		reset_redirect_url: _configSsoAzureB2CEditResetURL(),
		tenant: _configSsoAzureB2CTenant(),
	};

	return data;
};

function _configSsoAzureB2ClientID(): string {
	const value = process.env.SSO_AZURE_B2C_CLIENT_ID || '';
	return value;
};

function _configSsoAzureB2ClientSecret(): string {
	const value = process.env.SSO_AZURE_B2C_CLIENT_SECRET || '';
	return value;
};

function _configSsoAzureB2CLoginUserFlow(): string {
	const value = process.env.SSO_AZURE_B2C_USERFLOW_LOGIN || '';
	return value;
};

function _configSsoAzureB2CLoginRedirectURLAdmin(): string {
	const value = process.env.SSO_AZURE_B2C_USERFLOW_LOGIN_ADMIN_REDIRECT_URL || '';
	return value;
};

function _configSsoAzureB2CLoginRedirectURL(): string {
	const value = process.env.SSO_AZURE_B2C_USERFLOW_LOGIN_REDIRECT_URL || '';
	return value;
};

function _configSsoAzureB2CEditUserFlow(): string {
	const value = process.env.SSO_AZURE_B2C_USERFLOW_EDIT || '';
	return value;
};

function _configSsoAzureB2CEditRedirectURL(): string {
	const value = process.env.SSO_AZURE_B2C_USERFLOW_EDIT_REDIRECT_URL || '';
	return value;
};

function _configSsoAzureB2CResetUserFlow(): string {
	const value = process.env.SSO_AZURE_B2C_USERFLOW_RESET || '';
	return value;
};

function _configSsoAzureB2CEditResetURL(): string {
	const value = process.env.SSO_AZURE_B2C_USERFLOW_RESET_REDIRECT_URL || '';
	return value;
};

function _configSsoAzureB2CTenant(): string {
	const value = process.env.SSO_AZURE_B2C_TENANT || '';
	return value;
};

export function configApprovedRecordsArePublic(): boolean {
	const value = stringToBoolean( process.env.APPROVED_RECORDS_ARE_PUBLIC || "1" );
	return value;
};

/**
 * Get footer URL for Privacy policy.
 * @returns string | default value empty string
 */
export function configFooterURLPrivPolicy(): string {
	const value = process.env.FOOTER_URL_PRIVACY_POLICY || "";
	return value;
};

/**
 * Get footer URL for Terms and conditions.
 * @returns string | default value empty string
 */
export function configFooterURLTermsConds(): string {
	const value = process.env.FOOTER_URL_TERMS_CONDS || "";
	return value;
};


/**
 * Get configuration for supported autentication.
 * @returns array string[] | default value ['form']
 */
function _configAuthSupported(): string[] {
	const authAllowedArray = [ 'form', 'sso_azure_b2c' ];
	let value = process.env.AUTHENTICATION_SUPPORTED || "form";
	let valueArray = [];
	let returnArray:string[] = [];
	
	// remove spaces
	value = value.replace(/\s+/g, '');
	valueArray = value.split(",");

	valueArray.forEach(function(item, index) { 
		if ((authAllowedArray.indexOf(item) !== -1) == false) {
			console.log('Authentication configuration (.env): ' + item + ' is invalid.'); 
		}
		else {
			returnArray.push(item);
		}
	});

	// if all configs are wrong, default to form.
	if (returnArray.length == 0) {
		returnArray.push('form');
	}

	return returnArray;
};

/**
 * Check form authentication is supported.
 * @returns boolean | default is false.
 */
export function configAuthSupportedForm(): boolean {
	let value = false;
	const authArraySupported = _configAuthSupported();

	value = authArraySupported.indexOf('form') !== -1;

	return value;
}

/**
 * Check azue_sso_b2c authentication is supported.
 * @returns boolean | default is false.
 */
export function configAuthSupportedAzureSSOB2C(): boolean {
	let value = false;
	const authArraySupported = _configAuthSupported();

	value = authArraySupported.indexOf('sso_azure_b2c') !== -1;

	return value;
}