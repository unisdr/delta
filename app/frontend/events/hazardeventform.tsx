import {
	Link
} from "@remix-run/react";

import {HazardousEventFields, HazardousEventViewModel} from "~/backend.server/models/event"

import {
	Field,
	FieldErrors,
	UserFormProps,
	FormInputDef,
	FieldsView,
	FormView,
	ViewComponent
} from "~/frontend/form";

import {formatDate} from "~/util/date";

import {useEffect, useState, useRef} from 'react';
import {approvalStatusField} from "~/frontend/approval";

import {ContentRepeater} from "~/components/ContentRepeater";
import {previewMap, previewGeoJSON} from "~/components/ContentRepeater/controls/mapper";
import {TreeView} from "~/components/TreeView";
import AuditLogHistory from "~/components/AuditLogHistory";
import {HazardPicker, Hip} from "~/frontend/hip/hazardpicker";
import {HipHazardInfo} from "~/frontend/hip/hip";


export const route = "/hazardous-event"

// 2025-02-25 - removed all fields not in DTS Variables and baselines
export const fieldsDefCommon = [
	approvalStatusField,
	// {key: "otherId1", label: "Event id in other system", type: "text", uiRowNew: true, uiRow: {}},
	// {key: "duration", label: "Duration", type: "text", uiRow: {}},
	{key: "nationalSpecification", label: "National specification", type: "textarea"},
	{key: "startDate", label: "Start Date", type: "date_optional_precision", required: true, uiRow: {}},
	{key: "endDate", label: "End Date", type: "date_optional_precision", required: true},
	{key: "description", label: "Description", type: "textarea", uiRowNew: true},
	//{key: "warningIssuedSummary", label: "Summary", type: "textarea", uiRowNew: true},
	//{key: "warningIssuedBy", label: "Issued By", type: "text", uiRow: {}},
	//{key: "warningIssuedDate", label: "Date", type: "date"},
	//{key: "warningIssuedCoverage", label: "Coverage", type: "textarea", uiRowNew: true},
	//{key: "warningIssuedContent", label: "Warning content", type: "textarea", uiRowNew: true},
	{key: "chainsExplanation", label: "Composite Event - Chains Explanation", type: "textarea"},
	{key: "magnitude", label: "Magnitude", type: "text"},
	{key: "spatialFootprint", label: "Spatial Footprint", type: "other", psqlType: "jsonb", uiRowNew: true},
	{key: "recordOriginator", label: "Record Originator", type: "text", required: true, uiRow: {}},
	{
		key: "hazardousEventStatus", label: "Hazardous Event Status", type: "enum", enumData: [
			{key: "forecasted", label: "Forecasted"},
			{key: "ongoing", label: "Ongoing"},
			{key: "passed", label: "Passed"},
		],
		uiRowNew: true,
	},
	{key: "dataSource", label: "Data Source", type: "text"},


] as const;

export const fieldsDef: FormInputDef<HazardousEventFields>[] = [
	{key: "parent", label: "", type: "other"},
	{key: "hipHazardId", label: "Hazard", type: "other", uiRow: {colOverride: 1}},
	{key: "hipClusterId", label:"", type: "other"},
	{key: "hipClassId", label: "", type: "other"},
	...fieldsDefCommon
];

export const fieldsDefApi: FormInputDef<HazardousEventFields>[] = [
	...fieldsDef,
	{key: "apiImportId", label: "API Import ID", type: "other"},
];

export const fieldsDefView: FormInputDef<HazardousEventViewModel>[] = [
	{key: "hipHazard", label: "", type: "other"},
	...fieldsDefCommon,
	{key: "createdAt", label: "", type: "other"},
	{key: "updatedAt", label: "", type: "other"},
];

interface HazardousEventFormProps extends UserFormProps<HazardousEventFields> {
	hip: Hip;
	parent?: HazardousEventViewModel;
	treeData?: any[];
}

export function hazardousEventLabel(args: {
	id?: string;
	description?: string;
	hazard?: {nameEn: string};
}): string {
	let parts: string[] = []
	if (args.hazard) {
		parts.push(args.hazard.nameEn.slice(0, 50))
	}
	if (args.description) {
		parts.push(args.description.slice(0, 50))
	}
	if (args.id) {
		parts.push(args.id.slice(0, 5))
	}
	return parts.join(" ")
}

export function hazardousEventLongLabel(args: {
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
export function hazardousEventLink(args: {
	id: string;
	description: string;
	hazard?: {nameEn: string};
}) {
	return <Link to={`/hazardous-event/${args.id}`}>
		{hazardousEventLabel(args)}
	</Link>
}

export function HazardousEventForm(props: HazardousEventFormProps) {
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

	//const targetObject = useRef<HTMLDivElement>(null);
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
		let getHeight = contHeight[0] - contHeight[1] - contHeight[2];

		const dtsFormBody = dialogTreeViewRef.current.querySelector(".dts-form__body") as HTMLElement | null;
		if (dtsFormBody) {
			dtsFormBody.style.height = `${window.innerHeight-getHeight}px`;
		}
	}

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
			elementsAfter={{
			}}
			override={{
				parent:
					<Field key="parent" label="Parent">
						{selected ? hazardousEventLink(selected) : "-"}&nbsp;
						<Link target="_blank" rel="opener" to={"/hazardous-event/picker"}>Change</Link>
						<input type="hidden" name="parent" value={selected?.id || ""} />
						<FieldErrors errors={props.errors} field="parent"></FieldErrors>
					</Field>
				,
				hipClassId: null,
				hipClusterId: null,
				hipHazardId: (
					<Field key="hazardId" label="Specific Hazard *">
						<HazardPicker hip={props.hip} classId={fields.hipClassId} clusterId={fields.hipClusterId} hazardId={fields.hipHazardId} required={true} />
						<FieldErrors errors={props.errors} field="hipHazardId"></FieldErrors>
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
									// Ensure fields exist before accessing spatialFootprint
									if (fields?.spatialFootprint) {
										if (Array.isArray(fields.spatialFootprint)) {
											return fields.spatialFootprint;
										} else if (typeof fields.spatialFootprint === "string") {
											try {
												const parsed = JSON.parse(fields.spatialFootprint);
												return Array.isArray(parsed) ? parsed : [];
											} catch (error) {
												console.error("Invalid JSON in spatialFootprint:", error);
												return [];
											}
										} else {
											console.warn("Unexpected type for spatialFootprint:", typeof fields.spatialFootprint);
											return [];
										}
									}
									return [];
								} catch (error) {
									console.error("Error processing spatialFootprint:", error);
									return [];
								}
							})()}
							onChange={(_items: any) => {
								try {
									//const parsedItems = Array.isArray(items) ? items : (items);
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
														const setField = {id: "geojson", value: JSON.parse(item.geojson)};
														contentReapeaterRef.current.handleFieldChange(setField, JSON.parse(item.geojson));

														const setFieldGoeLevel = {id: "geographic_level", value: selectedItems.names};
														contentReapeaterRef.current.handleFieldChange(setFieldGoeLevel, selectedItems.names);
													}
												});
												treeViewDiscard();
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
									showActionFooter={true}
								/>
							</div>
						</dialog>
					</Field>
				),
			}}
		/>
	);
}

interface HazardousEventViewProps {
	item: HazardousEventViewModel;
	isPublic: boolean;
	auditLogs?: any[];
}

export function HazardousEventView(props: HazardousEventViewProps) {
	const item = props.item;
	const auditLogs = props.auditLogs;

	const handlePreviewMap = (e: any) => {
		e.preventDefault();
		previewMap(JSON.stringify((item.spatialFootprint)));
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
								{hazardousEventLink(parent)}
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
										{hazardousEventLink(childEvent)}
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
				elementsAfter={{
				}}
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
					spatialFootprint: (
						<div>
							<p>Spatial Footprint:</p>
							{(() => {
								try {
									let footprints: any[] = []; // Ensure footprints is always an array

									if (item?.spatialFootprint) {
										if (Array.isArray(item.spatialFootprint)) {
											footprints = item.spatialFootprint;
										} else if (typeof item.spatialFootprint === "string") {
											try {
												const parsed = JSON.parse(item.spatialFootprint);
												footprints = Array.isArray(parsed) ? parsed : [];
											} catch (error) {
												console.error("Invalid JSON in spatialFootprint:", error);
												footprints = [];
											}
										} else {
											console.warn("Unexpected type for spatialFootprint:", typeof item.spatialFootprint);
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

								} catch {
									return <p>Invalid JSON format in spatialFootprint.</p>;
								}
							})()}
						</div>
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
