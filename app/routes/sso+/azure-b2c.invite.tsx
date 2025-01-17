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


export const loader = async ({request}:LoaderFunctionArgs) => {
    const url = new URL(request.url);
    const inviteCode = url.searchParams.get("inviteCode") || "";
    const res = await validateInviteCode(inviteCode);
    let queryStringB2CInvite = encodeURIComponent('{ "inviteCode": "' + inviteCode + '", "action": "sso_azure_b2c-register" }');

    if (res.ok && res.userId > 0) {
        return loginGetCode( queryStringB2CInvite );
    }

    return json({ errors:'' });

};

export default function SsoAzureB2cCallback() {
    const loaderData = useLoaderData<typeof loader>();

    if (loaderData?.errors) {
        return <>
            <div>
                <h1>Error: received server error response</h1>
                <p>{ loaderData.errors }</p>
            </div>
        </>;
    }

    return (
      <div>
        <p></p>
      </div>
    );
}
