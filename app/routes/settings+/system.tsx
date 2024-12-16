import type { MetaFunction } from '@remix-run/node';

import {
	json,
	redirect
} from "@remix-run/node";

import { 
    Outlet,
    Link,
	useLoaderData
 } from "@remix-run/react";

import {
	authLoaderGetAuth,
	authLoaderWithPerm
} from "~/util/auth";

import {
	getSupportedTimeZone,
} from "~/util/timezone";

import {
	getCurrency,
} from "~/util/currency";


import { NavSettings } from "~/routes/settings/nav";

export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {
	const { user } = authLoaderGetAuth(loaderArgs)
	const timeZones:string[] = getSupportedTimeZone();
	const currency:string[] = getCurrency();

	return json({ message: `Hello ${user.email}`, currency:currency, timeZones:timeZones, });
});

export const meta: MetaFunction = () => {
	return [
		{ title: "System Settings - DTS" },
		{ name: "description", content: "System settings." },
	];
};


export default function Settings() {
	const loaderData = useLoaderData<typeof loader>();
	// console.log("loaderData", loaderData);

	const box2colStyle = {
		width: "50%",
		height: "100px"
	};

	return (
	  <>
		<div className="dts-page-header">
			<header className="dts-page-title">
				<div className="mg-container">
					<h1 className="dts-heading-1">System settings</h1>
				</div>
			</header>
			<NavSettings />
		</div>
		<section>
			<div className="mg-container">
				<div className="flex">
					<div className="box" style={box2colStyle}>
						<div>
							<label>
								Time zone:  &nbsp;
								<select>
									<option disabled value="">Select from list</option>
									{loaderData.timeZones.map((item, index) => (
										<option key={index} value={item}>{item}</option>
									))}
								</select>
							</label>
						</div>
					</div>
					<div className="box" style={box2colStyle}>
						<div>
							<label>
								Currency: &nbsp;
								<select>
									<option disabled value="">Select from list</option>
									{loaderData.currency.map((item, index) => (
										<option key={index} value={item}>{item}</option>
									))}
								</select>
							</label>
						</div>
					</div>
				</div>
				<div className="flex">
					<div className="box" style={box2colStyle}>
						<ul>
							<li><strong>Date installed:</strong> 09-01-2025</li>
							<li><strong>Last updated:</strong> 12-01-2025 T00:00:0000:00</li>
							<li><strong>Update available:</strong>  00.00.02:</li>
							<li><strong>System up to date</strong></li>
						</ul>
						

					</div>
					<div className="box" style={box2colStyle}>

					</div>
				</div>
				</div>
		</section>
	  </>
	);
}
