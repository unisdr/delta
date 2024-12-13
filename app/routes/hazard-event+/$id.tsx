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
	const viewScreen = ViewScreen({
		viewComponent: HazardEventView
	})

	return (<>
		<div className="dts-page-header">
			<header className="dts-page-title">
				<div className="mg-container">
					<h1 className="dts-heading-1">Hazardous events</h1>
				</div>
			</header>
		</div>
		<section>
			<div className="mg-container">
				{ viewScreen }
			</div>
		</section>
	</>);
}
