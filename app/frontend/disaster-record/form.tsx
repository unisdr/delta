import {
	Link
} from "@remix-run/react";

import {DisasterRecordsFields, DisasterRecordsViewModel} from "~/backend.server/models/disaster_record"

import {formatDate} from "~/util/date";

import {
	Field,
	FieldErrors,
	UserFormProps,
	FormInputDef,
	FieldsView,
	FormView,
	ViewComponent
} from "~/frontend/form";

import {useEffect, useState, useRef} from 'react';
import {approvalStatusField} from "~/frontend/approval";

import {MainContainer} from "~/frontend/container";

import { ContentRepeater } from "~/components/ContentRepeater";
import {  previewMap, previewGeoJSON } from "~/components/ContentRepeater/controls/mapper";
import { TreeView } from "~/components/TreeView";

export const route = "/disaster-record"

export const fieldsDefCommon = [
	approvalStatusField,
	{key: "disasterEventId", label: "Disaster Event", type: "text", required: true},
	{key: "locationDesc", label: "Location Description", type: "text"},
	{key: "startDate", label: "Start Data (Possible to record only year, year + month, or complete year, month and days)", type: "text"},
	{key: "endDate", label: "End Data (Possible to record only year, year + month, or complete year, month and days)", type: "text"},
	{key: "localWarnInst", label: "Local warning and local instructions ( recommended actions)", type: "text"},
	{key: "assessmentModes", label: "Assessments modes", type: "text"},
	{key: "originatorRecorderInst", label: "Originator/ recorder institution", type: "text", required: true},
	{key: "spatialFootprint", label: "Spatial Footprint", type: "other"},
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
	const { fields, treeData } = props;
	const treeViewRef = useRef<any>(null);

	useEffect(() => {
	}, []);

	const contentReapeaterRef = useRef<any>(null);

	return (<>
		<FormView
			path={route}
			edit={props.edit}
			id={props.id}
			plural="Disaster Records"
			singular={`${props.edit ? "Edit" : "Add"} Disaster Record`}
			errors={props.errors}
			fields={props.fields}
			fieldsDef={fieldsDef}
			override={{
				spatialFootprint: (
					<Field key="spatialFootprint" label="">
						<ContentRepeater
							caption="Spatial Footprint"
							ref={contentReapeaterRef}
							id="spatialFootprint"
							mapper_preview={true}
							debug={true}
							table_columns={[
								{ type: "dialog_field", dialog_field_id: "title", caption: "Title", width: "40%" },
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
								{ type: "action", caption: "Action", width: "20%" },
							]}
							dialog_fields={[
								{ id: "title", caption: "Title", type: "input", required: true },
								{
									id: "map_option",
									caption: "Option",
									type: "option",
									options: ["Map Coordinates", "Geographic Level"],
									onChange: (e: any) => {
										const value = e.target.value;

										const mapsCoordsField = document.getElementById("spatialFootprint_map_coords") as HTMLInputElement;
										const geoLevelField = document.getElementById("spatialFootprint_geographic_level") as HTMLInputElement;
										
										if (value === "Map Coordinates") {
											mapsCoordsField.closest(".dts-form-component")?.style.setProperty("display", "block");
											geoLevelField.closest(".dts-form-component")?.style.setProperty("display", "none");
										} else if (value === "Geographic Level") {
											mapsCoordsField.closest(".dts-form-component")?.style.setProperty("display", "none");
											geoLevelField.closest(".dts-form-component")?.style.setProperty("display", "block");
										}
									},
								},
								{ id: "map_coords", caption: "Map Coordinates", type: "mapper", placeholder: "", mapperGeoJSONField: "geojson" },
								{ id: "geographic_level", caption: "Geographic Level", type: "custom",
									render: (data: any, handleFieldChange: any, formData: any) => {
										return (
											<>
											  <div style={{ display: "flex", alignItems: "center", gap: "1%" }}>
												{/* Spatial Footprint Container */}
												<div
												  id="spatialFootprint_geographic_level_container"
												  style={{
													position: "relative",
													width: "100%",
													padding: "0.4rem 0.8rem",
													backgroundColor: "white",
													border: "1px solid #cccccc",
													borderRadius: "6px",
													color: "#999",
													minHeight: "3.5rem",
													overflow: "hidden",
													cursor: "pointer",
												  }}
												>
												  <span onClick={() => { previewGeoJSON(formData['geojson']) }}>{data}</span>
												  {/* Select Geographic Level Button */}
												  <a
													href="#"
													style={{
													  width: "auto",
													  zIndex: 1000,
													  textAlign: "center",
													  padding: "0.7rem 0.8rem",
													  color: "#000",
													  textDecoration: "none",
													  borderRadius: "4px",
													  display: "inline-flex",
													  alignItems: "center",
													  justifyContent: "center",
													  backgroundColor: "#cccccc",
													  position: "absolute",
													  top: "-2px",
													  right: "-2px",
													}}
													onClick={(e) => {
													  e.preventDefault();
													  treeViewRef.current?.treeViewOpen(e);
													}}
												  >
													<img
													  src="/assets/icons/globe.svg"
													  alt="Globe SVG File"
													  title="Globe SVG File"
													  style={{ width: "20px", height: "20px", marginRight: "0.5rem" }}
													/>
													Select
												  </a>
												</div>
										  
												{/* Hidden Textarea */}
												<textarea
												  id="spatialFootprint_geographic_level"
												  name="spatialFootprint_geographic_level"
												  className="dts-hidden-textarea"
												  style={{ display: "none" }}
												></textarea>
											  </div>
											</>
										  );										  
									}
								},
								{ id: "geojson", caption: "Map Coordinates / Geographic Level", type: "hidden", required: true },
							]}
							data={(() => {
								try {
								return fields && fields.spatialFootprint ? JSON.parse(fields.spatialFootprint) : [];
								} catch {
								return []; // Default to an empty array if parsing fails
								}
							})()}
							onChange={(items: any) => {
								try {
									const parsedItems = Array.isArray(items) ? items : JSON.parse(items);
									console.log("Updated Items:", parsedItems);
									// Save or process `parsedItems` here, e.g., updating state or making an API call
								} catch {
									console.error("Failed to process items.");
								}
							}}
						/>
						<TreeView 
							ref={treeViewRef} 
							treeData={treeData} 
							caption="Select Geographic level" 
							rootCaption="Geographic levels" 
							onApply={
								(dialogRef: any, selectedItems: any) => {
									console.log('targetObject', contentReapeaterRef.current);

									if (contentReapeaterRef.current.getDialogRef()) {
										// Set Name in the div
										contentReapeaterRef.current.getDialogRef().querySelector('#spatialFootprint_geographic_level_container span').textContent = selectedItems.names;
										// Set GeoJSON in the hidden textarea
										selectedItems.data.map((item: any) => {
											if (item.id == selectedItems.selectedId) {
												contentReapeaterRef.current.getDialogRef().querySelector('#spatialFootprint_geographic_level').value = item.geojson;
												const setField = { id: "geojson", value: item.geojson };
												contentReapeaterRef.current.handleFieldChange(setField, item.geojson);

												const setFieldGoeLevel = { id: "geographic_level", value: selectedItems.names };
												contentReapeaterRef.current.handleFieldChange(setFieldGoeLevel, selectedItems.names);
											}
										});
									}
								}
							}
							onRenderItemName={
								(item: any) => {
									return (typeof(item.hiddenData.geojson) == "object") ? {disable: "false"} : {disable: "true"};
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
	isPublic: boolean
}

export function DisasterRecordsView(props: DisasterRecordsViewProps) {
	const item = props.item;

	const handlePreviewMap = (e: any) => {
		e.preventDefault();
		previewMap(JSON.stringify(JSON.parse(item.spatialFootprint)));
	};

	return (
		<ViewComponent
			isPublic={props.isPublic}
			path={route}
			id={item.id}
			plural="Disaster Records"
			singular="Disaster Record"
			extraActions={
				<ul>
					<li><Link to={"/disaster-record/edit-sub/" + item.id + "/human-effects"}>Human Direct Effects</Link></li>
					<li><Link to={"/disaster-record/edit-sub/" + item.id + "/disruptions"}>Disruptions</Link></li>
				</ul>
			}
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
				}}
				otherRenderView={{
					spatialFootprint: (
						<div>
						<p>Spatial Footprint:</p>
						{(() => {
						  try {
							const footprints = JSON.parse(item.spatialFootprint); // Parse JSON string
							return (
							  <>
							  <table style={{ borderCollapse: "collapse", width: "100%", border: "1px solid #ddd", marginBottom: "2rem" }}>
								<thead>
								  <tr style={{ backgroundColor: "#f4f4f4" }}>
									<th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left" }}>Title</th>
									<th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left" }}>Option</th>
								  </tr>
								</thead>
								<tbody>
								  {footprints.map((footprint: any, index: number) => {
									try {
									  const option = footprint.map_option || "Unknown Option";
									  return (
										<tr key={footprint.id || index}>
										  <td style={{ border: "1px solid #ddd", padding: "8px" }}>
											<a href="#" onClick={(e) => { e.preventDefault();  const newGeoJson = [{"geojson": footprint.geojson}];  previewMap(JSON.stringify(newGeoJson)); }}>
												{footprint.title}
											</a>
										  </td>
										  <td style={{ border: "1px solid #ddd", padding: "8px" }}>
											<a href="#" onClick={(e) => { e.preventDefault();  const newGeoJson = footprint.geojson;  previewGeoJSON((newGeoJson)); }}>
											{option}
											</a>
										  </td>
										</tr>
									  );
									} catch {
									  return (
										<tr key={index}>
										  <td style={{ border: "1px solid #ddd", padding: "8px" }}>{footprint.title}</td>
										  <td style={{ border: "1px solid #ddd", padding: "8px", color: "red" }}>Invalid Data</td>
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
									fontWeight: "bold",
									borderRadius: "4px",
									marginBottom: "2rem",
									cursor: "pointer"
								}}
								>
								Map Preview
								</button>
							  </>
							);
							
						  } catch {
							return <p>Invalid JSON format in spatialFootprint.</p>;
						  }
						})()}
					  </div>
					)
				}}
			/>
		</ViewComponent>
	);
}


