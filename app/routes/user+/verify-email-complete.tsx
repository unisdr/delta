import { MetaFunction } from "@remix-run/node";

import {
	authLoaderGetAuth,
	authActionWithPerm,
	authLoaderWithPerm,
	authActionGetAuth,
} from "~/util/auth";

import { useLoaderData } from "@remix-run/react";

import { redirect } from "@remix-run/node";

import { sendEmail } from "~/util/email";


import {processHipsPage} from "~/backend.server/utils/hip";
import {processSectorCsv} from "~/backend.server/utils/sector";
import {processCategoryCsv} from "~/backend.server/utils/category";
import {processAssetCsv} from "~/backend.server/utils/asset";
import { getInstanceSystemSettings } from "~/backend.server/models/instanceSystemSettingDAO";

export const meta: MetaFunction = (request) => {
	// Extract the query string
	const queryString = request.location.search;

	// Parse the query string using URLSearchParams
	const params = new URLSearchParams(queryString) || "";;

	// Access the individual query parameters
	const step = params.get('step') || "";
	let intStep:number = 0;

	if (typeof step == 'string' && (step == '' || step == '0')) {
		intStep = 1;
	}
	else if (typeof step == 'string' && parseInt(step) >= 1 && parseInt(step) <= 4) {
		intStep = parseInt(step);
		intStep++;
	} 
	else if (typeof step == 'string' && parseInt(step) >= 5) {
		intStep = 5;
	} 

	return [
		{ title: "System Taxonomy - DTS"},
		{ name: "description", content: "Admin setup - System Taxonomy page." },
		{ httpEquiv:"refresh", content: `10; URL='/user/verify-email-complete?step=${intStep}'` },
	];
};

export const action = authActionWithPerm("ViewUsers", async (actionArgs) => {
	const { user } = authActionGetAuth(actionArgs);

	const settings= await getInstanceSystemSettings();
	if(!settings){
		throw new Response ("System settings cannot be found.",{status:500})
	}
	
	var countryName='';
	if(settings){
		countryName=settings.countryName;
	}
	
	//Send confirmation email
	const subject = `Welcome to DTS ${settings.websiteName}`;
	const siteURL = settings.websiteUrl;
	const html = `
    <p>
      Dear ${user.firstName} ${user.lastName},
    </p>
    <p>
      Welcome to the DTS ${countryName} system. Your user account has been successfully created.
    </p>
    <p>
      Click the link below to access your account:
    </p>
    <p>
      <a href="${siteURL}/settings/access-mgmnt" 
         style="display: inline-block; padding: 10px 20px; font-size: 16px; color: #ffffff; 
         background-color: #007BFF; text-decoration: none; border-radius: 5px;">
        Access My Account
      </a>
    </p>
    <p>
      If the button above does not work, copy and paste the following URL into your browser:
      <br>
      <a href="${siteURL}/settings/access-mgmnt">${siteURL}/settings/access-mgmnt</a>
    </p>
  `;

	const text = `Dear ${user.firstName} ${user.lastName}
                Welcome to the DTS ${countryName} system. Your user account has been successfully created.
                Copy and paste the following link into your browser URL to access your account:
                ${siteURL}/settings/access-mgmnt" 
                `;
	await sendEmail(user.email, subject, text, html);

	return redirect("/settings/access-mgmnt");
});

export const loader = authLoaderWithPerm("ViewUsers", async (loaderArgs) => {
	authLoaderGetAuth(loaderArgs);
	const url = new URL(loaderArgs.request.url);
	let qsStep = url.searchParams.get("step") || "";

	if (qsStep == '1') {
		try {
			await processAssetCsv();
		} catch (err) {
			console.error(String(err));
		}
	}
	else if (qsStep == '2') {
		
		try {
			await processCategoryCsv();
		} catch (err) {
			console.error(String(err));
		}
	}
	else if (qsStep == '3') {
		try {
			await processHipsPage(1);
		} catch (err) {
			console.error(String(err));
		}
	}
	else if (qsStep == '4') {
		try {
			await processSectorCsv();
		} catch (err) {
			console.error(String(err));
		}
	}
	
	var siteName="Disaster Losses Tracking System";
	const settings = await getInstanceSystemSettings();
	if(settings){
		siteName=settings.websiteName
	}
	return {
		configSiteName: siteName,
		qsStep: qsStep,
	};
});

export default function Data() {
	const pageData = useLoaderData<typeof loader>();
	let isSubmitting=false;

	return (
		<div className="dts-page-container">
			<main className="dts-main-container">
				<div className="mg-container">
					<form
						action="/user/verify-email-complete?step=5"
						className="dts-form dts-form--vertical"
						method="post"
					>
						<div className="dts-form__header">
							<span>&nbsp;</span>
						</div>
						<div className="dts-form__intro">
							<div className="dts-form__additional-content dts-form__additional-content--centered">
								{ pageData.qsStep && (parseInt(pageData.qsStep) < 5 || pageData.qsStep == '') && (<>
									<h1 className="dts-heading-1">Welcome to { pageData.configSiteName }</h1>
									<div>Setting up the system.</div>
									<div>Do not close this window. This can take a while.</div>
								</>)}

								{ pageData.qsStep && parseInt(pageData.qsStep) == 5 && (<>
									<h1 className="dts-heading-1">System setup complete</h1>
									<div>Click the button below to continue.</div>
								</>)}
							</div>
						</div>
						<div className="dts-form__body">
							<div className="dts-form-component">
								{ pageData.qsStep && parseInt(pageData.qsStep) >= 0 && parseInt(pageData.qsStep) < 5 && (
									<p>1 of 4: Installing Assets taxonomy {' '}
										{ parseInt(pageData.qsStep) >= 1 ?
											<>complete</>
											:
											<>starting</>
										}
									</p>
								)}
								{ pageData.qsStep && parseInt(pageData.qsStep) >= 1 && parseInt(pageData.qsStep) < 5 && (
									<p>2 of 4: Installing Categories taxonomy {' '}
										{ parseInt(pageData.qsStep) >= 2 ?
											<>complete</>
											:
											<>starting</>
										}
									</p>
								)}
								{ pageData.qsStep && parseInt(pageData.qsStep) >= 2 && parseInt(pageData.qsStep) < 5 && (
									<p>3 of 4: Installing Hazard Information Profile taxonomy {' '}
										{ parseInt(pageData.qsStep) >= 3 ?
											<>complete</>
											:
											<>starting</>
										}
									</p>
								)}
								{ pageData.qsStep && parseInt(pageData.qsStep) >= 3 && parseInt(pageData.qsStep) < 5 && (
									<p>4 of 4: Installing Sectors taxonomy {' '}
										{ parseInt(pageData.qsStep) >= 4 ?
											<>complete</>
											:
											<>starting</>
										}
									</p>
								)}
							</div>
						</div>
						{ pageData.qsStep && parseInt(pageData.qsStep) == 5 && (
							<div className="dts-form__actions">
								<button
									type="submit"
									className="mg-button mg-button-primary"
									disabled={
										typeof window !== "undefined"
											? isSubmitting
											: undefined
									}
								>
									Get started
								</button>
							</div>
						)}
					</form>
				</div>
			</main>
		</div>
	);
}
