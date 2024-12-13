import {
	json,
} from "@remix-run/node";
import {
	useLoaderData,
	Link,
} from "@remix-run/react";
import {
	authLoader,
	authLoaderGetAuth
} from "~/util/auth";

export const loader = authLoader(async (loaderArgs) => {
		const { user } = authLoaderGetAuth(loaderArgs)
	return json({totpEnabled: user.totpEnabled});
});

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	return (
		<>
			<ul>
			<li><Link to="/settings/access-mgmnt">Manage Users</Link></li>
			<li><Link to="/user/change-password">Change Password</Link></li>
			
			{!ld.totpEnabled ? (
			<li><Link to="/user/totp-enable">Enable TOTP</Link></li>
			) : (
			<li><Link to="/user/totp-disable">Disable TOTP</Link></li>)}
			</ul>
		</>
	);
}

