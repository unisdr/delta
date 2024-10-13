import type {
	ActionFunctionArgs,
} from "@remix-run/node";
import {
	json,
	redirect
} from "@remix-run/node";
import {
	useActionData,
} from "@remix-run/react";
import {
	Form,
	Field,
	Errors as FormErrors,
	SubmitButton,
} from "~/components/form"
import { login } from "~/util/auth"
import { formStringData } from "~/util/httputil";
import { createUserSession } from "~/util/session";

import { Link } from "react-router-dom";

export const action = async ({ request }: ActionFunctionArgs) => {
	return json(null);
}

export const loader = async () => {
	return json(null);
};

export default function Screen() {
	return (
		<>
			<h2>Welcome to the Disaster tracking system.
</h2>
			<p>Track disaster impacts, including damages, losses, and human effects, to support better recovery and resilience.</p>
			<div>
			<Link to="/setup/admin_account">Setup account</Link>
			</div>
			<div>
			<Link to="/setup/admin_account_sso">Setup using SSO</Link>
			</div>
		</>
	);
}

