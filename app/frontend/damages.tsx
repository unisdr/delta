import {
	Field,
	UserFormProps,
	FormInputDef,
	FieldsView,
	ViewComponent,
	FormView,
	WrapInput,
	errorsToStrings,
} from "~/frontend/form"

import {DamagesFields, DamagesViewModel} from "~/backend.server/models/damages"
import {useEffect, useRef, useState} from "react"
import {Link} from "@remix-run/react"
import {unitName, UnitPicker} from "./unit_picker"

import {ContentRepeater} from "~/components/ContentRepeater";
import {previewMap, previewGeoJSON} from "~/components/ContentRepeater/controls/mapper";
import {TreeView} from "~/components/TreeView";

import * as totaloverrides from "~/frontend/components/totaloverrides"

export const route = "/disaster-record/edit-sub/_/damages"

export function route2(recordId: string): string {
	return `/disaster-record/edit-sub/${recordId}/damages`
}

interface Asset {
	id: string
	label: string
}


interface DamagesFormProps extends UserFormProps<DamagesFields> {
	divisionGeoJSON?: any[]
	ctryIso3?: any
	fieldDef: FormInputDef<DamagesFields>[]
	assets: Asset[]
	treeData?: any;
}



export function DamagesForm(props: DamagesFormProps) {

	// show fields based on type
	let formRef = useRef<HTMLFormElement>(null)

	const treeData = props.treeData;
	const ctryIso3 = props.ctryIso3;
	const divisionGeoJSON = props.divisionGeoJSON || [];
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
			dtsFormBody.style.height = `${window.innerHeight - getHeight}px`;
		}
	}

	// handle total overrides
	useEffect(() => {
		let prefixes = [
			"pdRepair",
			"pdRecovery",
			"tdReplacement",
			"tdRecovery"
		]
		let opts = (pref: string): totaloverrides.handleOverridesOpts => {
			return {
				formRef,
				prefix: "",
				partsNames: [pref + "CostUnit", pref.slice(0, 2) + "DamageAmount"],
				resName: pref + "CostTotal",
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

	// handle total overrides
	useEffect(() => {
		if (!formRef.current) return

		totaloverrides.formOnSubmitAllowDisabled(formRef)

		let totalDamageAmountOpts = {
			formRef,
			partsNames: ["pdDamageAmount", "tdDamageAmount"],
			resName: "totalDamageAmount",
			calc: totaloverrides.optionalSum
		}
		let totalRepairReplacementOpts = {
			formRef,
			partsNames: ["pdRepairCostTotal", "tdReplacementCostTotal",],
			resName: "totalRepairReplacement",
			calc: totaloverrides.optionalSum
		}
		let totalRecoveryOpts = {
			formRef,
			partsNames: ["pdRecoveryCostTotal", "tdRecoveryCostTotal"],
			resName: "totalRecovery",
			calc: totaloverrides.optionalSum
		}
		if (formRef.current) {
			totaloverrides.attach(totalDamageAmountOpts)
			totaloverrides.attach(totalRepairReplacementOpts)
			totaloverrides.attach(totalRecoveryOpts)
		}
		return () => {
			if (formRef.current) {
				totaloverrides.detach(totalDamageAmountOpts)
				totaloverrides.detach(totalRepairReplacementOpts)
				totaloverrides.detach(totalRecoveryOpts)
			}
		}
	}, [props.fields])

	// handle show/hide disruption
	useEffect(() => {
		let showHide = (pdType: "pd" | "td", show: boolean) => {
			console.log("disruption show/hide", pdType, show)
			if (!formRef.current) return
			let el = formRef.current!.querySelector('.' + pdType + "Disruption")
			if (!el) return

			let header = el.querySelector(".header") as HTMLElement
			header.style.display = show ? "block" : "none"
			let addEl = el.querySelector(".add") as HTMLElement
			addEl.style.display = show ? "none" : "inline"
			let hideEl = el.querySelector(".hide") as HTMLElement
			hideEl.style.display = show ? "inline" : "none"

			//	for each row
			for (let elName of ["DisruptionDurationDays", "DisruptionDescription"]) {
				let el = formRef.current.querySelector("[name=" + pdType + elName + "]")
				if (!el) {
					throw new Error("el not found:" + elName)
				}
				let p = el.closest(".mg-grid") as HTMLElement
				p.style.display = show ? "grid" : "none"
			}
		}
		let attach = (pdType: "pd" | "td") => {
			let el = formRef.current!.querySelector('.' + pdType + "Disruption")
			if (!el) return
			el.querySelector(".add")!.addEventListener("click", (e: Event) => {
				e.preventDefault()
				showHide(pdType, true)
			})
			el.querySelector(".hide")!.addEventListener("click", (e: Event) => {
				e.preventDefault()
				showHide(pdType, false)
			})
		}
		if (formRef.current) {
			let isEmpty = function (v: any) {
				return typeof v !== 'string' || v === ""
			}
			let disruptionFields = [
				"DisruptionDescription",
				"DisruptionDurationDays",
				"DisruptionDurationHours",
				"DisruptionUsersAffected",
				"DisruptionPeopleAffected"
			]
			let prefixes: ("pd"|"td")[] = ["pd", "td"]
			prefixes.forEach(prefix => {
				attach(prefix)
				let show = disruptionFields.some(field => !isEmpty((props.fields as any)[prefix + field]))
				showHide(prefix, show)
			});
		}
		return () => {
			if (formRef.current) {
				// TODO: remove event listener
			}
		}
	}, [props.fields])


	let assetDef = props.fieldDef.find(d => d.key == "assetId")
	if (!assetDef) {
		throw new Error("assetId def does not exist")
	}

	let assetIdErrors: string[] | undefined;
	if (props.errors && props.errors.fields) {
		assetIdErrors = errorsToStrings(props.errors.fields["assetId"]);
	}

	let [assetId, setAssetId] = useState(props.fields.assetId || (props.assets.length ? props.assets[0].id : ""))

	let assetName = () => {
		const asset = props.assets.find((a) => a.id === assetId)
		return asset ? asset.label : ""
	}

	let [unitCode, setUnitCode] = useState(props.fields.unit || "number_count")

	let unitNameLocal = () => {
		if (!unitCode) {
			return ""
		}
		return unitName(unitCode)
	}

	let pdDam = props.fieldDef.find(d => d.key == "pdDamageAmount")
	if (!pdDam) {
		throw new Error("pdDamageAmount def does not exist")
	}
	pdDam.label = `Amount of units (${unitNameLocal()})`
	let tdDam = props.fieldDef.find(d => d.key == "tdDamageAmount")
	if (!tdDam) {
		throw new Error("tdDamageAmount def does not exist")
	}
	tdDam.label = `Amount of units (${unitNameLocal()})`

	//	let [pdDamageAmountDef, setPdDamageAmountDef] = useState(pdDam)
	let pdDamageAmountErrors: string[] | undefined;
	if (props.errors && props.errors.fields) {
		assetIdErrors = errorsToStrings(props.errors.fields.pdDamageAmount);
	}
	//let [tdDamageAmountDef, setTdDamageAmountDef] = useState(tdDam)
	let tdDamageAmountErrors: string[] | undefined;
	if (props.errors && props.errors.fields) {
		assetIdErrors = errorsToStrings(props.errors.fields.tdDamageAmount);
	}

	let override = {
		assetId: (
			<>
				{props.assets ? (
					<WrapInput
						def={assetDef}
						child={
							<>
								<select
									required={true}
									name="assetId"
									value={assetId}
									onChange={(e) => setAssetId(e.target.value)}
								>
									{props.assets.sort((a, b) => a.label.localeCompare(b.label)).map((a) => (
										<option key={a.id} value={a.id}>
											{a.label}
										</option>
									))}
								</select>
								<Link target="_blank" to={"/settings/assets/edit/new?sectorId=" + props.fields.sectorId}>
									Add asset
								</Link>
							</>
						}
						errors={assetIdErrors}
					/>
				) : (
					<p>No assets, add asset first.</p>
				)}
			</>
		),
		pdDamageAmount:
			<WrapInput
				def={pdDam}
				child={
					<>
						<input
							type="text"
							inputMode="numeric"
							pattern="[0-9]*"
							name="pdDamageAmount"
							defaultValue={props.fields.pdDamageAmount || ""}
						/>
					</>
				}
				errors={pdDamageAmountErrors}
			/>,
		tdDamageAmount:
			<WrapInput
				def={tdDam}
				child={
					<>
						<input
							type="text"
							inputMode="numeric"
							pattern="[0-9]*"
							name="tdDamageAmount"
							defaultValue={props.fields.tdDamageAmount || ""}
						/>
					</>
				}
				errors={tdDamageAmountErrors}
			/>,
		recordId: (
			<input key="recordId" name="recordId" type="hidden" value={props.fields.recordId} />
		),
		sectorId: (
			<input key="sectorId" name="sectorId" type="hidden" value={props.fields.sectorId} />
		),
		unit: <UnitPicker labelPrefix="" name="unit" defaultValue={props.fields.unit || undefined} onChange={
			(key) => {
				let k = key as any
				setUnitCode(k)
			}
		} />,

		spatialFootprint: (
			<Field key="spatialFootprint" label="">
				<ContentRepeater
					divisions={divisionGeoJSON}
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
					file_viewer_url="/disaster-record/file-viewer?loc=damages"
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
	}

	return (
		<FormView
			formRef={formRef}
			path={route}
			listUrl={route2(props.fields.recordId!) + "?sectorId=" + props.fields.sectorId}
			edit={props.edit}
			id={props.id}
			plural="Damages"
			singular="Damage"
			errors={props.errors}
			fields={props.fields}
			fieldsDef={props.fieldDef}
			elementsAfter={{
				totalRepairReplacementOverride: (
					<h2 className="partially-damaged-header">Partially damaged ({assetName()})</h2>
				),
				pdDisruptionDescription: (
					<h2 className="totally-destroyed-header">Totally destroyed ({assetName()})</h2>
				),
				pdRecoveryCostTotalOverride: (
					<div className="pdDisruption">
						<a className="add" href="#">Add disruption</a>
						<a className="hide" href="#">Hide disruption</a>
						<h3 className="header">Disruption</h3>
					</div>
				),
				tdRecoveryCostTotalOverride: (
					<div className="tdDisruption">
						<a className="add" href="#">Add disruption</a>
						<a className="hide" href="#">Hide disruption</a>
						<h3 className="header">Disruption</h3>
					</div>
				),

			}}
			override={override}
		/>
	)
}

interface DamagesViewProps {
	item: DamagesViewModel
	def: FormInputDef<DamagesFields>[]
}

export function DamagesView(props: DamagesViewProps) {

	const handlePreviewMap = (e: any) => {
		e.preventDefault();
		previewMap(JSON.stringify((props.item.spatialFootprint)));
	};

	let override: Record<string, JSX.Element | null | undefined> = {
		recordId: <p key="recordId">Disaster record ID: {props.item.recordId}</p>,
		sectorId: <p key="sectorId">Sector ID: {props.item.sectorId}</p>,
		assetId: <p key="assetId">Asset: {props.item.asset.name}</p>,

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
													<a href={`/disaster-record/file-viewer/?name=${props.item.id}/${attachment.file.name.split("/").pop()}&loc=damages`} target="_blank" rel="noopener noreferrer">
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

	let elementsAfter = {
		totalRepairReplacementOverride: (
			<h2>Partially damaged</h2>
		),
		pdDisruptionDescription: (
			<h2>Totally destroyed</h2>
		),
		pdRecoveryCostTotalOverride: (
			<h3>Disruption</h3>
		),
		tdRecoveryCostTotalOverride: (
			<h3>Disruption</h3>
		),
	}

	let hideDisruptionIfNoData = (pre: "pd" | "td") => {
		let fields = ["DisruptionDurationDays", "DisruptionDurationHours", "DisruptionUsersAffected", "DisruptionPeopleAffected", "DisruptionDescription"]
		let exists = false
		for (let f of fields) {
			let fName = pre + f as keyof DamagesViewModel
			if (props.item[fName] !== null) {
				exists = true
			}
		}
		if (!exists) {
			let fName = pre + "RecoveryCostTotalOverride" as keyof (typeof elementsAfter)
			delete elementsAfter[fName]
			for (let f of fields) {
				let fName = pre + f
				override[fName] = null
			}
		}
	}
	hideDisruptionIfNoData("pd")
	hideDisruptionIfNoData("td")

	return (
		<ViewComponent
			path={route}
			listUrl={route2(props.item.recordId!) + "?sectorId=" + props.item.sectorId}
			id={props.item.id}
			plural="Damages"
			singular="Damage"
		>
			<FieldsView
				def={props.def}
				fields={props.item}
				elementsAfter={elementsAfter}
				override={override}
			/>
		</ViewComponent>
	)
}

