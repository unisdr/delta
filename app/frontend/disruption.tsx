import {
	Field,
	UserFormProps,
	FormInputDef,
	FieldsView,
	ViewComponent,
	FormView
} from "~/frontend/form"

import {DisruptionFields, DisruptionViewModel} from "~/backend.server/models/disruption"

import {useRef} from 'react';
import {ContentRepeater} from "~/components/ContentRepeater";
import {previewMap, previewGeoJSON} from "~/components/ContentRepeater/controls/mapper";
import {TreeView} from "~/components/TreeView";

export const route = "/disaster-record/edit-sub/_/disruptions"

export function route2(recordId: string): string {
	return `/disaster-record/edit-sub/${recordId}/disruptions`
}

interface DisruptionFormProps extends UserFormProps<DisruptionFields> {
	fieldDef: FormInputDef<DisruptionFields>[]
	treeData?: any[];
}

export function DisruptionForm(props: DisruptionFormProps) {
	const treeData = props.treeData;
	const treeViewRef = useRef<any>(null);
	const contentReapeaterRef = useRef<any>(null);

	console.log("DisruptionForm", props);

	return (
		<FormView
			path={route}
			listUrl={route2(props.fields.recordId!)+"?sectorId=" + props.fields.sectorId}
			edit={props.edit}
			id={props.id}
			plural="Disruptions"
			singular="Disruption"
			errors={props.errors}
			fields={props.fields}
			fieldsDef={props.fieldDef}
			override={{
				recordId: (
					<input key="recordId" name="recordId" type="hidden" value={props.fields.recordId} />
				),
				sectorId: (
					<input key="sectorId" name="sectorId" type="hidden" value={props.fields.sectorId} />
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
									show: false
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
									return props.fields && props.fields.spatialFootprint ? JSON.parse(props.fields.spatialFootprint) : [];
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
	)
}

interface DisruptionViewProps {
	item: DisruptionViewModel
	fieldDef: FormInputDef<DisruptionFields>[]
}

export function DisruptionView(props: DisruptionViewProps) {
	const handlePreviewMap = (e: any) => {
		e.preventDefault();
		previewMap(JSON.stringify(JSON.parse(props.item.spatialFootprint)));
	};

	return (
		<ViewComponent
			path={route}
			listUrl={route2(props.item.recordId!)+"?sectorId=" + props.item.sectorId}
			id={props.item.id}
			plural="Disruptions"
			singular="Disruption"
		>
			<FieldsView
				def={props.fieldDef}
				fields={props.item}
				override={{
					recordId: (
						<p key="recordId">Disaster record ID: {props.item.recordId}</p>
					),
					sectorId: (
						<p key="sectorId">Sector ID: {props.item.sectorId}</p>
					),
					spatialFootprint: (
						<div>
							<p>Spatial Footprint:</p>
							{(() => {
								try {
									const footprints = JSON.parse(props.item.spatialFootprint); // Parse JSON string

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
	)
}

