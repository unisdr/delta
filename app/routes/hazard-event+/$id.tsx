import {
	HazardEventView,
} from "~/frontend/events/hazardeventform";

import {
	createViewLoader,
} from "~/backend.server/handlers/form";

import {
	ViewScreen
} from "~/frontend/form";
import {hazardEventById} from "~/backend.server/models/event";

export const loader = createViewLoader({
	getById: hazardEventById
});

export default function Screen() {
	return ViewScreen({
		viewComponent: HazardEventView
	})
}
