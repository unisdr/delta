import {
	Link
} from "@remix-run/react";

import {DisasterRecordsFields, DisasterRecordsViewModel} from "~/backend.server/models/disaster_record"

import {formatDate} from "~/util/date";

import {
	Field,
	UserFormProps,
	FormInputDef,
	FieldsView,
	FormView,
	ViewComponent
} from "~/frontend/form";

import {useEffect, useRef} from 'react';
import {approvalStatusField} from "~/frontend/approval";

import {ContentRepeater} from "~/components/ContentRepeater";
import {previewMap, previewGeoJSON} from "~/components/ContentRepeater/controls/mapper";
import {TreeView} from "~/components/TreeView";

import { ContentPicker } from "~/components/ContentPicker";
import { contentPickerConfig } from "~/routes/disaster-record+/content-picker-config.js";
import AuditLogHistory from "~/components/AuditLogHistory";

export const route = "/disaster-record"

export const fieldsDefCommon = [
	approvalStatusField,
	{key: "disasterEventId", label: "Disaster Event", type: "other"},
	{key: "locationDesc", label: "Location Description", type: "text"},
	{key: "startDate", label: "Start Date (Possible to record only year, year + month, or complete year, month and days)", type: "text", uiRow: {}},
	{key: "endDate", label: "End Date (Possible to record only year, year + month, or complete year, month and days)", type: "text"},
	{key: "localWarnInst", label: "Local warning and local instructions ( recommended actions)", type: "text", uiRowNew: true},
	{key: "primaryDataSource", label: "Primary data source", type: "text", required: true, uiRow: {}},
	{key: "otherDataSource", label: "Other data sources", type: "text"},
	{key: "fieldAssessDate", label: "Field assessment conducted", type: "date", uiRow: {}},
	{key: "assessmentModes", label: "Assessments methodologies", type: "textarea"},
	{key: "originatorRecorderInst", label: "Recording institution", type: "text", required: true, uiRow: {}},
	{key: "validatedBy", label: "Validated by", type: "text", required: true},
	{key: "checkedBy", label: "Checked by", type: "text", uiRow: {}},
	{key: "dataCollector", label: "Data collector", type: "text"},
	{key: "spatialFootprint", label: "Spatial Footprint", type: "other", psqlType: "jsonb", uiRowNew: true},
] as const;

export const fieldsDef: FormInputDef<DisasterRecordsFields>[] = [
	...fieldsDefCommon
];

export const fieldsDefView: FormInputDef<DisasterRecordsViewModel>[] = [
	...fieldsDefCommon,
	{key: "createdAt", label: "", type: "other"},
	{key: "updatedAt", label: "", type: "other"},
];

interface DisasterRecordsFormProps extends UserFormProps<DisasterRecordsFields> {
	parent?: DisasterRecordsViewModel;
	treeData: any[];
	cpDisplayName?: string;
}

export function disasterRecordsLabel(args: {
	id?: string;
	disasterEventId?: string;
}): string {
	const disasterEventId = args.disasterEventId;
	const shortId = args.id ? " " + args.id.slice(0, 8) : "";
	return disasterEventId + " " + shortId;
}

export function disasterRecordsLongLabel(args: {
	id?: string;
	disasterEventId?: string;
}) {
	return <ul>
		<li>ID: {args.id}</li>
		<li>Disaster Event: {args.disasterEventId || "-"}</li>
	</ul>
}
export function disasterRecordsLink(args: {
	id: string;
	disasterEventId: string;
}) {
	return <Link to={`/disaster-record/${args.id}`}>
		{disasterRecordsLabel(args)}
	</Link>
}

export function DisasterRecordsForm(props: DisasterRecordsFormProps) {
	const {fields, treeData, cpDisplayName} = props;
	const treeViewRef = useRef<any>(null);

	useEffect(() => {
	}, []);

	const contentReapeaterRef = useRef<any>(null);

	return (
		<>
			<FormView
				path={route}
				edit={props.edit}
				id={props.id}
				plural="Disaster Records"
				singular="Disaster Record"
				errors={props.errors}
				fields={props.fields}
				fieldsDef={fieldsDef}
				override={{
					disasterEventId: (
						<Field key="disasterEventId" label="Disaster Event">
							<ContentPicker {...contentPickerConfig} value={fields.disasterEventId || ""} displayName={cpDisplayName || ""}/>
						</Field>
					),
					spatialFootprint: (
						<Field key="spatialFootprint" label="">
							<ContentRepeater
								caption="Spatial Footprint"
								ref={contentReapeaterRef}
								id="spatialFootprint"
								mapper_preview={true}
								table_columns={[
									{type: "dialog_field", dialog_field_id: "title", caption: "Title", width: "40%"},
									{
										type: "custom",
										caption: "Option",
										render: (item) => {
											if (item.map_option === "Map Coordinates") {
												return (
													<>
														<span>Map Coordinates</span>
													</>
												);
											} else if (item.map_option === "Geographic Level") {
												return (
													<>
														<span>Geographic Level</span>
													</>
												);
											}
										},
										width: "40%",
									},
									{type: "action", caption: "Action", width: "20%"},
								]}
								dialog_fields={[
									{id: "title", caption: "Title", type: "input", required: true},
									{
										id: "map_option",
										caption: "Option",
										type: "option",
										options: ["Map Coordinates", "Geographic Level"], 
										onChange: (e: any) => {
											const value = e.target.value;
	
											const mapsCoordsField = document.getElementById("spatialFootprint_map_coords") as HTMLInputElement;
											const geoLevelField = document.getElementById("spatialFootprint_geographic_level") as HTMLInputElement;
											const mapsCoordsFieldComponent = mapsCoordsField.closest(".dts-form-component") as HTMLElement;
											const geoLevelFieldComponent = geoLevelField.closest(".dts-form-component") as HTMLElement;
											if (value === "Map Coordinates") {
												mapsCoordsFieldComponent.style.setProperty("display", "block");
												geoLevelFieldComponent.style.setProperty("display", "none");
											} else if (value === "Geographic Level") {
												mapsCoordsFieldComponent.style.setProperty("display", "none");
												geoLevelFieldComponent.style.setProperty("display", "block");
											}
										},
										show: true
									},
									{id: "map_coords", caption: "Map Coordinates", type: "mapper", placeholder: "", mapperGeoJSONField: "geojson"},
									{
										id: "geographic_level", caption: "Geographic Level", type: "custom",
										render: (data: any, handleFieldChange: any, formData: any) => {
											return (
												<>
													<div className="input-group">
														<div id="spatialFootprint_geographic_level_container" className="wrapper">
															<span onClick={() => {previewGeoJSON(formData['geojson'])}}>{data}</span>
															<a href="#" className="btn" onClick={(e) => {e.preventDefault(); treeViewRef.current?.treeViewOpen(e);}}><img src="/assets/icons/globe.svg" alt="Globe SVG File" title="Globe SVG File" />Select</a>
														</div>
														<textarea id="spatialFootprint_geographic_level" name="spatialFootprint_geographic_level" className="dts-hidden-textarea" style={{display: "none"}}></textarea>
													</div>
												</>
											);
										}
									},
									{id: "geojson", caption: "Map Coordinates / Geographic Level", type: "hidden", required: true},
								]}
								data={(() => {
									try {
									  let footprints: any[] = [];
								  
									  if (props?.fields?.spatialFootprint) {
										if (Array.isArray(props.fields.spatialFootprint)) {
										  footprints = props.fields.spatialFootprint;
										} else if (typeof props.fields.spatialFootprint === "string") {
										  try {
											const parsed = JSON.parse(props.fields.spatialFootprint);
											footprints = Array.isArray(parsed) ? parsed : [];
										  } catch (error) {
											console.error("Invalid JSON in spatialFootprint:", error);
											footprints = [];
										  }
										} else {
										  console.warn("Unexpected type for spatialFootprint:", typeof props.fields.spatialFootprint);
										  footprints = [];
										}
									  }
								  
									  return footprints;
									} catch (error) {
									  console.error("Error processing spatialFootprint:", error);
									  return [];
									}
								  })()}								  
								onChange={(items: any) => {
									try {
										const parsedItems = Array.isArray(items) ? items : (items);
									} catch {
										console.error("Failed to process items.");
									}
								}}
							/>
							<TreeView
								ref={treeViewRef}
								treeData={treeData ?? []}
								caption="Select Geographic level"
								rootCaption="Geographic levels"
								onApply={
									(selectedItems: any) => {
										if (contentReapeaterRef.current.getDialogRef()) {
											contentReapeaterRef.current.getDialogRef().querySelector('#spatialFootprint_geographic_level_container span').textContent = selectedItems.names;
											selectedItems.data.map((item: any) => {
												if (item.id == selectedItems.selectedId) {
													contentReapeaterRef.current.getDialogRef().querySelector('#spatialFootprint_geographic_level').value = item.geojson;
													const setField = {id: "geojson", value: JSON.parse(item.geojson)};
													contentReapeaterRef.current.handleFieldChange(setField, JSON.parse(item.geojson));
	
													const setFieldGoeLevel = {id: "geographic_level", value: selectedItems.names};
													contentReapeaterRef.current.handleFieldChange(setFieldGoeLevel, selectedItems.names);
												}
											});
										}
									}
								}
								onRenderItemName={
									(item: any) => {
										return (typeof (item.hiddenData.geojson) == "object") ? {disable: "false"} : {disable: "true"};
									}
								}
								appendCss={
									`
										ul.tree li div[disable="true"] {
											color: #ccc;
										}
										ul.tree li div[disable="true"] .btn-face.select {
											display: none;
										}
									`
								}
								disableButtonSelect={true}
							/>
						</Field>
					),
				}}
			/>
		</>);
}

interface DisasterRecordsViewProps {
	item: DisasterRecordsViewModel;
	isPublic: boolean;
	auditLogs?: any[];
}

export function DisasterRecordsView(props: DisasterRecordsViewProps) {
	const item = props.item;
	const auditLogs = props.auditLogs;

	const handlePreviewMap = (e: any) => {
		e.preventDefault();
		previewMap(JSON.stringify((props.item.spatialFootprint)));
	};

	return (
		<ViewComponent
			isPublic={props.isPublic}
			path={route}
			id={item.id}
			plural="Disaster Records"
			singular="Disaster Record"
			// extraActions={
			// 	<ul>
			// 		<li><Link to={"/disaster-record/edit-sub/" + item.id + "/human-effects"}>Human Direct Effects</Link></li>
			// 		<li><Link to={"/disaster-record/edit-sub/" + item.id + "/damages?sectorId=11"}>Damages (Sector id11)</Link></li>
			// 		<li><Link to={"/disaster-record/edit-sub/" + item.id + "/losses?sectorId=11"}>Losses (Sector id11)</Link></li>
			// 		<li><Link to={"/disaster-record/edit-sub/" + item.id + "/disruptions?sectorId=11"}>Disruptions (Sector id11)</Link></li>
			// 	</ul>
			// }
		>
			<FieldsView
				def={fieldsDefView}
				fields={item}
				override={{
					createdAt: (
						<p key="createdAt">Created at: {formatDate(item.createdAt)}</p>
					),
					updatedAt: (
						<p key="updatedAt">Updated at: {formatDate(item.updatedAt)}</p>
					),
					disasterEventId: (
						<p key="disasterEventId">Disaster Event: {(item as any).cpDisplayName || ""}</p>
					),
					spatialFootprint: (
						<div>
							<p>Spatial Footprint:</p>
							{(() => {
								try {
									let footprints: any[] = [];

									if (props?.item?.spatialFootprint) {
									if (Array.isArray(props.item.spatialFootprint)) {
										footprints = props.item.spatialFootprint;
									} else if (typeof props.item.spatialFootprint === "string") {
										try {
										const parsed = JSON.parse(props.item.spatialFootprint);
										footprints = Array.isArray(parsed) ? parsed : [];
										} catch (error) {
										console.error("Invalid JSON in spatialFootprint:", error);
										footprints = [];
										}
									} else {
										console.warn("Unexpected type for spatialFootprint:", typeof props.item.spatialFootprint);
										footprints = [];
									}
									}
									return (
										<>
											<table style={{borderCollapse: "collapse", width: "100%", border: "1px solid #ddd", marginBottom: "2rem"}}>
												<thead>
													<tr style={{backgroundColor: "#f4f4f4"}}>
														<th style={{border: "1px solid #ddd", padding: "8px", textAlign: "left", fontWeight: "normal"}}>Title</th>
														<th style={{border: "1px solid #ddd", padding: "8px", textAlign: "left", fontWeight: "normal"}}>Option</th>
													</tr>
												</thead>
												<tbody>
													{footprints.map((footprint: any, index: number) => {
														try {
															const option = footprint.map_option || "Unknown Option";
															return (
																<tr key={footprint.id || index}>
																	<td style={{border: "1px solid #ddd", padding: "8px"}}>
																		<a href="#" onClick={(e) => {e.preventDefault(); const newGeoJson = [{"geojson": footprint.geojson}]; previewMap(JSON.stringify(newGeoJson));}}>
																			{footprint.title}
																		</a>
																	</td>
																	<td style={{border: "1px solid #ddd", padding: "8px"}}>
																		<a href="#" onClick={(e) => {e.preventDefault(); const newGeoJson = footprint.geojson; previewGeoJSON(JSON.stringify(newGeoJson));}}>
																			{option}
																		</a>
																	</td>
																</tr>
															);
														} catch {
															return (
																<tr key={index}>
																	<td style={{border: "1px solid #ddd", padding: "8px"}}>{footprint.title}</td>
																	<td style={{border: "1px solid #ddd", padding: "8px", color: "red"}}>Invalid Data</td>
																</tr>
															);
														}
													})}
												</tbody>
											</table>
											<button
												onClick={handlePreviewMap}
												style={{
													padding: "10px 16px",
													border: "1px solid #ddd",
													backgroundColor: "#f4f4f4",
													color: "#333",
													fontSize: "14px",
													fontWeight: "normal",
													borderRadius: "4px",
													marginBottom: "2rem",
													cursor: "pointer"
												}}
											>
												Map Preview
											</button>
										</>
									);

								} catch (error) {
									console.error("Error processing spatialFootprint:", error);
									return <p>Error loading spatialFootprint data.</p>;
								  }
								})()}
						</div>
					),
				}}
			/>
			{/* Add Audit Log History at the end */}
			<br/>
			{auditLogs && auditLogs.length > 0 && (
				<>
					<h3>Audit Log History</h3>
					<AuditLogHistory auditLogs={auditLogs} />
				</>
			)}
		</ViewComponent>
	);
}


