import { DataMainLinks } from "~/frontend/data_screen"

import { hazardousEventsLoader } from "~/backend.server/handlers/events/hazardevent"

import { ListView } from "~/frontend/events/hazardeventlist"

import {
	MetaFunction,
	useLoaderData,
} from "@remix-run/react";

import {
	authLoaderPublicOrWithPerm,
} from "~/util/auth";

import { MainContainer } from "~/frontend/container"

export const meta: MetaFunction = () => {
	return [
		{ title: "List of Hazardous Events - DTS" },
		{ name: "description", content: "Hazardous Events." },
	];
};

export const loader = authLoaderPublicOrWithPerm("ViewData", async (args) => {
	return hazardousEventsLoader( args );
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
