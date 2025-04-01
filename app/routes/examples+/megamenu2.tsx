import {
	useLoaderData,
} from "@remix-run/react";
import {
	authLoader,
} from "~/util/auth";
import {
	Header,
} from "~/frontend/header/header"


import {configSiteName} from "~/util/config";


export const loader = authLoader(async () => {
	return {
		configSiteName: configSiteName(),
	};
});

export default function Screen() {
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
			<Header loggedIn={false} siteLogo="" siteName={configSiteName} userRole="admin" />
		</>
	)
}
