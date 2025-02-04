import {
	DisasterRecordsView,
} from "~/frontend/disaster-record/form";

import {
	createViewLoaderPublicApproved,
} from "~/backend.server/handlers/form";

import {
	ViewScreenPublicApproved
} from "~/frontend/form";
import {disasterRecordsById} from "~/backend.server/models/disaster_record";

export const loader = createViewLoaderPublicApproved({
	getById: disasterRecordsById
});

export default function Screen() {
	return ViewScreenPublicApproved({
		viewComponent: DisasterRecordsView
	})
}
