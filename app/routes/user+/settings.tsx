import {
	useLoaderData,
	Link,
} from "@remix-run/react";
import {
	authLoader,
	authLoaderGetAuth
} from "~/util/auth";
import { configAuthSupportedForm } from "~/util/config";

export const loader = authLoader(async (loaderArgs) => {
	const { user } = authLoaderGetAuth(loaderArgs)
	return {
		totpEnabled: user.totpEnabled,
		isFormAuthSupported: configAuthSupportedForm()
	};
});

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	return (
		<>
			<ul>
				<li><Link to="/settings/access-mgmnt">Manage Users</Link></li>

				{/* Only show Change Password link if form authentication is supported */}
				{ld.isFormAuthSupported && (
					<li><Link to="/user/change-password">Change Password</Link></li>
				)}

				{!ld.totpEnabled ? (
					<li><Link to="/user/totp-enable">Enable TOTP</Link></li>
				) : (
					<li><Link to="/user/totp-disable">Disable TOTP</Link></li>
				)}
			</ul>
		</>
	);
}