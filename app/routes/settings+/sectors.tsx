import {
	authLoader,
	authLoaderGetAuth
} from "~/util/auth";

import {NavSettings} from "~/routes/settings/nav";
import {MainContainer} from "~/frontend/container";

export const loader = authLoader(async (loaderArgs) => {
	const {user} = authLoaderGetAuth(loaderArgs)

	return {message: `Hello ${user.email}`};
});

export default function Settings() {
	return (
		<MainContainer
			title="Sectors"
			headerExtra={<NavSettings />}
		>
			<p>TODO</p>
		</MainContainer>
	);
}
