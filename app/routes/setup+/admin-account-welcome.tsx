import type { MetaFunction } from '@remix-run/node';

import {
	json,
} from "@remix-run/node";

import { Link } from "react-router-dom";
import { useLoaderData } from "@remix-run/react";
import { configSiteName } from "~/util/config";

export const action = async () => {
	return json(null);
}

export const loader = async () => {
	console.log("NODE_ENV", process.env.NODE_ENV)
	return ({
		configSiteName: configSiteName(),
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
	const {configSiteName} = loaderData;

	return (
		<>
			<form className="dts-form dts-form--vertical">
				<div className="dts-form__header">
				<span>&nbsp;</span>
				</div>
				<div className="dts-form__intro">
					<h2 className="dts-heading-1">Welcome to the { configSiteName }.</h2>
					<p>Track disaster impacts, including damages, losses, and human effects, to support better recovery and resilience.</p>
				</div>
				<div className="dts-form__actions">
					<Link to="/setup/admin-account" className="mg-button mg-button-primary">Set up account</Link>
					<Link to="/setup/admin-account-sso" className="mg-button mg-button-outline">Set up account using SSO</Link>
				</div>
			</form>


		</>
	);
}

