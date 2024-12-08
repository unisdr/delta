import {
	devExample1ById,
} from "~/backend.server/models/dev_example1";

import {
	DevExample1View,
} from "~/frontend/dev_example1";

import {
	createViewLoader,
} from "~/backend.server/handlers/form";

import {
	ViewScreen
} from "~/frontend/form";

export const loader = createViewLoader({
	getById: devExample1ById
});

export default function Screen() {
	return ViewScreen({
		viewComponent: DevExample1View
	})
}
