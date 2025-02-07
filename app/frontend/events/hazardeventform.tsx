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

import {ContentRepeater} from "~/components/ContentRepeater";
import {previewMap, previewGeoJSON} from "~/components/ContentRepeater/controls/mapper";
import {TreeView} from "~/components/TreeView";

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
	treeData?: any[];
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
									return fields && fields.spatialFootprint ? JSON.parse(fields.spatialFootprint) : [];
								} catch {
									return []; // Default to an empty array if parsing fails
								}
							})()}
							onChange={(items: any) => {
								try {
									const parsedItems = Array.isArray(items) ? items : JSON.parse(items);
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
												const setField = {id: "geojson", value: item.geojson};
												contentReapeaterRef.current.handleFieldChange(setField, item.geojson);

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

	const handlePreviewMap = (e: any) => {
		e.preventDefault();
		previewMap(JSON.stringify(JSON.parse(item.spatialFootprint)));
	};

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
					spatialFootprint: (
						<div>
							<p>Spatial Footprint:</p>
							{(() => {
								try {
									const footprints = JSON.parse(item.spatialFootprint); // Parse JSON string

									return (
										<>
											<table style={{borderCollapse: "collapse", width: "100%", border: "1px solid #ddd", marginBottom: "2rem"}}>
												<thead>
													<tr style={{backgroundColor: "#f4f4f4"}}>
														<th style={{border: "1px solid #ddd", padding: "8px", textAlign: "left"}}>Title</th>
														<th style={{border: "1px solid #ddd", padding: "8px", textAlign: "left"}}>Option</th>
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
																		<a href="#" onClick={(e) => {e.preventDefault(); const newGeoJson = footprint.geojson; previewGeoJSON((newGeoJson));}}>
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
					),
				}}
			/>
		</ViewComponent>
	);
}
