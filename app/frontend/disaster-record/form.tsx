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

import {rewindGeoJSON} from '~/utils/spatialUtils'

import { SpatialFootprintFormView } from '~/frontend/spatialFootprintFormView';
import { AttachmentsFormView } from "~/frontend/attachementsFormView";

import {UserForFrontend} from "~/util/auth";

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
	{key: "legacyData", label: "Legacy Data", type: "json", uiRow: {colOverride: 1}},
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
	divisionGeoJSON?: any[];
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
	const {fields, treeData, cpDisplayName, ctryIso3, divisionGeoJSON} = props;

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
							<SpatialFootprintFormView
								divisions={divisionGeoJSON}
								ctryIso3={ctryIso3 || ""}
								treeData={treeData ?? []}
								initialData={fields?.spatialFootprint}
							/>
						</Field>
					),
					attachments: (
						<Field key="attachments" label="">
							<AttachmentsFormView
								save_path_temp="/uploads/temp"
								file_viewer_temp_url="/disaster-record/file-temp-viewer"
								file_viewer_url="/disaster-record/file-viewer?loc=record"
								api_upload_url="/disaster-record/file-pre-upload"
								initialData={fields?.attachments}
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
	user: UserForFrontend
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
				user={props.user}
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


