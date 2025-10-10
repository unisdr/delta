import { DataMainLinks } from "~/frontend/data_screen";

import { hazardousEventsLoader } from "~/backend.server/handlers/events/hazardevent";

import { ListView } from "~/frontend/events/hazardeventlist";
import { HazardEventHeader } from "~/components/EventCounter";

import { MetaFunction, useLoaderData } from "@remix-run/react";

import { authLoaderPublicOrWithPerm } from "~/util/auth";

import { getCountrySettingsFromSession } from "~/util/session";

import { MainContainer } from "~/frontend/container";

export const meta: MetaFunction = () => {
	return [
		{ title: "List of Hazardous Events - DELTA Resilience" },
		{ name: "description", content: "Hazardous Events." },
	];
};

export const loader = authLoaderPublicOrWithPerm("ViewData", async (args) => {
	// Get the hazardous events data
	const eventsData = await hazardousEventsLoader(args);

	// Get the instance settings to access the website name
	const settings = await getCountrySettingsFromSession(args.request);

	// Return both the events data and the instance name
	return {
		...eventsData,
		instanceName: settings?.websiteName || "DELTA Resilience",
	};
});

export default function Data() {
	const ld = useLoaderData<typeof loader>();

	return (
		<MainContainer title="Hazardous events">
			<>
				{/* Header with count and instance name */}
				<HazardEventHeader
					totalCount={ld.data.pagination.totalItems}
					instanceName={ld.instanceName}
				/>

				<DataMainLinks
					relLinkToNew="/new"
					isPublic={ld.isPublic}
					baseRoute="/hazardous-event"
					resourceName="event"
					csvExportLinks={false} /* CSV Export and Import buttons disabled */
				/>
				<ListView isPublic={ld.isPublic} basePath="/hazardous-event"></ListView>
			</>
		</MainContainer>
	);
}
