import {authLoaderGetUserForFrontend, authLoaderWithPerm} from "~/util/auth";
import {
	disasterRecordsCreate,
	disasterRecordsUpdate,
	disasterRecordsById,
	disasterRecordsByIdTx,
	getHumanEffectRecordsById,
} from "~/backend.server/models/disaster_record";

import {
	useLoaderData,
	Link,
} from "@remix-run/react";

import {
	fieldsDef,
	DisasterRecordsForm,
	route
} from "~/frontend/disaster-record/form";

import {nonecoLossesFilderBydisasterRecordsId} from "~/backend.server/models/noneco_losses";
import {
	sectorsFilderBydisasterRecordsId,
} from "~/backend.server/models/disaster_record__sectors";

import {
	FormScreen
} from "~/frontend/form";

import {
	createAction
} from "~/backend.server/handlers/form/form";
import {getTableName, eq} from "drizzle-orm";
import {disasterRecordsTable} from "~/drizzle/schema";

import {buildTree} from "~/components/TreeView";
import {dr} from "~/db.server"; // Drizzle ORM instance
import {divisionTable} from "~/drizzle/schema";
import {dataForHazardPicker} from "~/backend.server/models/hip_hazard_picker";

import {contentPickerConfig} from "./content-picker-config";

import {ContentRepeaterUploadFile} from "~/components/ContentRepeater/UploadFile";
import {DeleteButton} from "~/frontend/components/delete-dialog"

export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	const {params} = loaderArgs;
	if (!params.id) {
		throw "Route does not have $id param";
	}

	const initializeNewTreeView = async (): Promise<any[]> => {
		const idKey = "id";
		const parentKey = "parentId";
		const nameKey = "name";
		const rawData = await dr.select().from(divisionTable);
		return buildTree(rawData, idKey, parentKey, nameKey, ["fr", "de", "en"], "en", ["geojson", "importId", "nationalId", "level", "name"]);
	};

	const hip = await dataForHazardPicker();

	let user = authLoaderGetUserForFrontend(loaderArgs)

	const divisionGeoJSON = await dr.execute(`
		SELECT id, name, geojson
		FROM division
		WHERE (parent_id = 0 OR parent_id IS NULL) AND geojson IS NOT NULL;
    `);

	if (params.id === "new") {
		const treeData = await initializeNewTreeView();
		const ctryIso3 = process.env.DTS_INSTANCE_CTRY_ISO3 as string;
		//console.log("ctryIso3", ctryIso3);
		return {
			item: null,
			recordsNonecoLosses: [],
			recordsDisRecSectors: [],
			recordsHumanEffects: [],
			hip: hip,
			treeData: treeData,
			cpDisplayName: null,
			ctryIso3: ctryIso3,
			divisionGeoJSON: divisionGeoJSON?.rows,
			user
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
	const ctryIso3 = process.env.DTS_INSTANCE_CTRY_ISO3 as string;

	const cpDisplayName = await contentPickerConfig.selectedDisplay(dr, item.disasterEventId);

	return {
		item,
		recordsNonecoLosses: dbNonecoLosses,
		recordsDisRecSectors: dbDisRecSectors,
		recordsHumanEffects: dbDisRecHumanEffects,
		hip: hip,
		treeData: treeData,
		cpDisplayName: cpDisplayName,
		ctryIso3: ctryIso3,
		divisionGeoJSON: divisionGeoJSON?.rows,
		user
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
	postProcess: async (id, data) => {
		//console.log(`Post-processing record: ${id}`);
		//console.log(`data: `, data);

		const save_path = `/uploads/disaster-record/${id}`;
		const save_path_temp = `/uploads/temp`;

		// Ensure attachments is an array, even if it's undefined or empty
		const attachmentsArray = Array.isArray(data?.attachments) ? data.attachments : [];

		// Process the attachments data
		const processedAttachments = ContentRepeaterUploadFile.save(attachmentsArray, save_path_temp, save_path);

		// Update the `attachments` field in the database
		await dr.update(disasterRecordsTable)
			.set({
				attachments: processedAttachments || [], // Ensure it defaults to an empty array if undefined
			})
			.where(eq(disasterRecordsTable.id, id));
	},
});

export default function Screen() {
	const ld = useLoaderData<typeof loader>();

	return (
		<>

			<FormScreen
				fieldsDef={fieldsDef}
				formComponent={(props: any) => <DisasterRecordsForm {...props}
					hip={ld.hip}
					treeData={ld.treeData}
					ctryIso3={ld.ctryIso3}
					cpDisplayName={ld.cpDisplayName}
					divisionGeoJSON={ld.divisionGeoJSON}
					user={ld.user}
				/>}
			/>
			{ld.item && (<>
				<div>&nbsp;</div>
				<section>
					<div className="mg-container">
						<fieldset className="dts-form__section">
							<div className="dts-form__intro">
								<legend className="dts-heading-3">Human Effects</legend>
							</div>
							<div className="dts-form__body no-border-bottom">
								<div className="dts-form__section-remove">
									<Link to={`/disaster-record/edit-sub/${ld.item.id}/human-effects`}>[ Add new record ]</Link>&nbsp;
									<DeleteButton action={`/disaster-record/edit-sub/${ld.item.id}/human-effects/delete-all-data`} label="[ Delete all records ]" />
								</div>
								<div className="mg-grid mg-grid__col-1">
									<div className="dts-form-component">
										{ld.recordsHumanEffects && (
											<>
												<ul>
													{ld.recordsHumanEffects.deaths && (
														<li><Link to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Deaths`}>Deaths</Link></li>
													)}
													{ld.recordsHumanEffects.injured && (
														<li><Link to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Injured`}>Injured</Link></li>
													)}
													{ld.recordsHumanEffects.missing && (
														<li><Link to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Missing`}>Missing</Link></li>
													)}
													{(ld.recordsHumanEffects.affectedDirect || ld.recordsHumanEffects.affectedIndirect) && (
														<li><Link to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Affected`}>Affected</Link></li>
													)}
													{(ld.recordsHumanEffects.displaced) && (
														<li><Link to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Displaced`}>Displaced</Link></li>
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
													<tr key={index}>
														<td>{item.disRecSectorsId.slice(0, 8)}</td>
														<td>
															{item.sectorTreeDisplay}
														</td>
														<td>
															{item.disRecSectorsWithDamage &&
																<>
																	<Link to={`/disaster-record/edit-sub/${item.disRecSectorsdisasterRecordId}/damages?sectorId=${item.disRecSectorsSectorId}`}>Yes</Link>
																</>
															}
														</td>
														<td>
															{item.disRecSectorsDamageRecoveryCost &&
																<>

																	{item.disRecSectorsDamageRecoveryCost} {item.disRecSectorsDamageRecoveryCostCurrency}
																</>
															}
														</td>
														<td>
															{item.disRecSectorsDamageCost &&
																<>

																	{item.disRecSectorsDamageCost} {item.disRecSectorsDamageCostCurrency}
																</>
															}
														</td>
														<td>
															{item.disRecSectorsWithLosses &&
																<>
																	<Link to={`/disaster-record/edit-sub/${item.disRecSectorsdisasterRecordId}/losses?sectorId=${item.disRecSectorsSectorId}`}>Yes</Link>
																</>
															}
														</td>
														<td>
															{item.disRecSectorsLossesCost &&
																<>

																	{item.disRecSectorsLossesCost} {item.disRecSectorsLossesCostCurrency}
																</>
															}
														</td>
														<td>
															{item.disRecSectorsWithDisruption &&
																<>
																	<Link to={`/disaster-record/edit-sub/${item.disRecSectorsdisasterRecordId}/disruptions?sectorId=${item.disRecSectorsSectorId}`}>Yes</Link>
																</>
															}
														</td>
														<td>
															{ld.item && ld.item.id && (
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
														<tr key={index}>
															<td>{item.noneccoId.slice(0, 8)}</td>
															<td>
																{item.categoryTreeDisplay}
															</td>
															<td>{item.noneccoDesc.slice(0, 300)}</td>
															<td>
																{ld.item && ld.item.id && (
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
