import {
	Link
} from "@remix-run/react";

import {useEffect, useState, useRef} from 'react';

import {DisasterEventFields, DisasterEventViewModel, HazardEventBasicInfoViewModel} from "~/backend.server/models/event"

import {hazardEventLink} from "~/frontend/events/hazardeventform"

import {ContentRepeater} from "~/components/ContentRepeater";
import {previewMap, previewGeoJSON} from "~/components/ContentRepeater/controls/mapper";
import {TreeView} from "~/components/TreeView";

import {
	UserFormProps,
	FormInputDef,
	FieldsView,
	ViewComponent,
	FormView,
	FieldErrors,
	Field
} from "~/frontend/form";
import {approvalStatusField} from "../approval";
import {formatDate} from "~/util/date";
import AuditLogHistory from "~/components/AuditLogHistory";

export const route = "/disaster-event"

export const fieldsDefCommon = [
	approvalStatusField,
	{key: "nationalDisasterId", label: "National Disaster ID", type: "text"},
	{key: "otherId1", label: "Event ID in other system", type: "text"},
	{key: "glide", label: "GLIDE Number", type: "text"},
	{key: "nameGlobalOrRegional", label: "Global/Regional Name", type: "text"},
	{key: "nameNational", label: "National Name", type: "text"},
	{key: "startDate", label: "Start Date", type: "date"},
	{key: "endDate", label: "End Date", type: "date"},
	{key: "startDateLocal", label: "Start Date (Local)", type: "text"},
	{key: "endDateLocal", label: "End Date (Local)", type: "text"},
	{key: "durationDays", label: "Duration (Days)", type: "number"},
	{key: "affectedGeographicDivisions", label: "Affected Geographic Divisions", type: "text"},
	{key: "affectedAdministrativeRegions", label: "Affected Administrative Regions", type: "text"},
	{key: "disasterDeclaration", label: "Disaster Declaration", type: "bool"},
	{key: "disasterDeclarationType", label: "Disaster Declaration Type", type: "bool"},
	{key: "disasterDeclarationEffect", label: "Disaster Declaration Effect", type: "bool"},
	{key: "disasterDeclarationDate", label: "Disaster Declaration Date", type: "date"},
	{key: "warningIssuedLevelsSeverity", label: "Warning Levels Severity", type: "text"},
	{key: "warningIssuedDate", label: "Warning Issued Date", type: "date"},
	{key: "preliminaryAssessmentDate", label: "Preliminary Assessment Date", type: "date"},
	{key: "responseOperations", label: "Response Operations", type: "text"},
	{key: "postDisasterAssementDate", label: "Post-Disaster Assessment Date", type: "date"},
	{key: "reAssessmentDate", label: "Re-Assessment Date", type: "date"},
	{key: "dataSource", label: "Data Source", type: "text"},
	{key: "originatorRecorderOfInformation", label: "Originator/Recorder", type: "text"},
	{key: "effectsTotalLocalCurrency", label: "Effects Total (Local Currency)", type: "money"},
	{key: "effectsTotalUsd", label: "Effects Total (USD)", type: "money"},
	{key: "subtotaldamageUsd", label: "Subtotal Damage (USD)", type: "money"},
	{key: "subtotalLossesUsd", label: "Subtotal Losses (USD)", type: "money"},
	{key: "responseCostTotalUsd", label: "Response Cost (Total)", type: "number"},
	{key: "humanitarianNeedsTotalUsd", label: "Humanitarian Needs (Total, USD)", type: "money"},
	{key: "recoveryNeedsTotalUsd", label: "Recovery Needs (Total, USD)", type: "money"},
	{key: "attachments", label: "Attachments", type: "other", psqlType: "jsonb"},
	{key: "spatialFootprint", label: "Spatial Footprint", type: "other", psqlType: "jsonb"},
] as const;

export const fieldsDef: FormInputDef<DisasterEventFields>[] = [
	{key: "hazardEventId", label: "", type: "other"},
	...fieldsDefCommon
];

export const fieldsDefApi: FormInputDef<DisasterEventFields>[] = [
	...fieldsDef,
	{key: "apiImportId", label: "", type: "other"},
];

export const fieldsDefView: FormInputDef<DisasterEventViewModel>[] = [
	...fieldsDef,
	{key: "createdAt", label: "", type: "other"},
	{key: "updatedAt", label: "", type: "other"},
];

interface DisasterEventFormProps extends UserFormProps<DisasterEventFields> {
	hazardEvent?: HazardEventBasicInfoViewModel
	treeData: any[];
}

export function DisasterEventForm(props: DisasterEventFormProps) {
	const [selectedHazardEvent, setSelectedHazardEvent] = useState(props.hazardEvent);
	const treeData = props.treeData;

	useEffect(() => {
		const handleMessage = (event: any) => {
			if (event.data?.selected) {
				setSelectedHazardEvent(event.data.selected);
			}
		};
		window.addEventListener('message', handleMessage);
		return () => {
			window.removeEventListener('message', handleMessage);
		};
	}, []);

	const treeViewRef = useRef<any>(null);
	const contentReapeaterRef = useRef<any>(null);

	return (
		<FormView
			path={route}
			edit={props.edit}
			id={props.id}
			plural="disaster events"
			singular="disaster event"
			errors={props.errors}
			fields={props.fields}
			fieldsDef={fieldsDef}
			override={{
				hazardEventId:
					<Field key="hazardEventId" label="Hazard Event">
						{selectedHazardEvent ? hazardEventLink(selectedHazardEvent) : "-"}&nbsp;
						<Link target="_blank" rel="opener" to={"/hazard-event/picker"}>Change</Link>
						<input type="hidden" name="hazardEventId" value={selectedHazardEvent?.id || ""} />
						<FieldErrors errors={props.errors} field="hazardEventId"></FieldErrors>
					</Field>
				,
				spatialFootprint: props.edit ? (
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
								  const spatialFootprint = props.fields?.spatialFootprint;
								  return Array.isArray(spatialFootprint) ? spatialFootprint : [];
								} catch {
								  return []; // Default to an empty array if there's an error
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
				) : (
					<Field key="spatialFootprint" label=""><></></Field>
				),
				attachments: props.edit ? (
					<Field key="attachments" label="">
						<ContentRepeater
							id="attachments"
							caption="Attachments"
							dnd_order={true}
							save_path_temp="/uploads/temp"
							file_viewer_temp_url="/disaster-event/file-temp-viewer"
							file_viewer_url="/disaster-event/file-viewer"
							api_upload_url="/disaster-event/file-pre-upload"
							table_columns={[
								{ type: "dialog_field", dialog_field_id: "title", caption: "Title" },
								{ 
									type: "custom", caption: "Tags",
									render: (item: any) => {
										try {
											if (!item.tag) {
												return "N/A"; // Return "N/A" if no tags exist
											}
											
											const tags = (item.tag); // Parse the JSON string
											if (Array.isArray(tags) && tags.length > 0) {
												// Map the names and join them with commas
												return tags.map(tag => tag.name).join(", ");
											}
											return "N/A"; // If no tags exist
										} catch (error) {
											console.error("Failed to parse tags:", error);
											return "N/A"; // Return "N/A" if parsing fails
										}
									} 
								},
								{
								type: "custom",
								caption: "File/URL",
								render: (item) => {
									let strRet = "N/A"; // Default to "N/A"		

									const fileOption = item?.file_option || "";

									if (fileOption === "File") {
										// Get the file name or fallback to URL
										const fullFileName = item.file?.name ? item.file.name.split('/').pop() : item.url;
									
										// Truncate long file names while preserving the file extension
										const maxLength = 30; // Adjust to fit your design
										strRet = fullFileName;
									
										if (fullFileName && fullFileName.length > maxLength) {
											const extension = fullFileName.includes('.')
												? fullFileName.substring(fullFileName.lastIndexOf('.'))
												: '';
											const baseName = fullFileName.substring(0, maxLength - extension.length - 3); // Reserve space for "..."
											strRet = `${baseName}...${extension}`;
										}
									} else if (fileOption === "Link") {
										strRet = item.url || "N/A";
									}
								
									return strRet || "N/A"; // Return the truncated name or fallback to "N/A"
								},
								},                        
								{ type: "action", caption: "Action" },
							]}
							dialog_fields={[
								{ id: "title", caption: "Title", type: "input" },
								{ id: "tag", caption: "Tags", type: "tokenfield", dataSource: [{ id: 1, name: "React" }, { id: 2, name: "Vue" }, { id: 3, name: "Angular" }, { id: 4, name: "Svelte" }, { id: 5, name: "SolidJS" } , { id: 6, name: "Remix" }] },
								{
								id: "file_option",
								caption: "Option",
								type: "option",
								options: ["File", "Link"],
								onChange: (e) => {
									const value = e.target.value;
									const fileField = document.getElementById("attachments_file") as HTMLInputElement;
									const urlField = document.getElementById("attachments_url") as HTMLInputElement;

									if (fileField && urlField) {
										const fileDiv = fileField.closest(".dts-form-component") as HTMLElement;
										const urlDiv = urlField.closest(".dts-form-component") as HTMLElement;

										if (value === "File") {
											fileDiv?.style.setProperty("display", "block");
											urlDiv?.style.setProperty("display", "none");
										} else if (value === "Link") {
											fileDiv?.style.setProperty("display", "none");
											urlDiv?.style.setProperty("display", "block");
										}
									}
								},
								},
								{ id: "file", caption: "File Upload", type: "file"  }, 
								{ id: "url", caption: "Link", type: "input", placeholder: "Enter URL" },
							]}
							data={(() => {
								try {
								  const attachments = props?.fields?.attachments;
								  return Array.isArray(attachments) ? attachments : [];
								} catch {
								  return []; // Default to an empty array if there's an error
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
					</Field>
				) : (
					<Field key="attachments" label=""><></></Field>
				),
			}} />
	)
}

interface DisasterEventViewProps {
	item: DisasterEventViewModel;
	isPublic: boolean;
	auditLogs?: any[];
}

export function DisasterEventView(props: DisasterEventViewProps) {
	const {item, auditLogs} = props;

	const handlePreviewMap = (e: any) => {
		e.preventDefault();
		previewMap(JSON.stringify((item.spatialFootprint)));
	};

	return (
		<ViewComponent
			isPublic={props.isPublic}
			path={route}
			id={item.id}
			plural="Disaster events"
			singular="Disaster event"
		>
			<FieldsView def={fieldsDefView} fields={item} override={{
				hazardEventId: (
					<p key="hazardEventId">Hazardous Event: {hazardEventLink(item.hazardEvent)}</p>
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
								let footprints: any[] = []; // Ensure it's an array

								if (item?.spatialFootprint) {
								  if (typeof item.spatialFootprint === "string") {
									try {
									  const parsed = JSON.parse(item.spatialFootprint);
									  footprints = Array.isArray(parsed) ? parsed : [];
									} catch (error) {
									  console.error("Invalid JSON in spatialFootprint:", error);
									}
								  } else if (Array.isArray(item.spatialFootprint)) {
									footprints = item.spatialFootprint;
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

							} catch {
								return <p>Invalid JSON format in spatialFootprint.</p>;
							}
						})()}
					</div>
				),
				attachments: (
					<>
					{(() => {
					try {
						let attachments: any[] = []; // Ensure it's an array

						if (item?.attachments) {
						if (typeof item.attachments === "string") {
							try {
							const parsed = JSON.parse(item.attachments);
							attachments = Array.isArray(parsed) ? parsed : [];
							} catch (error) {
							console.error("Invalid JSON in attachments:", error);
							}
						} else if (Array.isArray(item.attachments)) {
							attachments = item.attachments;
						}
						}

						return attachments.length > 0 ? (
					  <table style={{ border: '1px solid #ddd', width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
					  <thead>
						  <tr style={{ backgroundColor: '#f2f2f2' }}>
							  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', fontWeight: 'normal' }}>Title</th>
							  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', fontWeight: 'normal' }}>Tags</th>
							  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', fontWeight: 'normal' }}>File/URL</th>
						  </tr>
					  </thead>
						<tbody>
						  {(attachments).map((attachment: any) => {
							const tags = attachment.tag
							  ? (attachment.tag).map((tag: any) => tag.name).join(", ")
							  : "N/A";
							const fileOrUrl =
							  attachment.file_option === "File" && attachment.file
								? (
								  <a href={`/disaster-event/file-viewer/?name=${item.id}/${attachment.file.name.split("/").pop()}`} target="_blank" rel="noopener noreferrer">
									{attachment.file.name.split("/").pop()}
								  </a>
								)
								: attachment.file_option === "Link"
								? <a href={attachment.url} target="_blank" rel="noopener noreferrer">{attachment.url}</a>
								: "N/A";
				
							return (
							  <tr key={attachment.id} style={{ borderBottom: '1px solid gray' }}>
								  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{attachment.title || "N/A"}</td>
								  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{tags}</td>
								  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{fileOrUrl}</td>
							  </tr>
							);
						  })}
						</tbody>
					  </table>
					) : (
							<p></p>
						);
						} catch (error) {
						console.error("Error processing attachments:", error);
						return <p>Error loading attachments.</p>;
						}
					})()}
					</>
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




