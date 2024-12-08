import {
	json,
} from "@remix-run/node";
import { loginGetCode }  from "~/util/ssoauzeb2c";

export const action = async () => {
	return json(null);
}

export const loader = async () => {
	console.log("NODE_ENV", process.env.NODE_ENV)

	return loginGetCode('');

	// return json(null);
};

// export default function Screen() {
// 	const actionData = useActionData<typeof action>();


// 	return (
// 		<>
// 		</>
// 	);
// }

