import {
	disruptionById,
} from "~/backend.server/models/disruption"

import {
	DisruptionView,
} from "~/frontend/disruption"

import {
	createViewLoader,
} from "~/backend.server/handlers/form"

import {
	ViewScreen
} from "~/frontend/form"

export const loader = createViewLoader({
	getById: disruptionById
})

export default function Screen() {
	return ViewScreen({
		viewComponent: DisruptionView
	})
}


