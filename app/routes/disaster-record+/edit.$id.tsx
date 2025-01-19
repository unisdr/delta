import {
	disasterRecordsCreate,
	disasterRecordsUpdate,
	disasterRecordsById,
} from "~/backend.server/models/disaster_record";

import {
	fieldsDef,
	DisasterRecordsForm,
	route
} from "~/frontend/disaster-record/form";

import {
	FormScreen
} from "~/frontend/form";

import {
	createLoader,
	createAction
} from "~/backend.server/handlers/form";

export const loader = createLoader({
	getById: disasterRecordsById
});

export const action = createAction({
	fieldsDef,
	create: disasterRecordsCreate,
	update: disasterRecordsUpdate,
	redirectTo: (id) => `${route}/${id}`
});

export default function Screen() {
	return FormScreen({
		fieldsDef: fieldsDef,
		formComponent: DisasterRecordsForm,
	})
}
