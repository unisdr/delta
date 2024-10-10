// import {
// 	Outlet,
// } from "@remix-run/react";

import {
	json
} from "@remix-run/node";

import type {
	ActionFunctionArgs
} from "@remix-run/node";

// import {
// 	Errors as FormErrors,
// } from "~/components/form"


import {
	authLoader,
	authLoaderGetAuth
} from "~/util/auth";

import {
		useLoaderData
} from "@remix-run/react";
import { Form as ReactForm } from "@remix-run/react";
// import { formStringData } from "~/util/httputil";

// interface FormFields {
// 	// authentication: string
// 	azure_sso_client_id: string
// 	// password: string
// }


export const action = async ({ request }: ActionFunctionArgs) => {
	const formData = await request.formData();
    const formAuthentication = formData.getAll("authentication[]");
    const azure_sso_client_id = formData.get("azure_sso_client_id")
    const azure_sso_client_secret = formData.get("azure_sso_client_secret")
    const azure_sso_redirect_url = formData.get("azure_sso_redirect_url")
	// const data: FormFields = {
	// 	azure_sso_client_id: azure_sso_client_id || "",
	// }
	console.log("form:", formAuthentication, azure_sso_client_id, azure_sso_client_secret, azure_sso_redirect_url)

	return json({ formAuthentication });
};

export const loader = authLoader(async (loaderArgs) => {
	const user = authLoaderGetAuth(loaderArgs)
	return json({ message: `Hello ${user.email}` });
});

export default function Settings() {
	const loaderData = useLoaderData<typeof loader>();
	console.log("loaderData", loaderData)
	const msg = loaderData.message

 return (
		<div>
			<p>{msg}</p>
			<h1>Settings</h1>
            <hr />

            <ReactForm method="post">
            
            
            <fieldset>
                <legend>Authentication:</legend>
                <div className="fields">
                    <label>
                        <input value="form" name="authentication[]" type="checkbox" />
                        Form 
                    </label>
                </div>
                <div className="fields">
                    <label>
                        <input value="azure_sso" name="authentication[]" type="checkbox" />
                        Azure SSO
                    </label>
                    <fieldset>
                        <div className="fields">
                            <label htmlFor="azure_sso_client_id">Client ID: </label>
                            <input defaultValue="" id="azure_sso_client_id" name="azure_sso_client_id" type="textbox" />
                        </div>
                        <div className="fields">
                            <label htmlFor="azure_sso_client_secret">Client Secret: </label>
                            <input defaultValue="" id="azure_sso_client_secret" name="azure_sso_client_secret" type="text" />
                        </div>
                        <div className="fields">
                            <label htmlFor="azure_sso_redirect_url">Redirect URL: </label>
                            <input defaultValue="" id="azure_sso_redirect_url" name="azure_sso_redirect_url" type="url" />
                        </div>
                    </fieldset>
                </div>
            </fieldset>

            <div className="form-buttons">
                <button>Submit</button>
            </div>
                

            </ReactForm>
		</div>
	);
}

