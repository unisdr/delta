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
	const viewScreen = ViewScreen({
		viewComponent: DisasterEventView
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
					{ viewScreen }
				</div>
			</section>
		</>
	);
}
