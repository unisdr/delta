import {
	disasterEventById

} from "~/backend.server/models/event";

import {
	DisasterEventView,
} from "~/frontend/events/disastereventform";

import {
	createViewLoader,
} from "~/backend.server/handlers/form";

import {
	ViewScreen
} from "~/frontend/form";

export const loader = createViewLoader({
	getById: disasterEventById
});

export default function Screen() {
	return ViewScreen({
		viewComponent: DisasterEventView
	})
}
