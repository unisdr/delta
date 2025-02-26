import {authLoaderWithPerm} from "~/util/auth";
import {
	disasterRecordsCreate,
	disasterRecordsUpdate,
	disasterRecordsById,
	disasterRecordsByIdTx,
	getHumanEffectRecordsById,
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
	sectorsFilderBydisasterRecordsId,
} from "~/backend.server/models/disaster_record__sectors";



import {
	FormScreen
} from "~/frontend/form";

import {
	createAction
} from "~/backend.server/handlers/form";
import { getTableName } from "drizzle-orm";
import { disasterRecordsTable } from "~/drizzle/schema";

import { buildTree } from "~/components/TreeView";
import { dr } from "~/db.server"; // Drizzle ORM instance
import { divisionTable } from "~/drizzle/schema";

import { contentPickerConfig } from "./content-picker-config";

export const loader = authLoaderWithPerm("EditData", async (actionArgs) => {
	// console.log("actionArgs", actionArgs.params);
	// return {item: null};

	const {params} = actionArgs;
	if (!params.id) {
		throw "Route does not have $id param";
	}

    const initializeNewTreeView = async (): Promise<any[]> => {
        const idKey = "id";
        const parentKey = "parentId";
        const nameKey = "name";
        const rawData = await dr.select().from(divisionTable);
        return buildTree(rawData, idKey, parentKey, nameKey, ["fr", "de", "en"], "en", ["geojson"]);
    };
	
	if (params.id === "new") {
        const treeData = await initializeNewTreeView();
        return {
            item: null,
            recordsNonecoLosses: [],
            recordsDisRecSectors: [],
            recordsHumanEffects: [],
            treeData: treeData,
            cpDisplayName: null
        };
	}

	const item = await disasterRecordsById(params.id);
	if (!item) {
		throw new Response("Not Found", {status: 404});
	}
	
	const dbNonecoLosses = await nonecoLossesFilderBydisasterRecordsId(params.id);
	const dbDisRecSectors = await sectorsFilderBydisasterRecordsId(params.id);
	const dbDisRecHumanEffects = await getHumanEffectRecordsById(params.id);
	
	// console.log("recordsNonecoLosses", dbNonecoLosses);
	// console.log("recordsNonecoLosses", dbDisRecSectors);
	//console.log("Human Effects: ", dbDisRecHumanEffects);
	// console.log("Sectors: ", await sectorTreeDisplayText(1302020101));
	// console.log("Sectors: ", dbDisRecSectors);

	// Define Keys Mapping (Make it Adaptable)
    const treeData = await initializeNewTreeView();

    const cpDisplayName = await contentPickerConfig.selectedDisplay(dr, item.disasterEventId);

    return {
		item, 
		recordsNonecoLosses: dbNonecoLosses, 
		recordsDisRecSectors: dbDisRecSectors,
		recordsHumanEffects: dbDisRecHumanEffects,
		treeData: treeData,
		cpDisplayName: cpDisplayName
	};
});

export const action = createAction({
	fieldsDef,
	create: disasterRecordsCreate,
	update: disasterRecordsUpdate,
	redirectTo: (id) => `${route}/${id}`,
	getById: disasterRecordsByIdTx,
	tableName: getTableName(disasterRecordsTable),
	action: (isCreate) =>
		isCreate ? "Create disaster record" : "Update disaster record",
});

export default function Screen() {
	const ld = useLoaderData<{
		item: DisasterRecordsViewModel | null, 
		recordsNonecoLosses: nonecoLossesProps, 
		recordsDisRecSectors: any | null,
		recordsHumanEffects: any | null,
		treeData: any[]
		cpDisplayName: string
	}>();
	// console.log(ld);

	return (
		<>
			<FormScreen
				fieldsDef={fieldsDef}
				formComponent={(props: any) => <DisasterRecordsForm {...props} treeData={ld.treeData} cpDisplayName={ld.cpDisplayName} />}
			/>
			{ld.item && (<>
				<div>&nbsp;</div>
				<section>
					<div className="mg-container">
						<fieldset className="dts-form__section">
							<div className="dts-form__intro">
								<legend className="dts-heading-3">Human Direct Effects</legend>
							</div>
							<div className="dts-form__body no-border-bottom">
								<div className="dts-form__section-remove">
									<Link to={`/disaster-record/edit-sub/${ld.item.id}/human-effects`}>[ Add new record ]</Link>
								</div>
								<div className="mg-grid mg-grid__col-1">
									<div className="dts-form-component">
									{ld.recordsHumanEffects && (
										<>
										<ul>
											{ ld.recordsHumanEffects.deaths && (
												<li><Link to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Deaths`}>Deaths</Link></li>
											)}
											{ ld.recordsHumanEffects.injured && (
												<li><Link to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Injured`}>Injured</Link></li>
											)}
											{ ld.recordsHumanEffects.missing && (
												<li><Link to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Missing`}>Missing</Link></li>	
											)}
											{ (ld.recordsHumanEffects.affectedDirect || ld.recordsHumanEffects.affectedIndirect)  && (
												<li><Link to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Affected`}>Affected</Link></li>
											)}
											{ (ld.recordsHumanEffects.displacedShort 
												|| ld.recordsHumanEffects.displacedMediumShort
												|| ld.recordsHumanEffects.displacedMediumLong
												|| ld.recordsHumanEffects.displacedLong
												|| ld.recordsHumanEffects.displacedPermanent
												)  && (
													<li><Link to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Displaced`}>Displaced</Link></li>
											)}
											{ (ld.recordsHumanEffects.displacedPreemptive || ld.recordsHumanEffects.displacedReactive)  && (
												<li><Link to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=DisplacementStocks`}>Displacement Stocks</Link></li>
											)}
										</ul>
										</>
									)}
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
							</div>
							<div className="dts-form__body no-border-bottom">
								<div className="dts-form__section-remove">
									<Link to={`/disaster-record/edit-sec/${ld.item.id}`}>[ Add new record ]</Link>
								</div>
								<div className="mg-grid mg-grid__col-1">
									<div className="dts-form-component">
										<table className="dts-table table-border">
											<thead>
												<tr>
													<th></th>
													<th></th>
													<th className="center" colSpan={3}>Damage</th>
													<th className="center" colSpan={2}>Losses</th>
													<th></th>
													<th></th>
												</tr>
												<tr>
													<th>ID</th>
													<th>Sector</th>
													<th>Damage</th>
													<th>Recovery Cost</th>
													<th>Cost</th>
													<th>Losses</th>
													<th>Cost</th>
													<th>Disruption</th>
													<th>Actions</th>
												</tr>
											</thead>
											<tbody>
												{ld.recordsDisRecSectors && Array.isArray(ld.recordsDisRecSectors) && ld.recordsDisRecSectors.map((item, index) => (
													<tr key={ index }>
														<td>{ item.disRecSectorsId.slice(0, 8) }</td>
														<td>
															{ item.sectorTreeDisplay }
														</td>
														<td>
															{ item.disRecSectorsWithDamage &&
																<>
																	<Link to={`/disaster-record/edit-sub/${item.disRecSectorsdisasterRecordId}/damages?sectorId=${item.disRecSectorsSectorId}`}>Yes</Link>
																</>
															}
														</td>
														<td>
															{ item.disRecSectorsDamageRecoveryCost &&
																<>
																	
																	{ item.disRecSectorsDamageRecoveryCost } { item.disRecSectorsDamageRecoveryCostCurrency }
																</>
															}
														</td>
														<td>
															{ item.disRecSectorsDamageCost &&
																<>
																	
																	{ item.disRecSectorsDamageCost } { item.disRecSectorsDamageCostCurrency }
																</>
															}
														</td>
														<td>
															{ item.disRecSectorsWithLosses &&
																<>
																	<Link to={`/disaster-record/edit-sub/${item.disRecSectorsdisasterRecordId}/losses?sectorId=${item.disRecSectorsSectorId}`}>Yes</Link>
																</>
															}
														</td>
														<td>
															{ item.disRecSectorsLossesCost &&
																<>
																	
																	{ item.disRecSectorsLossesCost } { item.disRecSectorsLossesCostCurrency }
																</>
															}
														</td>
														<td>
															{ item.disRecSectorsWithDisruption &&
																<>
																	<Link to={`/disaster-record/edit-sub/${item.disRecSectorsdisasterRecordId}/disruptions?sectorId=${item.disRecSectorsSectorId}`}>Yes</Link>
																</>
															}
														</td>
														<td>
															{ ld.item && ld.item.id && (
																<>
																	<Link to={`/disaster-record/edit-sec/${ld.item.id}/delete/?id=${item.disRecSectorsId}`}>Delete</Link>
																	&nbsp;|&nbsp;
																	<Link to={`/disaster-record/edit-sec/${ld.item.id}/?id=${item.disRecSectorsId}`}>Edit</Link>
																</>

															)}
														</td>
													</tr>
												))}
											</tbody>
										</table>
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
								<div className="dts-form__body no-border-bottom">
									<div className="dts-form__section-remove">
										<Link to={`${route}/non-economic-losses/${ld.item.id}`}>[ Add new record ]</Link>
									</div>
									<div className="mg-grid mg-grid__col-1">
										<div className="dts-form-component">
											<table className="dts-table table-border">
												<thead>
													<tr>
														<th>ID</th>
														<th>Category</th>
														<th>Description</th>
														<th>Actions</th>
													</tr>
												</thead>
												<tbody>
													{ld.recordsNonecoLosses && Array.isArray(ld.recordsNonecoLosses) && ld.recordsNonecoLosses.map((item, index) => (
														<tr key={ index }>
															<td>{ item.noneccoId.slice(0, 8) }</td>
															<td>
																{ item.categoryTreeDisplay }
															</td>
															<td>{ item.noneccoDesc.slice(0, 300) }</td>
															<td>
																{ ld.item && ld.item.id && (
																	<>
																		<Link to={`${route}/non-economic-losses/${ld.item.id}/delete/?id=${item.noneccoId}`}>Delete</Link>
																		&nbsp;|&nbsp;
																		<Link to={`${route}/non-economic-losses/${ld.item.id}/?id=${item.noneccoId}`}>Edit</Link>
																	</>
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
