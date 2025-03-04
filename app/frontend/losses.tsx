import {
	Field,
	UserFormProps,
	FormInputDef,
	FieldsView,
	ViewComponent,
	FormView,
} from "~/frontend/form"

import {useEffect, useRef} from "react"

import {LossesFields, LossesViewModel} from "~/backend.server/models/losses"
import {UnitPicker} from "./unit_picker"

import {ContentRepeater} from "~/components/ContentRepeater";
import {previewMap, previewGeoJSON} from "~/components/ContentRepeater/controls/mapper";
import {TreeView} from "~/components/TreeView";

export const route = "/disaster-record/edit-sub/_/losses"

import * as totaloverrides from "~/frontend/components/totaloverrides"

export function route2(recordId: string): string {
	return `/disaster-record/edit-sub/${recordId}/losses`
}

interface LossesFormProps extends UserFormProps<LossesFields> {
	treeData?: any;
	fieldDef: FormInputDef<LossesFields>[]
}

export function LossesForm(props: LossesFormProps) {
	let formRef = useRef<HTMLFormElement>(null)

	const treeData = props.treeData;
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

	// handle total overrides
	useEffect(() => {
		let prefixes = [
			"public",
			"private",
		]
		let opts = (pref: string): totaloverrides.handleOverridesOpts => {
			return {
				formRef,
				prefix: pref,
				partsNames: ["CostUnit", "Units"],
				resName: "CostTotal",
				calc: (parts) => parts[0] * parts[1],
			}
		}
		if (formRef.current) {
			for (let pref of prefixes) {
				totaloverrides.attach(opts(pref))
			}
		}
		return () => {
			if (formRef.current) {
				for (let pref of prefixes) {
					totaloverrides.detach(opts(pref))
				}
			}
		}
	}, [props.fields])



	// select dropdown to show based if sector is related to agriculture
	let extra = props.fields.sectorIsAgriculture ? {
		relatedToNotAgriculture: null
	} : {
		relatedToAgriculture: null
	}
	let override = {
		sectorIsAgriculture: (
			<input key="sectorIsAgriculture" name="sectorIsAgriculture" type="hidden" value={props.fields.sectorIsAgriculture ? "on" : "off"} />
		),
		recordId: (
			<input key="recordId" name="recordId" type="hidden" value={props.fields.recordId} />
		),
		sectorId: (
			<input key="sectorId" name="sectorId" type="hidden" value={props.fields.sectorId} />
		),
		publicUnit: <UnitPicker name="publicUnit" defaultValue={props.fields.publicUnit || undefined} />,
		privateUnit: <UnitPicker name="privateUnit" defaultValue={props.fields.privateUnit || undefined} />,

		...extra,
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
							show: false
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
							let spatialFootprint: any[] = []; // Ensure it's always an array

							if (props?.fields?.spatialFootprint) {
								if (Array.isArray(props.fields.spatialFootprint)) {
									spatialFootprint = props.fields.spatialFootprint;
								} else if (typeof props.fields.spatialFootprint === "string") {
									try {
										const parsed = JSON.parse(props.fields.spatialFootprint);
										spatialFootprint = Array.isArray(parsed) ? parsed : [];
									} catch (error) {
										console.error("Invalid JSON in spatialFootprint:", error);
										spatialFootprint = [];
									}
								} else {
									console.warn("Unexpected type for spatialFootprint:", typeof props.fields.spatialFootprint);
									spatialFootprint = [];
								}
							}

							return spatialFootprint;
						} catch (error) {
							console.error("Error processing spatialFootprint:", error);
							return [];
						}
					})()}
					onChange={(_items: any) => {
						try {
							//const _parsedItems = Array.isArray(items) ? items : (items);
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
		attachments: (
			<Field key="attachments" label="">
				<ContentRepeater
					id="attachments"
					caption="Attachments"
					dnd_order={true}
					save_path_temp="/uploads/temp"
					file_viewer_temp_url="/disaster-record/file-temp-viewer"
					file_viewer_url="/disaster-record/file-viewer?loc=losses"
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
							//const _parsedItems = Array.isArray(items) ? items : (items);
							//console.log("Updated Items:", parsedItems);
							// Save or process `parsedItems` here, e.g., updating state or making an API call
						} catch {
							console.error("Failed to process items.");
						}
					}}
				/>
			</Field>
		)
	}

	return (
		<FormView
			ref={formRef}
			path={route}
			listUrl={route2(props.fields.recordId!) + "?sectorId=" + props.fields.sectorId}
			edit={props.edit}
			id={props.id}
			plural="Losses"
			singular="Losses"
			errors={props.errors}
			fields={props.fields}
			fieldsDef={props.fieldDef}
			elementsAfter={{
				description: (
					<h2>Public</h2>
				),
				publicCostTotalOverride: (
					<h2>Private</h2>
				),
			}}
			override={override}
		/>
	)
}

interface LossesViewProps {
	item: LossesViewModel
	fieldDef: FormInputDef<LossesFields>[]
}

export function LossesView(props: LossesViewProps) {

	// select field to show based if sector is related to agriculture
	let extra = props.item.sectorIsAgriculture ? {
		relatedToNotAgriculture: null
	} : {
		relatedToAgriculture: null
	}

	const handlePreviewMap = (e: any) => {
		e.preventDefault();
		previewMap(JSON.stringify((props.item.spatialFootprint)));
	};

	let override = {
		sectorIsAgriculture: null,
		recordId: (
			<p key="recordId">Disaster record ID: {props.item.recordId}</p>
		),
		sectorId: (
			<p key="sectorId">Sector ID: {props.item.sectorId}</p>
		),
		...extra,
		spatialFootprint: (
			<div>
				<p>Spatial Footprint:</p>
				{(() => {
					try {
						let footprints: any[] = []; // Ensure it's always an array

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
						return <p>Invalid JSON format in spatialFootprint.</p>;
					}
				})()}
			</div>
		),
		attachments: (
			<>
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
													<a href={`/disaster-record/file-viewer/?name=${props.item.id}/${attachment.file.name.split("/").pop()}&loc=losses`} target="_blank" rel="noopener noreferrer">
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
	}

	return (
		<ViewComponent
			path={route}
			listUrl={route2(props.item.recordId!) + "?sectorId=" + props.item.sectorId}
			id={props.item.id}
			plural="Losses"
			singular="Losses"
		>
			<FieldsView
				def={props.fieldDef}
				fields={props.item}
				override={override}
				elementsAfter={{
					description: (
						<h2>Public</h2>
					),
					publicTotalCostCurrency: (
						<h2>Private</h2>
					),
				}}
			/>
		</ViewComponent>
	)
}

