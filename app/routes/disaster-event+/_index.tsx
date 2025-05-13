import { disasterEventsLoader } from "~/backend.server/handlers/events/disasterevent";

import { ListView } from "~/frontend/events/disastereventlist";

import { authLoaderPublicOrWithPerm } from "~/util/auth";

import {  MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
	return [
		{ title: "List of Disaster Events - DTS" },
		{ name: "description", content: "Disaster Events." },
	];
};

export const loader = authLoaderPublicOrWithPerm(
	"ViewData",
	async (loaderArgs) => {
		return disasterEventsLoader({ loaderArgs });
	}
);

export default function Data() {
	return ListView({})
}
