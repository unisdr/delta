import { json, redirect } from "@remix-run/react";

/**
 * Get the Application URL.
 * 
  * @returns array of string
 */
export function configSiteURL(): string {
    const value = process.env.WEBSITE_URL || 'http://localhost:3000';
    return value;
};

/**
 * Get the Application Name.
 * 
 * @param value 
 * @returns string
 */
export function configSiteName(): string {
    const value = process.env.WEBSITE_NAME || 'Disaster Losses Tracking System';
    return value;
};

export interface SSOAzureB2C {
	client_id: string;
	client_secret: string;
    redirect_url: string;
    tenant: string;
}

export function configSsoAzureB2C(): SSOAzureB2C {
    const data:SSOAzureB2C = { 
        client_id: _configSsoAzureB2ClientID(), 
        client_secret: _configSsoAzureB2ClientSecret(),
        redirect_url: _configSsoAzureB2CRedirectURL(),
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

function _configSsoAzureB2CRedirectURL(): string {
    const value = process.env.SSO_AZURE_B2C_CLIENT_REDIRECT_URL || '';
    return value;
};

function _configSsoAzureB2CTenant(): string {
    const value = process.env.SSO_AZURE_B2C_TENANT || '';
    return value;
};
