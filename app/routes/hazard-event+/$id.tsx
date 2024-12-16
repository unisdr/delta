import {
	HazardEventView,
} from "~/frontend/events/hazardeventform";

import {
	createViewLoaderPublicApproved,
} from "~/backend.server/handlers/form";

import {
	ViewScreenPublicApproved
} from "~/frontend/form";
import {hazardEventById} from "~/backend.server/models/event";

export const loader = createViewLoaderPublicApproved({
	getById: hazardEventById
});

export default function Screen() {
	return ViewScreenPublicApproved({
		viewComponent: HazardEventView
	})
}
