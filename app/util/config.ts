
/**
 * See Remix documentaion on how to handle environment variables
 * depending on the hosting platform: 
 * https://remix.run/docs/en/main/guides/envvars
 */
import {SSOAzureB2C as interfaceSSOAzureB2C} from "~/util/ssoauzeb2c";
import fs from 'fs/promises';
import path from 'path';

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

	valueArray.forEach(function(item) { 
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


/**
 * Retrieves the application's version from the package.json file.
 * 
 * This function reads the package.json file located in the current working directory,
 * parses its content, and extracts the version number specified in it.
 * 
 * @returns {Promise<string>} A promise that resolves to the version string of the application.
 * 
 * @example
 * 
 * const appVersion = await configApplicationVersion().then(version => {
 *   return version;
 * }).catch(error => {
 *   console.error('Error:', error);
 * });
 */
export async function configApplicationVersion(): Promise<string> {
	let returnValue:string = '';

	const currentDirectory = process.cwd;
  	const packageJsonPath = path.resolve(currentDirectory(), 'package.json');
	let fileString:string = '';
	let packageJson:any = {};

	// Read the file
	try {
		fileString = await fs.readFile(packageJsonPath, 'utf8');

		packageJson = JSON.parse(fileString);

		// Get the version number
		returnValue = packageJson.version;
	} catch (error) {
		console.error('Error reading file:', error);
		throw new Response('File not found', { status: 404 });
	}

	return returnValue;
};

/**
 * Application email settings from environment variables.
 * 
 * @returns An object containing email configuration details.
 */
export function configApplicationEmail() {
    return {
        /** Sender's email address */
        EMAIL_FROM: process.env.EMAIL_FROM || "",

        /** Email transport method (e.g., SMTP, SendGrid, etc.) */
        EMAIL_TRANSPORT: process.env.EMAIL_TRANSPORT || "",

        /** SMTP server hostname */
        SMTP_HOST: process.env.SMTP_HOST || "",

        /** SMTP server port */
        SMTP_PORT: process.env.SMTP_PORT || "",

        /** Indicates if SMTP should use a secure connection */
        SMTP_SECURE: process.env.SMTP_SECURE || "",
    };
}

