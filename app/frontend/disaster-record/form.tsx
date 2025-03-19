import {
	Link
} from "@remix-run/react";

import {DisasterRecordsFields, DisasterRecordsViewModel} from "~/backend.server/models/disaster_record"

import {formatDate} from "~/util/date";

import {
	UserFormProps,
	FormInputDef,
	FieldsView,
	FormView,
	FieldErrors,
	Field,
	ViewComponent,
	WrapInputBasic
} from "~/frontend/form";

import {useEffect, useState, useRef} from 'react';
import {approvalStatusField} from "~/frontend/approval";

import {ContentRepeater} from "~/components/ContentRepeater";
import {previewMap, previewGeoJSON} from "~/components/ContentRepeater/controls/mapper";
import {TreeView} from "~/components/TreeView";

import {ContentPicker} from "~/components/ContentPicker";
import {contentPickerConfig} from "~/routes/disaster-record+/content-picker-config.js";
import AuditLogHistory from "~/components/AuditLogHistory";
import {HazardPicker, Hip} from "~/frontend/hip/hazardpicker";
import {HipHazardInfo} from "~/frontend/hip/hip";

import SpatialFootprintMapViewer from "~/components/SpatialFootprintMapViewer";

export const route = "/disaster-record"

export const fieldsDefCommon = [
	approvalStatusField,
	{key: "locationDesc", label: "Location Description", type: "text"},
	{key: "startDate", label: "Start Date", type: "date_optional_precision", uiRow: {}},
	{key: "endDate", label: "End Date", type: "date_optional_precision"},
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
	{key: "attachments", label: "Attachments", type: "other", psqlType: "jsonb", uiRowNew: true},
] as const;

export const fieldsDef: FormInputDef<DisasterRecordsFields>[] = [
	{key: "disasterEventId", label: "", type: "other"},
	{key: "hipHazardId", label: "Hazard", type: "other", uiRow: {colOverride: 1}},
	{key: "hipClusterId", label: "", type: "other"},
	{key: "hipTypeId", label: "", type: "other"},
	...fieldsDefCommon
];

export const fieldsDefApi: FormInputDef<DisasterRecordsFields>[] = [
	...fieldsDef,
	{key: "apiImportId", label: "", type: "other"},
];

export const fieldsDefView: FormInputDef<DisasterRecordsViewModel>[] = [
	{key: "disasterEventId", label: "", type: "other"},
	{key: "hipHazard", label: "", type: "other"},
	...fieldsDefCommon,
	{key: "createdAt", label: "", type: "other"},
	{key: "updatedAt", label: "", type: "other"},
];

interface DisasterRecordsFormProps extends UserFormProps<DisasterRecordsFields> {
	hip: Hip;
	parent?: DisasterRecordsViewModel;
	treeData: any[];
	cpDisplayName?: string;
	ctryIso3?: string;
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
	const {fields, treeData, cpDisplayName, ctryIso3} = props;

	useEffect(() => {
	}, []);

	const dialogTreeViewRef = useRef<any>(null);
	const treeViewRef = useRef<any>(null);
	const contentReapeaterRef = useRef<any>(null);
	const treeViewDiscard = (e?: any) => {
		if (e) e.preventDefault();
		dialogTreeViewRef.current?.close();
		treeViewRef.current.treeViewClear();
	}
	const treeViewOpen = (e: any) => {
		e.preventDefault();
		dialogTreeViewRef.current?.showModal();

		let contHeight = [] as number[];
		contHeight[0] = (dialogTreeViewRef.current.querySelector(".dts-dialog__content") as HTMLElement | null)?.offsetHeight || 0;
		contHeight[1] = (dialogTreeViewRef.current.querySelector(".dts-dialog__header") as HTMLElement | null)?.offsetHeight || 0;
		contHeight[2] = (dialogTreeViewRef.current.querySelector(".tree-filters") as HTMLElement | null)?.offsetHeight || 0;
		contHeight[3] = (dialogTreeViewRef.current.querySelector(".tree-footer") as HTMLElement | null)?.offsetHeight || 0;
		let getHeight = contHeight[0] - contHeight[1] - contHeight[2] - 100;

		const dtsFormBody = dialogTreeViewRef.current.querySelector(".dts-form__body") as HTMLElement | null;
		if (dtsFormBody) {
			dtsFormBody.style.height = `${getHeight - (window.innerHeight - getHeight)}px`;
		}
	}

	let hazardousEventLinkInitial: "none" | "disaster_event" = "none"
	if (props.fields.disasterEventId) {
		hazardousEventLinkInitial = "disaster_event"
	}

	console.log("disaster: initial link:", hazardousEventLinkInitial, "fields", props.fields)

	const [hazardousEventLinkType, setHazardousEventLinkType] = useState(hazardousEventLinkInitial)

	return (
		<>
			<FormView
				user={props.user}
				path={route}
				edit={props.edit}
				id={props.id}
				plural="Disaster Records"
				singular="Disaster Record"
				errors={props.errors}
				fields={props.fields}
				fieldsDef={fieldsDef}
				infoNodes={<>
					<div className="mg-grid mg-grid__col-3">
						<WrapInputBasic label="Linking parameter" child={
							<select defaultValue={hazardousEventLinkType} onChange={(e: any) => setHazardousEventLinkType(e.target.value)}>
								<option value="none">No link</option>
								<option value="disaster_event">Disaster event</option>
							</select>
						} />
					</div>
				</>}
				override={{
					disasterEventId:
						(hazardousEventLinkType == "disaster_event") ?
							<Field key="disasterEventId" label="Disaster Event">
								<ContentPicker {...contentPickerConfig} value={fields.disasterEventId || ""} displayName={cpDisplayName || ""} />
							</Field> : <input type="hidden" name="disasterEventId" value="" />,
					hipTypeId: null,
					hipClusterId: null,
					hipHazardId: (
						<Field key="hazardId" label="Hazard classification">
							<HazardPicker hip={props.hip} typeId={fields.hipTypeId} clusterId={fields.hipClusterId} hazardId={fields.hipHazardId} />
							<FieldErrors errors={props.errors} field="hipHazardId"></FieldErrors>
						</Field>
					),
					spatialFootprint: (
						<Field key="spatialFootprint" label="">
							<ContentRepeater
								ctryIso3={ctryIso3}
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
										render: (data: any, _handleFieldChange: any, formData: any) => {
											return (
												<>
													<div className="input-group">
														<div id="spatialFootprint_geographic_level_container" className="wrapper">
															<span onClick={() => {previewGeoJSON(formData['geojson'])}}>{data}</span>
															<a href="#" className="btn" onClick={treeViewOpen}><img src="/assets/icons/globe.svg" alt="Globe SVG File" title="Globe SVG File" />Select</a>
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
							<dialog ref={dialogTreeViewRef} className="dts-dialog tree-dialog">
								<div className="dts-dialog__content">
									<div className="dts-dialog__header" style={{justifyContent: "space-between"}}>
										<h2 className="dts-heading-2" style={{marginBottom: "0px"}}>Select Geographic level</h2>
										<a type="button" aria-label="Close dialog" onClick={treeViewDiscard}>
											<svg aria-hidden="true" focusable="false" role="img">
												<use href={`/assets/icons/close.svg#close`}></use>
											</svg>
										</a>
									</div>
									<TreeView
										dialogMode={false}
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
															let arrValue = JSON.parse(item.geojson);
															arrValue = {
																...arrValue,  // Spread existing properties (if any)
																dts_info: {
																	division_id: selectedItems.selectedId || null,
																	division_ids: selectedItems.dataIds ? selectedItems.dataIds.split(',') : []
																}
															};
															const setField = {id: "geojson", value: arrValue};
															contentReapeaterRef.current.handleFieldChange(setField, arrValue);

															const setFieldGoeLevel = {id: "geographic_level", value: selectedItems.names};
															contentReapeaterRef.current.handleFieldChange(setFieldGoeLevel, selectedItems.names);
														}
													});
													treeViewDiscard();
												}
											}
										}
										onClose={
											() => {
												treeViewDiscard();
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
										showActionFooter={true}
									/>
								</div>
							</dialog>
						</Field>
					),
					attachments: (
						<Field key="attachments" label="">
							<ContentRepeater
								id="attachments"
								caption="Attachments"
								dnd_order={true}
								save_path_temp="/uploads/temp"
								file_viewer_temp_url="/disaster-record/file-temp-viewer"
								file_viewer_url="/disaster-record/file-viewer?loc=record"
								api_upload_url="/disaster-record/file-pre-upload"
								table_columns={[
									{type: "dialog_field", dialog_field_id: "title", caption: "Title"},
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
									{type: "action", caption: "Action"},
								]}
								dialog_fields={[
									{id: "title", caption: "Title", type: "input"},
									{id: "tag", caption: "Tags", type: "tokenfield", dataSource: "/api/disaster-event/tags-sectors"},
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
									{id: "file", caption: "File Upload", type: "file"},
									{id: "url", caption: "Link", type: "input", placeholder: "Enter URL"},
								]}
								data={(() => {
									try {
										let attachments: any[] = []; // Ensure it's always an array

										if (props?.fields?.attachments) {
											if (Array.isArray(props.fields.attachments)) {
												attachments = props.fields.attachments;
											} else if (typeof props.fields.attachments === "string") {
												try {
													const parsed = JSON.parse(props.fields.attachments);
													attachments = Array.isArray(parsed) ? parsed : [];
												} catch (error) {
													console.error("Invalid JSON in attachments:", error);
													attachments = [];
												}
											} else {
												console.warn("Unexpected type for attachments:", typeof props.fields.attachments);
												attachments = [];
											}
										}

										return attachments;
									} catch (error) {
										console.error("Error processing attachments:", error);
										return [];
									}
								})()}
								onChange={(_items: any) => {
									try {
										//const parsedItems = Array.isArray(items) ? items : (items);
										//console.log("Updated Items:", parsedItems);
										// Save or process `parsedItems` here, e.g., updating state or making an API call
									} catch {
										console.error("Failed to process items.");
									}
								}}
							/>
						</Field>
					)
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
	const dataSource = (item as any)?.disasterRecord || []; console.log('item', item);

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
					hipHazard: (
						<HipHazardInfo key="hazard" model={item} />
					),
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
											<SpatialFootprintMapViewer dataSource={dataSource} filterCaption="Spatial Footprint" />
										</>
									);

								} catch (error) {
									console.error("Error processing spatialFootprint:", error);
									return <p>Error loading spatialFootprint data.</p>;
								}
							})()}
						</div>
					),
					attachments: (
						<>
							<p>Attachments:</p>
							{(() => {
								try {
									let attachments: any[] = []; // Ensure it's always an array

									if (props?.item?.attachments) {
										if (Array.isArray(props.item.attachments)) {
											attachments = props.item.attachments;
										} else if (typeof props.item.attachments === "string") {
											try {
												const parsed = JSON.parse(props.item.attachments);
												attachments = Array.isArray(parsed) ? parsed : [];
											} catch (error) {
												console.error("Invalid JSON in attachments:", error);
												attachments = [];
											}
										} else {
											console.warn("Unexpected type for attachments:", typeof props.item.attachments);
											attachments = [];
										}
									}

									return attachments.length > 0 ? (
										<table style={{border: '1px solid #ddd', width: '100%', borderCollapse: 'collapse', marginBottom: '2rem'}}>
											<thead>
												<tr style={{backgroundColor: '#f2f2f2'}}>
													<th style={{border: '1px solid #ddd', padding: '8px', textAlign: 'left', fontWeight: 'normal'}}>Title</th>
													<th style={{border: '1px solid #ddd', padding: '8px', textAlign: 'left', fontWeight: 'normal'}}>Tags</th>
													<th style={{border: '1px solid #ddd', padding: '8px', textAlign: 'left', fontWeight: 'normal'}}>File/URL</th>
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
																<a href={`/disaster-record/file-viewer/?name=${props.item.id}/${attachment.file.name.split("/").pop()}&loc=record`} target="_blank" rel="noopener noreferrer">
																	{attachment.file.name.split("/").pop()}
																</a>
															)
															: attachment.file_option === "Link"
																? <a href={attachment.url} target="_blank" rel="noopener noreferrer">{attachment.url}</a>
																: "N/A";

													return (
														<tr key={attachment.id} style={{borderBottom: '1px solid gray'}}>
															<td style={{border: '1px solid #ddd', padding: '8px'}}>{attachment.title || "N/A"}</td>
															<td style={{border: '1px solid #ddd', padding: '8px'}}>{tags}</td>
															<td style={{border: '1px solid #ddd', padding: '8px'}}>{fileOrUrl}</td>
														</tr>
													);
												})}
											</tbody>
										</table>
									) : (<></>);
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
			<br />
			{auditLogs && auditLogs.length > 0 && (
				<>
					<h3>Audit Log History</h3>
					<AuditLogHistory auditLogs={auditLogs} />
				</>
			)}
		</ViewComponent>
	);
}


