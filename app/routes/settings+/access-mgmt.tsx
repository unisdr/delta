import {
	json
} from "@remix-run/node";

import {
	authLoader,
	authLoaderGetAuth
} from "~/util/auth";

import { NavSettings } from "~/routes/settings/nav";

export const loader = authLoader(async (loaderArgs) => {
	const { user } = authLoaderGetAuth(loaderArgs)

	return json({ message: `Hello ${user.email}` });
});


export default function Settings() {
	return (
		<>
			<div className="dts-page-header">
				<header className="dts-page-title">
					<div className="mg-container">
						<h1 className="dts-heading-1">Access management</h1>
					</div>
				</header>
				<NavSettings />
			</div>
			<section>
				<div className="mg-container">
				</div>
			</section>
		</>
	);
}
