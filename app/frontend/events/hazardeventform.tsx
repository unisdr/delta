import {
	Link
} from "@remix-run/react";

import {HazardEventFields, HazardEventViewModel} from "~/backend.server/models/event"

import {
	Field,
	FieldErrors,
	UserFormProps,
	FormInputDef,
	FieldsView,
	FormView,
	ViewComponent
} from "~/frontend/form";

import {HazardPicker, Hip} from "~/frontend/hip/hazardpicker"
import {formatDate} from "~/util/date";

import {useEffect, useState, useRef} from 'react';
import {approvalStatusField} from "~/frontend/approval";

import { ContentRepeater } from "~/components/ContentRepeater";
import { TreeView, buildTree } from "~/components/TreeView";

export const route = "/hazard-event"

export const fieldsDefCommon = [
	approvalStatusField,
	{key: "otherId1", label: "Event id in other system", type: "text"},
	{key: "startDate", label: "Start Date", type: "date", required: true},
	{key: "endDate", label: "End Date", type: "date", required: true},
	{key: "description", label: "Description", type: "textarea"},
	{key: "chainsExplanation", label: "Composite Event - Chains Explanation", type: "text"},
	{key: "duration", label: "Duration", type: "text"},
	{key: "magnitude", label: "Magnitude", type: "text"},
	{key: "spatialFootprint", label: "Spatial Footprint", type: "other"},
	{key: "recordOriginator", label: "Record Originator", type: "text", required: true},
	{key: "dataSource", label: "Data Source", type: "text"},
] as const;

export const fieldsDef: FormInputDef<HazardEventFields>[] = [
	{key: "parent", label: "", type: "other"},
	{key: "hazardId", label: "Hazard", type: "other", required: true},
	...fieldsDefCommon
];

export const fieldsDefApi: FormInputDef<HazardEventFields>[] = [
	...fieldsDef,
	{key: "apiImportId", label: "API Import ID", type: "other"},
];

export const fieldsDefView: FormInputDef<HazardEventViewModel>[] = [
	{key: "hazard", label: "", type: "other"},
	...fieldsDefCommon,
	{key: "createdAt", label: "", type: "other"},
	{key: "updatedAt", label: "", type: "other"},
];

interface HazardEventFormProps extends UserFormProps<HazardEventFields> {
	hip: Hip;
	parent?: HazardEventViewModel;
	treeData: any[];
}

export function hazardEventLabel(args: {
	id?: string;
	description?: string;
	hazard: {nameEn: string};
}): string {
	const hazardName = args.hazard.nameEn.slice(0, 50);
	const desc = args.description ? " " + args.description.slice(0, 50) : "";
	const shortId = args.id ? " " + args.id.slice(0, 5) : "";
	return hazardName + " " + desc + " " + shortId;
}

export function hazardEventLongLabel(args: {
	id?: string;
	description?: string;
	hazard: {nameEn: string};
}) {
	return <ul>
		<li>ID: {args.id}</li>
		<li>Description: {args.description || "-"}</li>
		<li>Hazard: {args.hazard.nameEn}</li>
	</ul>
}
export function hazardEventLink(args: {
	id: string;
	description: string;
	hazard: {nameEn: string};
}) {
	return <Link to={`/hazard-event/${args.id}`}>
		{hazardEventLabel(args)}
	</Link>
}

export function HazardEventForm(props: HazardEventFormProps) {
	const fields = props.fields;
	const treeData = props.treeData;

	const [selected, setSelected] = useState(props.parent);

	useEffect(() => {
		const handleMessage = (event: any) => {
			if (event.data?.selected) {
				setSelected(event.data.selected);
			}
		};
		window.addEventListener('message', handleMessage);
		return () => {
			window.removeEventListener('message', handleMessage);
		};
	}, []);

	const targetObject = useRef<HTMLDivElement>(null);
	const treeViewRef = useRef<any>(null);
	const contentReapeaterRef = useRef<any>(null);

	return (
		<FormView
			path={route}
			edit={props.edit}
			id={props.id}
			plural="hazardous events"
			singular="hazardous event"
			errors={props.errors}
			fields={props.fields}
			fieldsDef={fieldsDef}
			override={{
				parent:
					<Field key="parent" label="Parent">
						{selected ? hazardEventLink(selected) : "-"}&nbsp;
						<Link target="_blank" rel="opener" to={"/hazard-event/picker"}>Change</Link>
						<input type="hidden" name="parent" value={selected?.id || ""} />
						<FieldErrors errors={props.errors} field="parent"></FieldErrors>
					</Field>
				,
				hazardId: (
					<Field key="hazardId" label="Specific Hazard *">
						<HazardPicker name="hazardId" hip={props.hip} defaultValue={fields.hazardId || ""} required={true} />
						<FieldErrors errors={props.errors} field="hazardId"></FieldErrors>
					</Field>
				),
				spatialFootprint: (
					<Field key="spatialFootprint" label="Spatial Footprint">
						<ContentRepeater
							ref={contentReapeaterRef}
							id="spatialFootprint"
							mapper_preview={true}
							debug={true}
							table_columns={[
								{ type: "dialog_field", dialog_field_id: "title", caption: "Title", width: "50%" },                        
								{ type: "action", caption: "Action", width: "50%" },
							]}
							dialog_fields={[
								{ id: "title", caption: "Title", type: "input", required: true },
								{
									id: "map_option",
									caption: "Option",
									type: "option",
									options: ["Map Coordinates", "Geographic Level"],
									onChange: (e) => {
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

										/*const value = e.target.value;
										const fileField = document.getElementById("attachments_file");
										const urlField = document.getElementById("attachments_url");
			
										if (fileField && urlField) {
											const fileDiv = fileField.closest(".dts-form-component");
											const urlDiv = urlField.closest(".dts-form-component");
			
											if (value === "File") {
											fileDiv?.style.setProperty("display", "block");
											urlDiv?.style.setProperty("display", "none");
											} else if (value === "Link") {
											fileDiv?.style.setProperty("display", "none");
											urlDiv?.style.setProperty("display", "block");
											}
										}*/
									},
								},
								{ id: "map_coords", caption: "Map Coordinates", type: "mapper", placeholder: "", mapperGeoJSONField: "geojson" },
								{ id: "geographic_level", caption: "Geographic Level", type: "custom",
									render: (data: any, handleFieldChange: any) => {
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
												  <span>{data}</span>
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

									/*if (targetObject.current) { 
										targetObject.current.querySelector('span').textContent = selectedItems.names;

										selectedItems.data.map((item: any) => {
											if (item.id == selectedItems.selectedId) {
												targetObject.current.querySelector('pre').textContent = `GEO JSON:\n${item.geojson}`;
											}
										});
									}
									console.log('selectedItems', selectedItems);*/
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
	);
}

interface HazardEventViewProps {
	item: HazardEventViewModel;
	isPublic: boolean
}

export function HazardEventView(props: HazardEventViewProps) {
	const item = props.item;
	let cluster = item.hazard.cluster;
	let cls = cluster.class;

	return (
		<ViewComponent
			isPublic={props.isPublic}
			path={route}
			id={item.id}
			plural="Hazardous events"
			singular="Hazard event"
			extraActions={
				<>
					<p>
						<Link to={`${route}/new?parent=${item.id}`}>Add Hazardous Event caused by this event</Link>
					</p>
				</>
			}
			extraInfo={
				<>
					{item.event.ps.length > 0 && (() => {
						const parent = item.event.ps[0].p.he;
						return (
							<p>
								Caused By:&nbsp;
								{hazardEventLink(parent)}
							</p>
						);
					})()}

					{item.event.cs.length > 0 && (
						<>
							<p>Causing:</p>
							{item.event.cs.map((child) => {
								const childEvent = child.c.he;
								return (
									<p key={child.childId}>
										{hazardEventLink(childEvent)}
									</p>
								);
							})}
						</>
					)}
				</>
			}
		>
			<FieldsView
				def={fieldsDefView}
				fields={item}
				override={{
					hazard: (
						<div key="hazard">
							<p>Class: {cls.nameEn}</p>
							<p>Cluster: {cluster.nameEn}</p>
							<p>Hazard ID: {item.hazard.id}</p>
							<p>Hazard Name: {item.hazard.nameEn}</p>
						</div>
					),
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
							const footprints = JSON.parse(item.spatialFootprint); // Parse the JSON string
							return (
							  <ul>
								{footprints.map((footprint: any, index: number) => (
								  <li key={footprint.id || index}>
									Title: {footprint.title} <br />
									Shape: {(() => {
									  try {
										const coords = JSON.parse(footprint.map_coords);
										const shape = coords.mode;
										switch (shape) {
										  case "circle":
											return (
											  <>
												Circle <br />
												Center: {coords.center.join(", ")} <br />
												Radius: {coords.radius} meters
											  </>
											);
										  case "lines":
											return (
											  <>
												Lines <br />
												Coordinates:{" "}
												{coords.coordinates.map((line: number[], i: number) => (
												  <span key={i}>
													[{line.join(", ")}]
													{i < coords.coordinates.length - 1 ? ", " : ""}
												  </span>
												))}
											  </>
											);
										  case "polygon":
											return (
											  <>
												Polygon <br />
												Coordinates:{" "}
												{coords.coordinates.map((point: number[], i: number) => (
												  <span key={i}>
													[{point.join(", ")}]
													{i < coords.coordinates.length - 1 ? ", " : ""}
												  </span>
												))}
											  </>
											);
										  case "rectangle":
											return (
											  <>
												Rectangle <br />
												Coordinates:{" "}
												{coords.coordinates.map((corner: number[], i: number) => (
												  <span key={i}>
													[{corner.join(", ")}]
													{i < coords.coordinates.length - 1 ? ", " : ""}
												  </span>
												))}
											  </>
											);
										  case "markers":
											return (
											  <>
												Markers <br />
												Coordinates:{" "}
												{coords.coordinates.map((marker: number[], i: number) => (
												  <span key={i}>
													[{marker.join(", ")}]
													{i < coords.coordinates.length - 1 ? ", " : ""}
												  </span>
												))}
											  </>
											);
										  default:
											return "Unknown Shape";
										}
									  } catch {
										return "Invalid map_coords format.";
									  }
									})()}
								  </li>
								))}
							  </ul>
							);
						  } catch {
							return <p>Invalid JSON format in spatialFootprint.</p>;
						  }
						})()}
					  </div>
					),
				}}											  
			/>
		</ViewComponent>
	);
}


