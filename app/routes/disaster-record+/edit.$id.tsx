import {authActionWithPerm, authLoaderWithPerm} from "~/util/auth";
import {
	disasterRecordsCreate,
	disasterRecordsUpdate,
	disasterRecordsById,
	disasterRecordsByIdTx,
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
import { sectorsFilderBydisasterRecordsId } from "~/backend.server/models/disaster_record__sectors";



import {
	FormScreen
} from "~/frontend/form";

import {
	createLoader,
	createAction
} from "~/backend.server/handlers/form";
import { getTableName } from "drizzle-orm";
import { disasterRecordsTable } from "~/drizzle/schema";

import { buildTree } from "~/components/TreeView";
import { dr } from "~/db.server"; // Drizzle ORM instance
import { divisionTable } from "~/drizzle/schema";

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
	const dbDisRecSectos = await sectorsFilderBydisasterRecordsId(params.id);
	
	// console.log("recordsNonecoLosses", dbNonecoLosses);
	console.log("recordsNonecoLosses", dbDisRecSectos);

	// Define Keys Mapping (Make it Adaptable)
    const idKey = "id";
    const parentKey = "parentId";
    const nameKey = "name";
    const rawData = await dr.select().from(divisionTable);
    const treeData = buildTree(rawData, idKey, parentKey, nameKey, ["fr", "de", "en"], "en", ["geojson"]);

    return {
		item, 
		recordsNonecoLosses: dbNonecoLosses, 
		recordsDisRecSectors: dbDisRecSectos,
		treeData
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
		recordsDisRecSectors: any,
		treeData: any[]
	}>();
	console.log(ld);

	return (
		<>
			<FormScreen
				fieldsDef={fieldsDef}
				formComponent={(props: any) => <DisasterRecordsForm {...props} treeData={ld.treeData} />}
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
										<Link to={`/disaster-record/edit-sub/${ld.item.id}/human-effects`}>[ Add new record ]</Link>
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
							</div>
							<div className="dts-form__body">
								<div className="dts-form__section-remove">
									<Link to={`/disaster-record/edit-sec/${ld.item.id}`}>[ Add new record ]</Link>
								</div>
								{ld.recordsDisRecSectors && Array.isArray(ld.recordsDisRecSectors) && ld.recordsDisRecSectors.map((item, index) => (
									<div key={ index }>
										<h3 className="dts-heading-3">
											<Link to={`/disaster-record/edit-sec/${item.disRecSectorsdisasterRecordId}/?id=${item.disRecSectorsId}`}>
												{ item.catNameParent2 ? item.catNameParent2 + ' > ' + item.catNameParent1 : item.catNameParent1 }
												&nbsp; &gt; &nbsp;
												{ item.catName }
											</Link>
										</h3>
										{ item.disRecSectorsWithDamage &&
											<>
												<h4 className="dts-heading-4">
													Damages

												</h4>
											</>
										}
										{ item.disRecSectorsWithLosses &&
											<>
												<h4 className="dts-heading-4">Losses</h4>
											</>
										}
										{ item.disRecSectorsWithDisruption && (
											<>
												<h4 className="dts-heading-4">
													Disruption &nbsp;
													{ item.disruptionResponseCost && (
														<>with response cost: { item.disruptionResponseCost } { item.disruptionResponseCostCurrency }</>
													)}
													&nbsp;
													|
													&nbsp;
													<Link to={`/disaster-record/edit-sub/${item.disRecSectorsdisasterRecordId}/disruptions?sectorId=${item.disRecSectorsId}`}>[ add ]</Link>
												</h4>
											</>
										)}
									</div>
									
								))}

								
								
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
											<table className="dts-table table-border">
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
