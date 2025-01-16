import {
	json,
} from "@remix-run/node";
import { loginGetCode }  from "~/util/ssoauzeb2c";
import {configAuthSupportedAzureSSOB2C} from "~/util/config"

export const action = async () => {
	return json(null);
}

export const loader = async () => {
	console.log("NODE_ENV", process.env.NODE_ENV)

	const allowedAzureSSOB2C:boolean = configAuthSupportedAzureSSOB2C();

	if (allowedAzureSSOB2C) {
		return loginGetCode('');
	}
	else {
		throw new Error("Azure SSO B2C not allowed in the system.");
	}
};

// export default function Screen() {
// 	const actionData = useActionData<typeof action>();


// 	return (
// 		<>
// 		</>
// 	);
// }

