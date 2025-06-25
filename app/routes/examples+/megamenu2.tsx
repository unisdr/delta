import {
	useLoaderData,
} from "@remix-run/react";
import {
	authLoader,
} from "~/util/auth";
import {
	Header,
} from "~/frontend/header/header"
import { getInstanceSystemSettings } from "~/backend.server/models/instanceSystemSettingDAO";


export const loader = authLoader(async () => {
	const settings= await getInstanceSystemSettings();
	var siteName='Disaster Losses Tracking System'
	if(settings){
		siteName=settings.websiteName;
	}
	return {
		configSiteName: siteName,
	};
});

export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();
	const {configSiteName} = loaderData


	return (
		<>
			<p>Hello!</p>
			<Header loggedIn={false} siteLogo="" siteName={configSiteName} userRole="admin" />
		</>
	)
}
