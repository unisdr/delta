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
import {
	MegaMenu,
} from "~/components/megamenu2/megamenu"
import {
	Lvl1Item
} from "~/components/megamenu2/common"
import {
	Header,
} from "~/components/header/header"

import { useState, useEffect } from "react";

import { configSiteName } from "~/util/config";


export const loader = authLoader(async () => {
	return json({
		configSiteName: configSiteName(),
	});
});

export default function Screen(){
	const loaderData = useLoaderData<typeof loader>();
	const {configSiteName} = loaderData


	/*
	// only render in the browser, not server
	// since it uses window breakpoints to know the sizing
	const [isClient, setIsClient] = useState(false);
	useEffect(() => {
		setIsClient(true);
	}, []);
	if (!isClient) return null;
*/

	return (
		<>
			<p>Hello!</p>
			<Header siteName={configSiteName}/>
		</>
	)
}
