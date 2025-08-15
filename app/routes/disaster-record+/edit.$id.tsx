import {
	authLoaderGetUserForFrontend,
	authLoaderWithPerm,
	authActionWithPerm,
} from "~/util/auth";
import type { ActionFunctionArgs } from "@remix-run/node";
import {
	disasterRecordsCreate,
	disasterRecordsUpdate,
	disasterRecordsById,
	disasterRecordsByIdTx,
	getHumanEffectRecordsById,
	DisasterRecordsFields,
} from "~/backend.server/models/disaster_record";

import { useLoaderData, Link, redirect } from "@remix-run/react";

import {
	fieldsDef,
	DisasterRecordsForm,
	route,
} from "~/frontend/disaster-record/form";

import { nonecoLossesFilderBydisasterRecordsId } from "~/backend.server/models/noneco_losses";
import { sectorsFilderBydisasterRecordsId } from "~/backend.server/models/disaster_record__sectors";
import { getAffectedByDisasterRecord } from "~/backend.server/models/analytics/affected-people-by-disaster-record";

import { FormScreen } from "~/frontend/form";

import { createOrUpdateAction } from "~/backend.server/handlers/form/form";
import { getTableName, eq, sql } from "drizzle-orm";
import { disasterRecordsTable, divisionTable } from "~/drizzle/schema";

import { dr } from "~/db.server";
import { dataForHazardPicker } from "~/backend.server/models/hip_hazard_picker";

import { contentPickerConfig } from "./content-picker-config";

import { ContentRepeaterUploadFile } from "~/components/ContentRepeater/UploadFile";
import { DeleteButton } from "~/frontend/components/delete-dialog";
import { getCountryAccountsIdFromSession, getCountrySettingsFromSession } from "~/util/session";
import { buildTree } from "~/components/TreeView";

export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	const { request, params } = loaderArgs;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	if (!countryAccountsId) {
		throw redirect("Unauthorized access", { status: 401 });
	}
	if (!params.id) {
		throw "Route does not have $id param";
	}
	
	const initializeNewTreeView = async (): Promise<any[]> => {
		const idKey = "id";
		const parentKey = "parentId";
		const nameKey = "name";
		// Filter divisions by tenant context for security
		const rawData = await dr
			.select()
			.from(divisionTable)
			.where(sql`country_accounts_id = ${countryAccountsId}`);
		return buildTree(rawData, idKey, parentKey, nameKey, "en", [
			"geojson",
			"importId",
			"nationalId",
			"level",
			"name",
		]);
	};

	const hip = await dataForHazardPicker();

	let user = authLoaderGetUserForFrontend(loaderArgs);

	const divisionGeoJSON = await dr.execute(sql`
		SELECT id, name, geojson
		FROM division
		WHERE parent_id IS NULL
		AND geojson IS NOT NULL
		AND country_accounts_id = ${countryAccountsId};
    `);

	if (params.id === "new") {
		const treeData = await initializeNewTreeView();
		let ctryIso3: string = "";
		const settings = await getCountrySettingsFromSession(request);
		if (settings) {
			ctryIso3 = settings.dtsInstanceCtryIso3;
		}
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
			user,
			dbDisRecHumanEffectsSummaryTable: null,
		};
	}

	const item = await disasterRecordsById(params.id);
	if (!item || item.countryAccountsId !== countryAccountsId) {
		throw new Response("Not Found", { status: 404 });
	}

	const dbNonecoLosses = await nonecoLossesFilderBydisasterRecordsId(params.id);
	const dbDisRecSectors = await sectorsFilderBydisasterRecordsId(params.id);
	const dbDisRecHumanEffects = await getHumanEffectRecordsById(
		params.id,
		countryAccountsId
	);
	const dbDisRecHumanEffectsSummaryTable = await getAffectedByDisasterRecord(
		dr,
		params.id
	);

	// Define Keys Mapping (Make it Adaptable)
	const treeData = await initializeNewTreeView();
	let ctryIso3: string = "";
	const settings = await getCountrySettingsFromSession(loaderArgs.request);
	if (settings) {
		ctryIso3 = settings.dtsInstanceCtryIso3;
	}

	const cpDisplayName = await contentPickerConfig.selectedDisplay(
		dr,
		item.disasterEventId
	);

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
		user,
		dbDisRecHumanEffectsSummaryTable: dbDisRecHumanEffectsSummaryTable,
	};
});

export const action = authActionWithPerm(
	"EditData",
	async (args: ActionFunctionArgs) => {
		const { request } = args;
		const countryAccountsId = await getCountryAccountsIdFromSession(request);

		const updateWithTenant = async (tx: any, id: string, fields: any) => {
			return disasterRecordsUpdate(tx, id, fields, countryAccountsId);
		};
		const getByIdWithTenant = async (tx: any, id: string) => {
			const record = await disasterRecordsByIdTx(tx, id);
			if (!record) {
				throw new Error(
					"Record not found or you don't have permission to access it"
				);
			}
			return record;
		};
		// Use the createAction function with our tenant-aware wrappers
		const actionHandler = createOrUpdateAction<DisasterRecordsFields>({
			fieldsDef,
			create: async (tx: any, fields: any) => {
				return disasterRecordsCreate(tx, fields);
			},
			update: updateWithTenant,
			getById: getByIdWithTenant,
			redirectTo: (id) => `${route}/${id}`,
			tableName: getTableName(disasterRecordsTable),
			action: (isCreate) =>
				isCreate ? "Create disaster record" : "Update disaster record",
			postProcess: async (id, data) => {
				// Ensure attachments is an array, even if it's undefined or empty
				const attachmentsArray = Array.isArray(data?.attachments)
				? data.attachments
				: [];
				
				const save_path = `/uploads/disaster-record/${id}`;
				const save_path_temp = `/uploads/temp`;
				
				// Process the attachments data
				const processedAttachments = ContentRepeaterUploadFile.save(
					attachmentsArray,
					save_path_temp,
					save_path
				);
				
				// Update the `attachments` field in the database
				await dr
				.update(disasterRecordsTable)
				.set({
					attachments: processedAttachments || [], // Ensure it defaults to an empty array if undefined
				})
					.where(eq(disasterRecordsTable.id, id));
				},
				countryAccountsId,
			});

			return actionHandler(args);
		}
	);
	
	export default function Screen() {
	const ld = useLoaderData<typeof loader>();

	return (
		<>
			<FormScreen
				fieldsDef={fieldsDef}
				formComponent={(props: any) => (
					<DisasterRecordsForm
						{...props}
						hip={ld.hip}
						treeData={ld.treeData}
						ctryIso3={ld.ctryIso3}
						cpDisplayName={ld.cpDisplayName}
						divisionGeoJSON={ld.divisionGeoJSON}
						user={ld.user}
					/>
				)}
			/>
			{ld.item && (
				<>
					<div>&nbsp;</div>
					<section>
						<div className="mg-container">
							<fieldset className="dts-form__section">
								<div className="dts-form__intro">
									<legend className="dts-heading-3">Human Effects</legend>
								</div>
								<div className="dts-form__body no-border-bottom">
									<div className="dts-form__section-remove">
										<Link
											to={`/disaster-record/edit-sub/${ld.item.id}/human-effects`}
										>
											[ Add new record ]
										</Link>
										&nbsp;
									</div>
									<div className="mg-grid mg-grid__col-1">
										<div className="dts-form-component">
											<table className="dts-table table-border">
												<thead>
													<tr>
														<th></th>
														<th></th>
														<th></th>
														<th className="center" colSpan={2}>
															Affected (Old DesInventar)
														</th>
														<th></th>
														<th></th>
													</tr>
													<tr>
														<th>Deaths</th>
														<th>Injured</th>
														<th>Missing</th>
														<th>Directly</th>
														<th>Indirectly</th>
														<th>Displaced</th>
														<th>Actions</th>
													</tr>
												</thead>
												<tbody>
													<tr>
														<td>
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.deaths == "number" && (
																<>
																	<Link
																		to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Deaths`}
																	>
																		{ld.dbDisRecHumanEffectsSummaryTable.deaths}
																	</Link>
																</>
															)}
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.deaths == "boolean" &&
																ld.dbDisRecHumanEffectsSummaryTable.deaths && (
																	<>
																		<Link
																			to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Deaths`}
																		>
																			Yes
																		</Link>
																	</>
																)}
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.deaths == "boolean" &&
																!ld.dbDisRecHumanEffectsSummaryTable.deaths && (
																	<>-</>
																)}
														</td>
														<td>
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.injured == "number" && (
																<>
																	<Link
																		to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Injured`}
																	>
																		{
																			ld.dbDisRecHumanEffectsSummaryTable
																				.injured
																		}
																	</Link>
																</>
															)}
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.injured == "boolean" &&
																ld.dbDisRecHumanEffectsSummaryTable.injured && (
																	<>
																		<Link
																			to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Injured`}
																		>
																			Yes
																		</Link>
																	</>
																)}
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.injured == "boolean" &&
																!ld.dbDisRecHumanEffectsSummaryTable
																	.injured && <>-</>}
														</td>
														<td>
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.missing == "number" && (
																<>
																	<Link
																		to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Missing`}
																	>
																		{
																			ld.dbDisRecHumanEffectsSummaryTable
																				.missing
																		}
																	</Link>
																</>
															)}
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.missing == "boolean" &&
																ld.dbDisRecHumanEffectsSummaryTable.missing && (
																	<>
																		<Link
																			to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Missing`}
																		>
																			Yes
																		</Link>
																	</>
																)}
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.missing == "boolean" &&
																!ld.dbDisRecHumanEffectsSummaryTable
																	.missing && <>-</>}
														</td>
														<td>
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.directlyAffected == "number" && (
																<>
																	<Link
																		to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Affected`}
																	>
																		{
																			ld.dbDisRecHumanEffectsSummaryTable
																				.directlyAffected
																		}
																	</Link>
																</>
															)}
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.directlyAffected == "boolean" &&
																ld.dbDisRecHumanEffectsSummaryTable
																	.directlyAffected && (
																	<>
																		<Link
																			to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Affected`}
																		>
																			Yes
																		</Link>
																	</>
																)}
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.directlyAffected == "boolean" &&
																!ld.dbDisRecHumanEffectsSummaryTable
																	.directlyAffected && <>-</>}
														</td>
														<td>
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.indirectlyAffected == "number" && (
																<>
																	<Link
																		to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Affected`}
																	>
																		{
																			ld.dbDisRecHumanEffectsSummaryTable
																				.indirectlyAffected
																		}
																	</Link>
																</>
															)}
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.indirectlyAffected == "boolean" &&
																ld.dbDisRecHumanEffectsSummaryTable
																	.indirectlyAffected && (
																	<>
																		<Link
																			to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Affected`}
																		>
																			Yes
																		</Link>
																	</>
																)}
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.indirectlyAffected == "boolean" &&
																!ld.dbDisRecHumanEffectsSummaryTable
																	.indirectlyAffected && <>-</>}
														</td>
														<td>
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.displaced == "number" && (
																<>
																	<Link
																		to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Displaced`}
																	>
																		{
																			ld.dbDisRecHumanEffectsSummaryTable
																				.displaced
																		}
																	</Link>
																</>
															)}
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.displaced == "boolean" &&
																ld.dbDisRecHumanEffectsSummaryTable
																	.displaced && (
																	<>
																		<Link
																			to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Displaced`}
																		>
																			Yes
																		</Link>
																	</>
																)}
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.displaced == "boolean" &&
																!ld.dbDisRecHumanEffectsSummaryTable
																	.displaced && <>-</>}
														</td>
														<td>
															<DeleteButton
																action={`/disaster-record/edit-sub/${ld.item.id}/human-effects/delete-all-data`}
																label="Delete"
															/>
														</td>
													</tr>
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
									<legend className="dts-heading-3">Sector Effects</legend>
								</div>
								<div className="dts-form__body no-border-bottom">
									<div className="dts-form__section-remove">
										<Link to={`/disaster-record/edit-sec/${ld.item.id}`}>
											[ Add new record ]
										</Link>
									</div>
									<div className="mg-grid mg-grid__col-1">
										<div className="dts-form-component">
											<table className="dts-table table-border">
												<thead>
													<tr>
														<th></th>
														<th></th>
														<th className="center" colSpan={3}>
															Damage
														</th>
														<th className="center" colSpan={2}>
															Losses
														</th>
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
													{ld.recordsDisRecSectors &&
														Array.isArray(ld.recordsDisRecSectors) &&
														ld.recordsDisRecSectors.map((item, index) => (
															<tr key={index}>
																<td>{item.disRecSectorsId.slice(0, 8)}</td>
																<td>{item.sectorTreeDisplay}</td>
																<td>
																	{item.disRecSectorsWithDamage && (
																		<>
																			<Link
																				to={`/disaster-record/edit-sub/${item.disRecSectorsdisasterRecordId}/damages?sectorId=${item.disRecSectorsSectorId}`}
																			>
																				Yes
																			</Link>
																		</>
																	)}
																</td>
																<td>
																	{item.disRecSectorsDamageRecoveryCost && (
																		<>
																			{item.disRecSectorsDamageRecoveryCost}{" "}
																			{
																				item.disRecSectorsDamageRecoveryCostCurrency
																			}
																		</>
																	)}
																</td>
																<td>
																	{item.disRecSectorsDamageCost && (
																		<>
																			{item.disRecSectorsDamageCost}{" "}
																			{item.disRecSectorsDamageCostCurrency}
																		</>
																	)}
																</td>
																<td>
																	{item.disRecSectorsWithLosses && (
																		<>
																			<Link
																				to={`/disaster-record/edit-sub/${item.disRecSectorsdisasterRecordId}/losses?sectorId=${item.disRecSectorsSectorId}`}
																			>
																				Yes
																			</Link>
																		</>
																	)}
																</td>
																<td>
																	{item.disRecSectorsLossesCost && (
																		<>
																			{item.disRecSectorsLossesCost}{" "}
																			{item.disRecSectorsLossesCostCurrency}
																		</>
																	)}
																</td>
																<td>
																	{item.disRecSectorsWithDisruption && (
																		<>
																			<Link
																				to={`/disaster-record/edit-sub/${item.disRecSectorsdisasterRecordId}/disruptions?sectorId=${item.disRecSectorsSectorId}`}
																			>
																				Yes
																			</Link>
																		</>
																	)}
																</td>
																<td>
																	{ld.item && ld.item.id && (
																		<>
																			<Link
																				to={`/disaster-record/edit-sec/${ld.item.id}/delete/?id=${item.disRecSectorsId}`}
																			>
																				Delete
																			</Link>
																			&nbsp;|&nbsp;
																			<Link
																				to={`/disaster-record/edit-sec/${ld.item.id}/?id=${item.disRecSectorsId}`}
																			>
																				Edit
																			</Link>
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
											<Link to={`${route}/non-economic-losses/${ld.item.id}`}>
												[ Add new record ]
											</Link>
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
														{ld.recordsNonecoLosses &&
															Array.isArray(ld.recordsNonecoLosses) &&
															ld.recordsNonecoLosses.map((item, index) => (
																<tr key={index}>
																	<td>{item.noneccoId.slice(0, 8)}</td>
																	<td>{item.categoryTreeDisplay}</td>
																	<td>{item.noneccoDesc.slice(0, 300)}</td>
																	<td>
																		{ld.item && ld.item.id && (
																			<>
																				<Link
																					to={`${route}/non-economic-losses/${ld.item.id}/delete/?id=${item.noneccoId}`}
																				>
																					Delete
																				</Link>
																				&nbsp;|&nbsp;
																				<Link
																					to={`${route}/non-economic-losses/${ld.item.id}/?id=${item.noneccoId}`}
																				>
																					Edit
																				</Link>
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
				</>
			)}
		</>
	);
}
