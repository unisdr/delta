import { DataMainLinks } from "~/frontend/data_screen"

import { hazardousEventsLoader, createTenantAwareLoader } from "~/backend.server/handlers/events/hazardevent"

import { ListView } from "~/frontend/events/hazardeventlist"

import {
	MetaFunction,
	useLoaderData,
} from "@remix-run/react";

import {
	authLoaderPublicOrWithPerm,
	authLoaderGetAuth,
	authLoaderIsPublic
} from "~/util/auth";

import { MainContainer } from "~/frontend/container"

export const meta: MetaFunction = () => {
	return [
		{ title: "List of Hazardous Events - DTS" },
		{ name: "description", content: "Hazardous Events." },
	];
};

export const loader = authLoaderPublicOrWithPerm("ViewData", async (loaderArgs) => {
	// Check if this is a public request
	const isPublic = authLoaderIsPublic(loaderArgs);

	// For authenticated users, get tenant context
	if (!isPublic) {
		const auth = await authLoaderGetAuth(loaderArgs);
		if (auth.user) {
			const userSession = {
				user: auth.user,
				sessionId: auth.session?.id || '',
				session: auth.session || null
			};
			// This will use requireTenantContext which handles errors properly
			const { hazardousEventsLoader: loader } = await createTenantAwareLoader(userSession);
			return loader(loaderArgs);
		}
	}

	// For public access, no tenant context needed
	return hazardousEventsLoader({ loaderArgs });
})

export default function Data() {
	const ld = useLoaderData<typeof loader>();

	return (
		<MainContainer title="Hazardous events">
			<>
				<DataMainLinks relLinkToNew="/new" isPublic={ld.isPublic} baseRoute="/hazardous-event" resourceName="Hazardous Event" csvExportLinks={true} />
				<ListView
					isPublic={ld.isPublic}
					basePath="/hazardous-event"
				></ListView>
			</>
		</MainContainer>
	)
}
