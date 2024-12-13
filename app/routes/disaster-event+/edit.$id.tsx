import {
	disasterEventById,
	disasterEventCreate,
	disasterEventUpdate,
} from "~/backend.server/models/event";

import {
	fieldsDef,
	DisasterEventForm,
} from "~/frontend/events/disastereventform";

import {
	createLoader,
	createAction
} from "~/backend.server/handlers/form";

import {
	FormScreen
} from "~/frontend/form";

import {
	route,
} from "~/frontend/events/disastereventform";

export const loader = createLoader({
	getById: disasterEventById
});

export const action = createAction({
	fieldsDef,
	create: disasterEventCreate,
	update: disasterEventUpdate,
	redirectTo: (id) => route + "/" + id
});

export default function Screen() {
	const formScreen = FormScreen({
		fieldsDef: fieldsDef,
		formComponent: DisasterEventForm,
	})

	return (
		<>
			<div className="dts-page-header">
				<header className="dts-page-title">
					<div className="mg-container">
						<h1 className="dts-heading-1">Disaster events</h1>
					</div>
				</header>
			</div>
			<section>
				<div className="mg-container">
					{ formScreen }
				</div>
			</section>
		</>
	);
}
