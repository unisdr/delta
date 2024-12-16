import {
	disasterEventById

} from "~/backend.server/models/event";

import {
	DisasterEventView,
} from "~/frontend/events/disastereventform";

import {
	createViewLoaderPublicApproved,
} from "~/backend.server/handlers/form";

import {
	ViewScreenPublicApproved
} from "~/frontend/form";

export const loader = createViewLoaderPublicApproved({
	getById: disasterEventById
});

export default function Screen() {
	return ViewScreenPublicApproved({
		viewComponent: DisasterEventView
	})
}
