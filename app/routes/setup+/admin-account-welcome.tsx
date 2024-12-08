import type { MetaFunction } from '@remix-run/node';

import {
	json,
} from "@remix-run/node";

import { Link } from "react-router-dom";

export const action = async () => {
	return json(null);
}

export const loader = async () => {
	console.log("NODE_ENV", process.env.NODE_ENV)
	return json(null);
};

export const meta: MetaFunction = () => {
	return [
		{ title: "Welcome to admin setup - DTS" },
		{ name: "description", content: "Admin setup." },
	];
};

export default function Screen() {
	return (
		<>
			<h2>Welcome to the Disaster tracking system.</h2>
			<p>Track disaster impacts, including damages, losses, and human effects, to support better recovery and resilience.</p>
			<div>
			<Link to="/setup/admin-account">Setup account</Link>
			</div>
			<div>
			<Link to="/setup/admin-account-sso">Setup using SSO</Link>
			</div>
		</>
	);
}

