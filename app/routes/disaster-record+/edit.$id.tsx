import {
	disasterRecordsCreate,
	disasterRecordsUpdate,
	disasterRecordsById,
} from "~/backend.server/models/disaster_record";

import {
	useLoaderData,
	Link
} from "@remix-run/react";

import {
	fieldsDef,
	DisasterRecordsForm,
	route
} from "~/frontend/disaster-record/form";

import { DisasterRecordsViewModel } from "~/backend.server/models/disaster_record";



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
	const ld = useLoaderData<{item: DisasterRecordsViewModel | null}>();
	console.log(ld.item);

	return (
		<>
			<FormScreen
				fieldsDef={fieldsDef}
				formComponent={DisasterRecordsForm}
			/>
			{ld.item && (<>
				<div>&nbsp;</div>
				<section>
					<div className="mg-container">
						<fieldset className="dts-form__section">
							<div className="dts-form__intro">
								<legend className="dts-heading-3">Human Direct Effects</legend>
								<div className="dts-form__body">
									<div className="dts-form__section-remove">
										<Link to={`/disaster-record-wip/edit/${ld.item.id}/human-effects`}>[ Add new record ]</Link>
									</div>
									<div className="mg-grid mg-grid__col-1">
										<div className="dts-form-component">
										</div>
									</div>
								</div>
							</div>
						</fieldset>
					</div>
				</section>
				<section>
					<div className="mg-container">
						<fieldset className="dts-form__section">
							<div className="dts-form__intro">
								<legend className="dts-heading-3">Sectors</legend>
								<div className="dts-form__body">
									<div className="dts-form__section-remove">
										[ Add new record ]
									</div>
									<div className="mg-grid mg-grid__col-1">
										<div className="dts-form-component">
										</div>
									</div>
								</div>
							</div>
						</fieldset>
					</div>
				</section>
				<section>
					<div className="mg-container">
						<fieldset className="dts-form__section">
							<div className="dts-form__intro">
								<legend className="dts-heading-3">Non-economic Losses</legend>
								<div className="dts-form__body">
									<div className="dts-form__section-remove">
										
										<Link to={`${route}/non-economic-losses/${ld.item.id}`}>[ Add new record ]</Link>
									</div>
									<div className="mg-grid mg-grid__col-1">
										<div className="dts-form-component">
										</div>
									</div>
								</div>
							</div>
						</fieldset>
					</div>
				</section>
			</>)}
			
		</>
	);
}
