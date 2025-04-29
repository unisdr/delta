import { json, MetaFunction } from "@remix-run/node";

import {
	authLoaderGetAuth,
	authActionWithPerm,
	authLoaderWithPerm,
	authActionGetAuth,
} from "~/util/auth";

import { useLoaderData, useActionData } from "@remix-run/react";

import { verifyEmail } from "~/backend.server/models/user/verify_email";
import { sendEmailVerification } from "~/backend.server/models/user/verify_email";

import { formStringData } from "~/util/httputil";

import { errorToString } from "~/frontend/form";

import { redirect } from "@remix-run/node";

import { formatTimestamp } from "~/util/time";
import { sendEmail } from "~/util/email";
import {
	configCountryName,
	configSiteName,
	configSiteURL,
} from "~/util/config";

import React from "react";
import { useNavigate } from "@remix-run/react";
import { Hip, HipApi, upsertHip } from '~/backend.server/models/hip'
import fs from 'fs/promises';
import {parseCSV} from "~/util/csv"

import {
	SectorType,
	upsertRecord as upsertRecordSector,
  sectorById,
} from "~/backend.server/models/sector";

import {
	CategoryType,
	upsertRecord as upsertRecordCategory,
} from "~/backend.server/models/category";

import {AssetInsert as AssetType} from "~/drizzle/schema";


import {
	upsertRecord as upsertRecordAsset,
} from "~/backend.server/models/asset";

// Define the type for dynamic assetImportData
interface interfaceAssetData {
	apiImportId?: string;
	id?: string;
	sectors: number[];
	name: string;
	category?: string;
	isBuiltIn?: boolean;
	nationalId?: string;
	notes?: string;
}

async function processAssets() {
	const currentDirectory = process.cwd;
	let filePath = currentDirectory();
	let fileString:string = '';

	filePath = filePath + '/app/hips/assets.csv'; // Replace with your file path
	try {
		fileString = await fs.readFile(filePath, 'utf8');
	} catch (error) {
		console.error('Error reading file:', error);
		throw new Response('File not found', { status: 404 });
	}


	let all = await parseCSV(fileString);
	// console.log( all );
	console.log( all[1] );

	let item = all[1];
	let formRecord:AssetType = { 
		apiImportId: item[0],
		id: item[1],
		sectorIds: item[2],
		isBuiltIn: Boolean(item[3]),
		name: item[4],
		category: item[5],
		nationalId: item[6],
		notes: item[7],
	};
	
	// Use a dynamic object to store the assetImportData
	const assetImportData: { [key: string]: interfaceAssetData } = {};

	let xName:string = '';
	let xNameKey:string = '';
	let xSector:number = 0;

	// Example: Dynamically adding entries to the object
	function addAssetData(key: string, name: string, sectors: number[]) {
		assetImportData[key] = { name, sectors };
	}

	for (const [key, item] of all.entries()) {
		if (key !== 0) {
		xName = item[5].trim();
		xName = xName.charAt(0).toUpperCase() + xName.slice(1);
		xNameKey = xName.toLowerCase();
		xNameKey = xNameKey.replace(/[^a-zA-Z0-9]/g, '')
		
		xSector = Number(item[2]);

		if ( assetImportData[xNameKey] ) {
			if (!assetImportData[xNameKey].sectors.includes(xSector)) {
			assetImportData[xNameKey].sectors.push( xSector );
			}
		}
		else {
			addAssetData(xNameKey, xName, [xSector]);
			assetImportData[xNameKey].apiImportId = item[0];
			assetImportData[xNameKey].id = item[1];
			assetImportData[xNameKey].isBuiltIn = true;
			assetImportData[xNameKey].category = item[6];
			assetImportData[xNameKey].nationalId = item[7];
			assetImportData[xNameKey].notes = item[8];
		}
		}
	}
	
	for (const key in assetImportData) {
		if (assetImportData.hasOwnProperty(key)) {
		// console.log( `${assetImportData[key].name}` ); 
		// console.log( `${assetImportData[key].sectors.join(',')}` ); 

		if (assetImportData[key].id === '') {
			formRecord = {
			apiImportId: `${assetImportData[key].apiImportId}`,
			sectorIds: `${assetImportData[key].sectors.join(',')}`,
			isBuiltIn: true,
			name: `${assetImportData[key].name}`,
			category: `${assetImportData[key].category}`,
			nationalId: `${assetImportData[key].nationalId}`,
			notes: `${assetImportData[key].notes}`,
			};
		}
		else {
			formRecord = {
			apiImportId: `${assetImportData[key].apiImportId}`,
			id: `${assetImportData[key].id}`,
			sectorIds: `${assetImportData[key].sectors.join(',')}`,
			isBuiltIn: true,
			name: `${assetImportData[key].name}`,
			category: `${assetImportData[key].category}`,
			nationalId: `${assetImportData[key].nationalId}`,
			notes: `${assetImportData[key].notes}`,
			};
		}
		try {
			upsertRecordAsset(formRecord).catch(console.error);
		} catch (e) {
			console.log(e);
			throw e;
		}
		}
		
	}
}

async function processCategories() {
	const currentDirectory = process.cwd;
	let filePath = currentDirectory();
	let fileString:string = '';

	filePath = currentDirectory();
	filePath = filePath + '/app/hips/categories.csv'; // Replace with your file path
	
	try {
		fileString = await fs.readFile(filePath, 'utf8');
	} catch (error) {
		console.error('Error reading file:', error);
		throw new Response('File not found', { status: 404 });
	}

	let all = await parseCSV(fileString);
	// console.log( all );
	console.log( all[1] );
	let item = all[1];
	let formRecord:CategoryType = { 
		id: parseInt(item[0]),
		name: item[1],
	};
	// console.log(formRecord)
	// try {
	//     upsertRecord(formRecord).catch(console.error);
	//   } catch (e) {
	//     console.log(e);
	//     throw e;
	//   }
	
	all.forEach((item, key) => {
		if (key !== 0) {
		
		if (item[2] === '') {
			formRecord = { 
			id: parseInt(item[0]),
			name: item[1],
			level: parseInt(item[3]),
			};
		}
		else {
			formRecord = { 
			id: parseInt(item[0]),
			name: item[1],
			parentId: parseInt(item[2]),
			level: parseInt(item[3]),
			};
		}

		try {
			upsertRecordCategory(formRecord).catch(console.error);
			} catch (e) {
				console.log(e);
				throw e;
			}
		}
	}); 
}

async function processSectorCsv() {
	const currentDirectory = process.cwd;
	let filePath = currentDirectory();
	let fileString:string = '';

	filePath = filePath + '/app/hips/sectors2.csv'; // Replace with your file path
	try {
		fileString = await fs.readFile(filePath, 'utf8');
	} catch (error) {
		console.error('Error reading file:', error);
		throw new Response('File not found', { status: 404 });
	}

	let all = await parseCSV(fileString);
	// console.log( all );
	console.log( all[1] );

	let item = all[1];
	let formRecord:SectorType = { 
		id: parseInt(item[0]),
		parentId: parseInt(item[1]),
		sectorname: item[2],
		description: item[3],
	};
	let sectorRecord:any = {};

	for (const [key, item] of all.entries()) {
		if (key !== 0) {
			if (String(item[1]).length === 0) {
			formRecord = {
				id: parseInt(item[0]),
				sectorname: item[2],
				description: item[3],
				level: 1,
			};

			try {
				upsertRecordSector(formRecord).catch(console.error);
			} catch (e) {
				console.log(e);
				throw e;
			}
			// console.log(formRecord);
			} else {
			sectorRecord = await sectorById(parseInt(item[1]));
			if (sectorRecord) {
				
				formRecord = {
				id: parseInt(item[0]),
				parentId: parseInt(item[1]),
				sectorname: item[2],
				description: item[3],
				level: sectorRecord.level + 1,
				};

				try {
				upsertRecordSector(formRecord).catch(console.error);
				} catch (e) {
				console.log(e);
				throw e;
				}
				// console.log(formRecord);
			}
			}
		}
	}
}

async function processHipsPage(page: number) {
	const maxPages = 10
	console.log("process hip page", page);
	if (page > maxPages) {
		throw "Exceeded max pages, likely infinite loop"
	}
	// const url = "https://tools.undrr.org/sso-undrr/api/integration/pw/hips?page=" + page;
	const url = "https://data.undrr.org/api/json/hips/hazards/1.0.0/?limit=500";
	const resp = await fetch(url);
	const res = await resp.json() as HipApi;
	// const res = hipsDataJson as HipApi;
	const data = res.data;
	for (const item of data) {
		await upsertHip(item);
	}
	if (!res.last_page) {
		throw "No last page info"
	}
	if (page != res.last_page) {
		processHipsPage(page + 1)
	} else {
		console.log("done with hip pages")
	}
}

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
	const { request } = actionArgs;
	const { user } = authActionGetAuth(actionArgs);
	const data = formStringData(await request.formData());
	const code = data.code || "";
	const resend = data.resend || "";
	const userId = user.id;

	//Send confirmation email
	const countryName = configCountryName();
	const siteURL = configSiteURL();
	const subject = `Welcome to DTS ${configSiteName()}`;
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
	const { user } = authLoaderGetAuth(loaderArgs);
	const url = new URL(loaderArgs.request.url);
	let qsStep = url.searchParams.get("step") || "";

	if (qsStep == '1') {
		try {
			await processAssets();
		} catch (err) {
			console.error(String(err));
		}
	}
	else if (qsStep == '2') {
		
		try {
			await processCategories();
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
	
	return json({
		configSiteName: configSiteName(),
		qsStep: qsStep,
	});
});

export default function Data() {
	const pageData = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const [resent, setResent] = React.useState(false);
	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const navigate = useNavigate();

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
