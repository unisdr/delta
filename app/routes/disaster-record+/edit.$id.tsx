import {authActionWithPerm, authLoaderWithPerm} from "~/util/auth";
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
import { nonecoLossesFilderBydisasterRecordsId, PropRecord as nonecoLossesProps } from "~/backend.server/models/noneco_losses";



import {
	FormScreen
} from "~/frontend/form";

import {
	createLoader,
	createAction
} from "~/backend.server/handlers/form";

export const loader = authLoaderWithPerm("EditData", async (actionArgs) => {
	// console.log("actionArgs", actionArgs.params);
	// return {item: null};

	const {params} = actionArgs;
	if (!params.id) {
		throw "Route does not have $id param";
	}
	if (params.id === "new") {
		return {item: null};
	}
	const item = await disasterRecordsById(params.id);
	if (!item) {
		throw new Response("Not Found", {status: 404});
	}

	const dbNonecoLosses = await nonecoLossesFilderBydisasterRecordsId(params.id);
	
	console.log("recordsNonecoLosses", dbNonecoLosses);

	return {item, recordsNonecoLosses: dbNonecoLosses};
});

export const action = createAction({
	fieldsDef,
	create: disasterRecordsCreate,
	update: disasterRecordsUpdate,
	redirectTo: (id) => `${route}/${id}`
});

export default function Screen() {
	const ld = useLoaderData<{item: DisasterRecordsViewModel | null, recordsNonecoLosses: nonecoLossesProps}>();
	console.log(ld);

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
											<table>
												<thead>
													<tr>
														<th>ID</th>
														<th>Description</th>
														<th>Parent Category</th>
														<th>Area</th>
														<th>Actions</th>
													</tr>
												</thead>
												<tbody>
													{ld.recordsNonecoLosses && Array.isArray(ld.recordsNonecoLosses) && ld.recordsNonecoLosses.map((item, index) => (
														<tr key={ index }>
															<td>{ item.noneccoId.slice(0, 8) }</td>
															<td>{ item.noneccoDesc.slice(0, 300) }</td>
															<td>
																{ item.catNameParent2 ? item.catNameParent2 + ': ' + item.catNameParent1 : item.catNameParent1 }
															</td>
															<td>{ item.catName }</td>
															<td>
																{ ld.item && ld.item.id && (
																	<Link to={`${route}/non-economic-losses/${ld.item.id}/?id=${item.noneccoId}`}>Edit</Link>
																)}
															</td>
														</tr>
													))}
												</tbody>
											</table>
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
