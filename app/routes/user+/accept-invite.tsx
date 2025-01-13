import {
	ActionFunctionArgs,
	json,
	LoaderFunctionArgs,
	redirect
} from "@remix-run/node";
import {
	useActionData,
	useLoaderData,
} from "@remix-run/react";
import { Link } from "react-router-dom";
import {
	Form,
	Field,
	SubmitButton,
	FieldErrors,
} from "~/frontend/form";
import { formStringData } from "~/util/httputil";
import {
	createUserSession
} from "~/util/session";
import { 
	configSsoAzureB2C,
	configAuthSupportedAzureSSOB2C
} from "~/util/config";
import { 
	SSOAzureB2C as interfaceSSOAzureB2C, 
	baseURL,
	decodeToken,
	loginGetCode
} from "~/util/ssoauzeb2c";
import {
	acceptInvite,
	AcceptInviteFieldsFromMap,
	validateInviteCode,
} from "~/backend.server/models/user"
import {
	setupAccountSSOAzureB2C,
	setupAdminAccountFieldsFromMap,
	loginAzureB2C,
	registerAzureB2C,
} from "~/backend.server/models/user";
import { MainContainer } from "~/frontend/container";

export const loader = async ({request}:LoaderFunctionArgs) => {
	const jsonAzureB2C:interfaceSSOAzureB2C = configSsoAzureB2C();
	const confAuthSupportedAzureSSOB2C:boolean = configAuthSupportedAzureSSOB2C();
	const urlSSOCode2Token = `${ baseURL() }/token?p=${ jsonAzureB2C.login_userflow }`;
	const url = new URL(request.url);
	const inviteCode = url.searchParams.get("inviteCode") || "";
	const sso = url.searchParams.get("sso") || "";
	const action = url.searchParams.get("action") || "";
	const state = url.searchParams.get("state") || "";
	const queryStringCode = url.searchParams.get("code") || "";
	const res = await validateInviteCode(inviteCode);

	let data: { [key: string]: string } = { email:'', password:'', firstName:'', lastName:'' };
	let token:object = {};
	let token_idp:object = {};

	if ( action == 'sso_azure_b2c' ) {
		return loginGetCode(inviteCode);
	}

	if ( state && queryStringCode ) {
		console.log( state );
		console.log( decodeURI(state) );
		console.log( decodeURIComponent(state) );
		console.log( encodeURIComponent(state) );
		console.log( '' );

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
					'grant_type': 'authorization_code',
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
				return json({ 
					errors: result.error_description, 
					inviteCode: '', inviteCodeValidation: { ok: false, error: '' },
					confAuthSupportedAzureSSOB2C: confAuthSupportedAzureSSOB2C,
				}, { status: 500 });
			}

			let retLogin = await registerAzureB2C(data['email'], data['firstName'], data['lastName']);
			if (!retLogin.ok) {
				return json({ 
					errors:retLogin.error, 
					inviteCode: '', 
					inviteCodeValidation: { ok: false, error: '' },
					confAuthSupportedAzureSSOB2C: confAuthSupportedAzureSSOB2C,
				});
			}

			const headers = await createUserSession(retLogin.userId);
			return redirect("/", { headers });
		}
		catch (error) { 
			console.error('Error:', error); 
			return json({ 
				errors:error, 
				inviteCode: '', 
				inviteCodeValidation: { ok: false, error: '' },
				confAuthSupportedAzureSSOB2C: confAuthSupportedAzureSSOB2C,
			});
		}
	
	}


	return json({
		inviteCode: inviteCode,
		sso: sso,
		inviteCodeValidation: res,
		code: queryStringCode,
		state: state,
		confAuthSupportedAzureSSOB2C: confAuthSupportedAzureSSOB2C,
	});
};

export const action = async ({ request }: ActionFunctionArgs) => {
	const data = formStringData(await request.formData());
	const inviteCode = data["inviteCode"] || "";
	const data2 = AcceptInviteFieldsFromMap(data) 
	const res = await acceptInvite(inviteCode, data2);
	if (!res.ok){
		return json({ data, errors: res.errors });
	}
	const headers = await createUserSession(res.userId);
	return redirect("/", { headers });
};

export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();
	const inviteCode = loaderData.inviteCode;
	const actionData = useActionData<typeof action>();

	const errors = actionData?.errors
	const data = actionData?.data

	if (!loaderData.inviteCodeValidation.ok) {
		return (
			<>
			<p>{loaderData.inviteCodeValidation.error}</p>
			</>
		)
		
	}

	return (
		<MainContainer title="Accept invite">
		<>
			<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.</p>
			<p>* Required information</p>
			<Form className="dts-form dts-form--vertical" errors={errors}>
				<div className="dts-form-component">
					<input name="inviteCode" type="hidden" defaultValue={inviteCode}></input>
					<Field label="First name *">
						<input type="text" name="firstName" defaultValue={data?.firstName}></input>
						<FieldErrors errors={errors} field="firstName"></FieldErrors>
					</Field>
					<Field label="Last name">
						<input type="text" name="lastName" defaultValue={data?.lastName}></input>
						<FieldErrors errors={errors} field="lastName"></FieldErrors>
					</Field>
					<Field label="Password *">
						<input type="password" name="password" defaultValue={data?.password}></input>
						<FieldErrors errors={errors} field="password"></FieldErrors>
					</Field>
					<Field label="Repeat password *">
						<input type="password" name="passwordRepeat" defaultValue={data?.passwordRepeat}></input>
						<FieldErrors errors={errors} field="passwordRepeat"></FieldErrors>
					</Field>
					<SubmitButton label="Setup account"></SubmitButton>
				</div>
			</Form>
			<p>&nbsp;</p>
			<div>
				
				{
					loaderData.confAuthSupportedAzureSSOB2C ? 
						<Link to={ `/user/accept-invite?inviteCode=${inviteCode}&sso=sso_azure_b2c&action=sso_azure_b2c` }>
							Complete the registration by logging-in using Azure B2C SSO</Link>
					: ''
				}
			</div>
		</>
		</MainContainer>
	);
}


