import type { MetaFunction } from '@remix-run/node';

import { Link } from "react-router-dom";
import { useLoaderData, } from "@remix-run/react";
import { configAuthSupportedAzureSSOB2C} from "~/util/config";
import { FaExclamationTriangle } from "react-icons/fa";
import { checkValidCurrency } from "~/util/currency";
import { getInstanceSystemSettings } from '~/db/queries/instanceSystemSetting';

export const action = async () => {
	return (null);
}

// Function to validate required environment variables
function validateRequiredEnvVars(websiteLogo:string,websiteName:string,websiteUrl:string,dtsInstanceType:string,dtsInstanceCrtyIso3:string,currencyCodes:string) {
	const errors: { variable: string; message: string }[] = [];
	
	// Check WEBSITE_LOGO
	if (!websiteLogo) {
		errors.push({
			variable: 'WEBSITE_LOGO',
			message: 'Website logo URL is missing'
		});
	}
	
	// Check WEBSITE_NAME
	if (!websiteName) {
		errors.push({
			variable: 'WEBSITE_NAME',
			message: 'Website name is missing'
		});
	}
	
	// Check WEBSITE_URL
	if (!websiteUrl) {
		errors.push({
			variable: 'WEBSITE_URL',
			message: 'Website URL is missing'
		});
	} else if (!websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
		errors.push({
			variable: 'WEBSITE_URL',
			message: 'Website URL must start with http:// or https://'
		});
	}
	
	// Check DATABASE_URL
	if (!process.env.DATABASE_URL) {
		errors.push({
			variable: 'DATABASE_URL',
			message: 'Database connection string is missing'
		});
	} else if (!process.env.DATABASE_URL.startsWith('postgresql://')) {
		errors.push({
			variable: 'DATABASE_URL',
			message: 'Database connection string is invalid (must be PostgreSQL)'
		});
	}
	
	// Check if the database URL contains invalid characters or paths
	if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('?host=/var/run/postgresql/')) {
		errors.push({
			variable: 'DATABASE_URL',
			message: 'Database connection string contains invalid Unix socket path. Please use a standard PostgreSQL connection string format.'
		});
	}
	
	// Check SESSION_SECRET
	if (!process.env.SESSION_SECRET) {
		errors.push({
			variable: 'SESSION_SECRET',
			message: 'Session secret is missing'
		});
	} else if (process.env.NODE_ENV === 'production' && process.env.SESSION_SECRET === 'not-random-dev-secret') {
		errors.push({
			variable: 'SESSION_SECRET',
			message: 'Session secret is using default value in production'
		});
	}
	
	// Check EMAIL_TRANSPORT and related settings
	if (!process.env.EMAIL_TRANSPORT) {
		errors.push({
			variable: 'EMAIL_TRANSPORT',
			message: 'Email transport configuration is missing'
		});
	} else if (process.env.EMAIL_TRANSPORT === 'smtp') {
		// Check required SMTP settings when SMTP transport is selected
		if (!process.env.SMTP_HOST) {
			errors.push({
				variable: 'SMTP_HOST',
				message: 'SMTP host is required when using SMTP transport'
			});
		}
		if (!process.env.SMTP_PORT) {
			errors.push({
				variable: 'SMTP_PORT',
				message: 'SMTP port is required when using SMTP transport'
			});
		}
		if (!process.env.SMTP_USER) {
			errors.push({
				variable: 'SMTP_USER',
				message: 'SMTP username is required when using SMTP transport'
			});
		}
		if (!process.env.SMTP_PASS) {
			errors.push({
				variable: 'SMTP_PASS',
				message: 'SMTP password is required when using SMTP transport'
			});
		}
	}
	
	// Check EMAIL_FROM
	if (!process.env.EMAIL_FROM) {
		errors.push({
			variable: 'EMAIL_FROM',
			message: 'Email sender address is missing'
		});
	} else if (!process.env.EMAIL_FROM.includes('@') || !process.env.EMAIL_FROM.includes('.')) {
		errors.push({
			variable: 'EMAIL_FROM',
			message: 'Email sender address appears to be invalid'
		});
	}
	
	// Check DTS_INSTANCE_TYPE
	if (!dtsInstanceType) {
		errors.push({
			variable: 'DTS_INSTANCE_TYPE',
			message: 'DTS instance type is missing'
		});
	} else if (dtsInstanceType !== 'country' && dtsInstanceType !== 'undrr') {
		errors.push({
			variable: 'DTS_INSTANCE_TYPE',
			message: 'DTS instance type must be either "country" or "undrr"'
		});
	}
	
	// Check DTS_INSTANCE_CTRY_ISO3
	if (!dtsInstanceCrtyIso3) {
		errors.push({
			variable: 'DTS_INSTANCE_CTRY_ISO3',
			message: 'Country ISO3 code is missing'
		});
	} else {
		// Check if ISO3 is valid (3 uppercase letters)
		const iso3Regex = /^[A-Z]{3}$/;
		if (!iso3Regex.test(dtsInstanceCrtyIso3)) {
			errors.push({
				variable: 'DTS_INSTANCE_CTRY_ISO3',
				message: 'Country ISO3 code must be 3 uppercase letters (e.g., USA, GBR, JPN)'
			});
		}
	}
	
	// Check CURRENCY_CODES
	if (!currencyCodes) {
		errors.push({
			variable: 'CURRENCY_CODES',
			message: 'Currency code is missing'
		});
	} else {
		// Split by comma in case multiple currencies are provided
		const currencies = dtsInstanceCrtyIso3.split(',').map(c => c.trim());
		for (const currency of currencies) {
			if (!checkValidCurrency(currency)) {
				errors.push({
					variable: 'CURRENCY_CODES',
					message: `Currency code "${currency}" is not a valid ISO 4217 currency code`
				});
			}
		}
	}
	
	// Check AUTHENTICATION_SUPPORTED
	if (!process.env.AUTHENTICATION_SUPPORTED) {
		errors.push({
			variable: 'AUTHENTICATION_SUPPORTED',
			message: 'Authentication methods configuration is missing'
		});
	}
	
	// Check SSO configuration if enabled
	if (configAuthSupportedAzureSSOB2C()) {
		if (!process.env.SSO_AZURE_B2C_TENANT) {
			errors.push({
				variable: 'SSO_AZURE_B2C_TENANT',
				message: 'Azure B2C tenant is required when SSO is enabled'
			});
		}
		if (!process.env.SSO_AZURE_B2C_CLIENT_ID) {
			errors.push({
				variable: 'SSO_AZURE_B2C_CLIENT_ID',
				message: 'Azure B2C client ID is required when SSO is enabled'
			});
		}
		if (!process.env.SSO_AZURE_B2C_CLIENT_SECRET) {
			errors.push({
				variable: 'SSO_AZURE_B2C_CLIENT_SECRET',
				message: 'Azure B2C client secret is required when SSO is enabled'
			});
		}
	}
	
	return errors;
}

export const loader = async () => {
	console.log("NODE_ENV", process.env.NODE_ENV);
	const settings = await getInstanceSystemSettings();
	let websiteLogo='https://rawgit.com/PreventionWeb/templates/master/dts/dist/assets/images/dldt-logo-mark.svg';
	let websiteName="Disaster Losses Tracking System";
	let websiteUrl='http://localhost:3000';
	let dtsInstanceType='country'
	let dtsInstanceCrtyIso3="";
	let currencyCodes="PHP"


	if(settings){
		websiteLogo=settings.websiteLogo;
		websiteName=settings.websiteName;
		websiteUrl=settings.websiteUrl;
		dtsInstanceType=settings.dtsInstanceType;
		dtsInstanceCrtyIso3=settings.dtsInstanceCtryIso3;
		currencyCodes=settings.currencyCodes;

	}
	
	// Validate required environment variables
	const configErrors = validateRequiredEnvVars(websiteLogo,websiteName,websiteUrl,dtsInstanceType,dtsInstanceCrtyIso3,currencyCodes);
	
	// Test database connection before proceeding
	if (process.env.DATABASE_URL) {
		try {
			// We're not actually testing the connection here to avoid dependencies,
			// but in a real implementation, you would add a simple connection test
			// For example: await db.$queryRaw`SELECT 1`;
			
			// If there are known connection issues based on the URL format, add them to errors
			if (process.env.DATABASE_URL.includes('/var/run/postgresql/')) {
				configErrors.push({
					variable: 'DATABASE_URL',
					message: 'Windows systems cannot connect to Unix socket paths. Please use a standard PostgreSQL connection string.'
				});
			}
		} catch (error) {
			console.error('Database connection error:', error);
			configErrors.push({
				variable: 'DATABASE_URL',
				message: 'Could not connect to the database. Please check your connection string.'
			});
		}
	}
	
	// Add a message about the number of configuration errors
	if (configErrors.length > 0) {
		console.warn(`Found ${configErrors.length} configuration errors that need to be fixed before proceeding with setup.`);
	}
	
	

	
	return ({
		configSiteName: websiteName,
		confAuthSupportedAzureSSOB2C: configAuthSupportedAzureSSOB2C(),
		configErrors
	});
};

export const meta: MetaFunction = () => {
	return [
		{ title: "Welcome to admin setup - DTS" },
		{ name: "description", content: "Admin setup." },
	];
};

export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();
	const {configSiteName, configErrors} = loaderData;

	return (
		<>
			<div className="mg-container">
				<form className="dts-form dts-form--vertical">
					<div className="dts-form__header">
					<span>&nbsp;</span>
					</div>
					<div className="dts-form__intro">
						<h2 className="dts-heading-1">Welcome to the { configSiteName }.</h2>
						<p>Track disaster impacts, including damages, losses, and human effects, to support better recovery and resilience.</p>
					</div>
					
					{configErrors && configErrors.length > 0 ? (
						<div className="dts-form__body">
							<div style={{ 
								background: '#fff0f0', 
								border: '1px solid #ffcccc',
								borderRadius: '4px',
								padding: '16px',
								marginBottom: '20px' 
							}}>
								<div style={{ 
									display: 'flex', 
									alignItems: 'center', 
									marginBottom: '10px',
									color: '#cc0000',
									fontWeight: 'bold'
								}}>
									<FaExclamationTriangle style={{ marginRight: '8px' }} />
									System Configuration Errors
								</div>
								<p style={{ marginBottom: '10px' }}>
									The following required configuration variables are missing or have invalid values in your <code>.env</code> file:
								</p>
								<ul style={{ 
									listStyleType: 'disc', 
									paddingLeft: '20px',
									margin: '0'
								}}>
									{configErrors.map((error, index) => (
										<li key={index} style={{ marginBottom: '5px' }}>
											<strong>{error.variable}</strong>: {error.message}
										</li>
									))}
								</ul>
								<p style={{ marginTop: '10px', marginBottom: '0' }}>
									Please update your <code>.env</code> file with the correct values before proceeding with the setup.
								</p>
							</div>
						</div>
					) : null}
					
					<div className="dts-form__actions">
						{configErrors && configErrors.length > 0 ? (
							<button 
								className="mg-button mg-button-primary" 
								disabled
								style={{ opacity: 0.6, cursor: 'not-allowed' }}
							>
								Set up account
							</button>
						) : (
							<Link to="/setup/admin-account" className="mg-button mg-button-primary">Set up account</Link>
						)}
						{
							loaderData.confAuthSupportedAzureSSOB2C && !(configErrors && configErrors.length > 0) ? 
								<Link className='mg-button mg-button-outline' to="/setup/admin-account-sso"
									style={{
										width: "100%", // Full width on small screens
										padding: "10px 20px", // Ensure consistent padding
										marginTop: "5px",
									}}
								>Set up account using SSO</Link>
								: ''
						}
					</div>
				</form>
			</div>
		</>
	);
}