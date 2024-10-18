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
	authLoader,
	authLoaderGetAuth
} from "~/util/auth";

import { NavSettings } from "~/routes/settings/nav";

export const loader = authLoader(async (loaderArgs) => {
	const { user } = authLoaderGetAuth(loaderArgs);
	const timeZone = Intl.supportedValuesOf('timeZone');

	return json({ message: `Hello ${user.email}`, timeZone: timeZone });
});


/**
 * References: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/supportedValuesOf
 * 
 */
export default function Settings() {
	const loaderData = useLoaderData<typeof loader>();
	console.log("loaderData", loaderData.timeZone);

	const box2colStyle = {
		width: "50%",
		height: "100px"
	};

	return (
	  <div>
		<h1>System settings</h1>
		<div className="secondary-nav">
			<NavSettings />
		</div>
		<section>
			<h2></h2>
			<div className="flex">
				<div className="box" style={box2colStyle}>
					<label>
						Time zone: 
						<select>
							<option disabled value="">Select from list</option>
						</select>
					</label>
				</div>
				<div className="box" style={box2colStyle}>
					<label>
						System language: 
						<select>
							<option disabled value="">Select from list</option>
							<option value="en">English</option>
						</select>
					</label>
				</div>
			</div>
			<div className="flex">
				<div className="box" style={box2colStyle}>
					<dd>
						<dt><strong>Date installed:</strong> 09-01-2025</dt>
						<dt><strong>Last updated:</strong> 12-01-2025 T00:00:0000:00</dt>
						<dt><strong>Update available:</strong>  00.00.02:</dt>
						<dt><strong>System up to date</strong></dt>
					</dd>
					

				</div>
				<div className="box" style={box2colStyle}>

				</div>
			</div>
		</section>
	  </div>
	);
}
