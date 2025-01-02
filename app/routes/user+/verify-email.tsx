import { useEffect, useState } from "react"; // Import useState and useEffect

import {
    json,
    ActionFunctionArgs,
    MetaFunction
} from "@remix-run/node";

import {
    authLoader,
    authLoaderGetAuth,
    authAction,
    authActionGetAuth,
    authLoaderAllowUnverifiedEmail,
    authActionAllowUnverifiedEmail
} from "~/util/auth";

import {
        useLoaderData,
        useActionData,
        Link
} from "@remix-run/react";

import {
    verifyEmail
} from "~/backend.server/models/user";

import { formStringData } from "~/util/httputil";

import {
	errorToString
} from "~/frontend/form"

export const meta: MetaFunction = () => {
    return [
      { title: "Account Setup Email Verification - DTS" },
      { name: "description", content: "Admin setup." },
    ];
};

import {
    redirect
} from "@remix-run/node";

import {
    Form,
    Field,
    FieldErrors,
    SubmitButton,
} from "~/frontend/form"

import { formatTimestamp } from "~/util/time";

export const action = authActionAllowUnverifiedEmail(async (actionArgs) => {
    const { request } = actionArgs;
    const { user } = authActionGetAuth(actionArgs);
    const data = formStringData(await request.formData());
    const code = data.code || "";
    const userId = user.id
    const res = await verifyEmail(userId, code);
    if (!res.ok){
        return json({ data, errors: res.errors });
    }
    return redirect("/");
});

export const loader = authLoaderAllowUnverifiedEmail(async (loaderArgs) => {
    const { user } = authLoaderGetAuth(loaderArgs)
    return json({
        userEmail: user.email,
        // passing this as date does not work in remix, the type of data received is string on the other end
        // set it explicitly to string here so the type matches
        sentAt: user.emailVerificationSentAt
    });
});

export default function Data() {
    const pageData = useLoaderData<typeof loader>();

    const actionData = useActionData<typeof action>();
    const errors = actionData?.errors
    const data = actionData?.data

    // State to manage the enable/disable state of the submit button
    const [isButtonDisabled, setIsButtonDisabled] = useState(false); // Initialize as true to disable when JS is enabled

    useEffect(() => {
        // Disable the button when JS is enabled
        setIsButtonDisabled(true);
    }, []); // Empty dependency array ensures this runs only once on mount

    return (
        <div className="dts-page-container">
            <main className="dts-main-container">
                <div className="mg-container">
                    <form action="/user/verify-email" className="dts-form dts-form--vertical" method="post">
                        <div className="dts-form__header">
                            {/* Update the href to point to the admin-account route */}
                            <a href="/setup/admin-account" className="mg-button mg-button--small mg-button-system">
                                Back
                            </a>
                            <span>Disaster Tracking System</span>
                        </div>
                        <div className="dts-form__intro">
                            <h2 className="dts-heading-1">Enter code we sent to you at</h2>
                            <p>{pageData.userEmail}</p>
                            {pageData.sentAt ? (
                                        <p>A one-time password has been sent to your email on {formatTimestamp(pageData.sentAt)}.</p>
                            ) : null}
                        </div>
                        <div className="dts-form__body">
                            <div className="dts-form-component">
                                <label>
                                    <div className="dts-form-component__label">
                                        <span className="mg-u-sr-only">OTP code</span>
                                    </div>
                                    <input type="text" minLength={6} maxLength={6} name="code" placeholder="Enter OTP code*" autoFocus required  style={errors ? { border: "2px solid red" } : {}}/>
                                </label>
                                {errors && errors.fields && errors.fields.code && errors.fields.code.length > 0 && (
                                  <div style={{ color: "red", marginTop: "8px" }}>{errorToString(errors.fields.code[0])}</div>
                                )}
                            </div>
                            <div className="dts-form__additional-content dts-form__additional-content--centered">
                                <div>Code expires in 30:00</div>
                                <button type="button" className="mg-button mg-button--small mg-button-ghost">Send again</button>
                            </div>
                        </div>
                        <div className="dts-form__actions">
                            <button type="submit" className="mg-button mg-button-primary" >Complete account setup</button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}

