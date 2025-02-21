import {
	Field,
	UserFormProps,
	FormInputDef,
	FieldsView,
	ViewComponent,
	FormView,
	WrapInput,
	errorsToStrings,
	WrapInputBasic
} from "~/frontend/form"

import {DamagesFields, DamagesViewModel} from "~/backend.server/models/damages"
import {useEffect, useRef} from "react"
import {Link} from "@remix-run/react"
import {UnitPicker} from "./unit_picker"

import {ContentRepeater} from "~/components/ContentRepeater";
import {previewMap, previewGeoJSON} from "~/components/ContentRepeater/controls/mapper";
import {TreeView} from "~/components/TreeView";

export const route = "/disaster-record/edit-sub/_/damages"

export function route2(recordId: string): string {
	return `/disaster-record/edit-sub/${recordId}/damages`
}

interface Asset {
	id: string
	label: string
}

interface DamagesFormProps extends UserFormProps<DamagesFields> {
	fieldDef: FormInputDef<DamagesFields>[]
	assets: Asset[]
	treeData?: any;
}

export function DamagesForm(props: DamagesFormProps) {
	if (!props.fields.publicDamage) {
		props.fields.publicDamage = "partial"
	}
	if (!props.fields.privateDamage) {
		props.fields.privateDamage = "partial"
	}

	// show fields based on type
	let formRef = useRef<HTMLFormElement>(null)

	const treeData = props.treeData;
	const treeViewRef = useRef<any>(null);
	const contentReapeaterRef = useRef<any>(null);

	let setDisplay = (form: HTMLFormElement, prefix: string, show: boolean) => {
		// since they are all on the same row now, can use one element instead
		let fields = [
			"CostUnit",
			//"CostUnitCurrency",
			//"UnitType",
			//"Unit",
			//"Units",
			//"CostTotalOverride",
			//"CostTotalOverrideCheckbox",
		]
		for (let field of fields) {
			let f = form.querySelector('[name="' + prefix + field + '"]')
			if (f) {
				let p = f.closest(".mg-grid")
				if (p) {
					let p = f.closest(".mg-grid") as HTMLElement | null
					if (p) p.style.display = show ? "grid" : "none"
				}
			}
		}
	}

	useEffect(() => {


		let showBasedOnType = (publicOrPrivate: string, totalOrPartial: string) => {
			console.log("showBasedOnType", publicOrPrivate, totalOrPartial)
			if (!formRef.current) return
			let show = true
			if (totalOrPartial == "total") {
				show = false
			} else if (totalOrPartial == "partial") {
				show = true
			} else {
				throw Error("invalid target value")
			}
			setDisplay(formRef.current, publicOrPrivate + "Repair", show)
			setDisplay(formRef.current, publicOrPrivate + "Replacement", !show)
		}
		let attach = (type: string) => {
			const pub = formRef.current!.querySelector('[name="' + type + 'Damage"]')
			if (pub) {
				pub.addEventListener('change', (e: Event) => {
					if (!formRef.current) return
					let target = e.target as HTMLSelectElement
					showBasedOnType(type, target.value)
				})
			}
		}
		if (formRef.current) {
			attach("public")
			showBasedOnType("public", props.fields.publicDamage!)
			attach("private")
			showBasedOnType("private", props.fields.privateDamage!)
		}
		return () => {
			if (formRef.current) {
				const pub = formRef.current.querySelector('[name="publicDamage"]')
				if (pub) {
					//				pub.removeEventListener('change', todo)
				}
				const priv = formRef.current.querySelector('[name="privDamage"]')
				if (priv) {
					//				priv.removeEventListener('change', todo)
				}
			}
		}
	}, [props.fields])


	// handle total overrides
	// this is duplicate code from losses
	// TODO: abstract to have 1 copy only
	//
	let getEl = (prefix: string, field: string): HTMLFormElement => {
		let f = formRef.current!.querySelector('[name="' + prefix + field + '"]') as HTMLFormElement
		return f
	}

	useEffect(() => {
		let attach = (prefix: string) => {
			if (!formRef.current) return
			update(prefix)
			let els = [
				getEl(prefix, "CostUnit"),
				getEl(prefix, "Units"),
				getEl(prefix, "CostTotalOverrideCheckbox"),
			]
			els.forEach(el => {
				el.addEventListener('input', () => {
					update(prefix)
				})
			})
		}
		let update = (prefix: string) => {
			if (!formRef.current) return

			let costPerUnit = Number(getEl(prefix, "CostUnit").value)
			let qtty = Number(getEl(prefix, "Units").value)
			let r = ""
			if (!costPerUnit || !qtty) {
				r = ""
			} else {
				r = String(costPerUnit * qtty)
			}
			let checkbox = getEl(prefix, "CostTotalOverrideCheckbox")
			let el = getEl(prefix, "CostTotalOverride")
			if (!checkbox.checked) {
				el.value = r
				el.disabled = true
			} else {
				el.disabled = false
			}
		}
		let detach = (prefix: string) => {
			let els = [
				getEl(prefix, "CostUnit"),
				getEl(prefix, "Units"),
				getEl(prefix, "CostTotalOverrideCheckbox"),
			]
			els.forEach(_el => {
				//el.removeEventListener('change', todo)
			})
		}

		let prefixes = [
			"publicRepair",
			"publicReplacement",
			"publicRecovery",
			"privateRepair",
			"privateReplacement",
			"privateRecovery"
		]
		if (formRef.current) {
			formRef.current.addEventListener("submit", () => {
				for (let prefix of prefixes) {
					let c = getEl(prefix, "CostTotalOverrideCheckbox")
					if (!c.checked) {
						let el = getEl(prefix, "CostTotalOverride")
						el.value = ""
					}
				}
			})
			for (let pref of prefixes) {
				attach(pref)
			}
		}
		return () => {
			if (formRef.current) {
				for (let pref of prefixes) {
					detach(pref)
				}
			}
		}
	}, [props.fields])
	let totalCostOverride = (prefix: string) => {
		let defKey = prefix + "CostTotalOverride"
		let def = props.fieldDef.find(d => d.key == defKey)!
		if (!def) {
			throw new Error("def not found: " + defKey)
		}

		let errors: string[] | undefined;
		let key = (prefix + "CostTotalOverride") as keyof DamagesFields
		if (props.errors && props.errors.fields) {
			let e1 = props.errors.fields?.[key]
			errors = errorsToStrings(e1)
		}
		let v = props.fields[key]
		let checked = v !== null && v !== undefined
		return <>
			<WrapInput
				def={def}
				child={
					<>
						<input
							name={prefix + "CostTotalOverride"}
							type="text"
							inputMode="decimal"
							pattern="[0-9]*\.?[0-9]*"
							defaultValue={v ?? ""}
						>
						</input>
					</>
				}
				errors={errors}
			/>
			<WrapInputBasic
				label="Override total cost"
				child={
					<input
						name={prefix + "CostTotalOverrideCheckbox"}
						type="checkbox"
						defaultChecked={checked}
					>
					</input>
				}
			/>
		</>
	}

	// handle show/hide disruption
	useEffect(() => {
		let showHide = (publicOrPrivate: string, show: boolean) => {
			console.log("disruption show/hide", publicOrPrivate, show)
			if (!formRef.current) return
			let el = formRef.current!.querySelector('.' + publicOrPrivate + "Disruption")
			if (!el) return

			let header = el.querySelector(".header") as HTMLElement
			header.style.display = show ? "block" : "none"
			let addEl = el.querySelector(".add") as HTMLElement
			addEl.style.display = show ? "none" : "inline"
			let hideEl = el.querySelector(".hide") as HTMLElement
			hideEl.style.display = show ? "inline" : "none"

			//	for each row
			for (let elName of ["DisruptionDurationDays", "DisruptionDescription"]) {
				let el = formRef.current.querySelector("[name=" + publicOrPrivate + elName + "]")
				if (!el) {
					throw new Error("el not found:" + elName)
				}
				let p = el.closest(".mg-grid") as HTMLElement
				p.style.display = show ? "grid" : "none"
			}
		}
		let attach = (publicOrPrivate: string) => {
			let el = formRef.current!.querySelector('.' + publicOrPrivate + "Disruption")
			if (!el) return
			el.querySelector(".add")!.addEventListener("click", (e: Event) => {
				e.preventDefault()
				showHide(publicOrPrivate, true)
			})
			el.querySelector(".hide")!.addEventListener("click", (e: Event) => {
				e.preventDefault()
				showHide(publicOrPrivate, false)
			})
		}
		if (formRef.current) {
			attach("public")
			showHide("public", false)
			attach("private")
			showHide("private", false)
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
									defaultValue={props.fields.assetId || ""}
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
		recordId: (
			<input key="recordId" name="recordId" type="hidden" value={props.fields.recordId} />
		),
		sectorId: (
			<input key="sectorId" name="sectorId" type="hidden" value={props.fields.sectorId} />
		),
		publicUnit: <UnitPicker labelPrefix="Public" name="publicUnit" defaultValue={props.fields.publicUnit || undefined} />,
		//publicRepairUnit: <UnitPicker labelPrefix="Repair" name="publicRepairUnit" defaultValue={props.fields.publicRepairUnit || undefined} />,
		//publicReplacementUnit: <UnitPicker labelPrefix="Replacement" name="publicReplacementUnit" defaultValue={props.fields.publicReplacementUnit || undefined} />,
		//publicRecoveryUnit: <UnitPicker labelPrefix="Recovery" name="publicRecoveryUnit" defaultValue={props.fields.publicRecoveryUnit || undefined} />,
		privateUnit: <UnitPicker labelPrefix="Private" name="privateUnit" defaultValue={props.fields.privateUnit || undefined} />,
		//	privateReplacementUnit: <UnitPicker labelPrefix="Replacement" name="privateReplacementUnit" defaultValue={props.fields.publicReplacementUnit || undefined} />,
		//privateRecoveryUnit: <UnitPicker labelPrefix="Recovery" name="privateRecoveryUnit" defaultValue={props.fields.publicRecoveryUnit || undefined} />,


		publicRepairCostTotalOverride: totalCostOverride("publicRepair"),
		publicReplacementCostTotalOverride: totalCostOverride("publicReplacement"),
		publicRecoveryCostTotalOverride: totalCostOverride("publicRecovery"),
		privateRepairCostTotalOverride: totalCostOverride("privateRepair"),
		privateReplacementCostTotalOverride: totalCostOverride("privateReplacement"),
		privateRecoveryCostTotalOverride: totalCostOverride("privateRecovery"),

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
						{ id: "tag", show: false, caption: "Tags", type: "tokenfield", dataSource: [{ id: 1, name: "React" }, { id: 2, name: "Vue" }, { id: 3, name: "Angular" }, { id: 4, name: "Svelte" }, { id: 5, name: "SolidJS" } , { id: 6, name: "Remix" }] },
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
					onChange={(items: any) => {
						try {
							const parsedItems = Array.isArray(items) ? items : (items);
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
			plural="Damages"
			singular="Damage"
			errors={props.errors}
			fields={props.fields}
			fieldsDef={props.fieldDef}
			elementsAfter={{
				assetId: (
					<h2>Public</h2>
				),
				publicRecoveryCostTotalOverride: (
					<div className="publicDisruption">
						<a className="add" href="#">Add disruption</a>
						<a className="hide" href="#">Hide disruption</a>
						<h3 className="header">Disruption</h3>
					</div>
				),
				privateRecoveryCostTotalOverride: (
					<div className="privateDisruption">
						<a className="add" href="#">Add disruption</a>
						<a className="hide" href="#">Hide disruption</a>
						<h3 className="header">Disruption</h3>
					</div>
				),
				publicDisruptionDescription: (
					<h2>Private</h2>
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

	// calculate totals for display only
	for (let prefix of [
		"publicRepair",
		"publicReplacement",
		"publicRecovery",
		"privateRepair",
		"privateReplacement",
		"privateRecovery",
	]) {
		let keyTotal = prefix + "CostTotalOverride" as keyof DamagesViewModel
		let keyCostPerUnit = prefix + "CostUnit" as keyof DamagesViewModel
		let keyUnits = prefix + "Units" as keyof DamagesViewModel
		if (!props.item[keyTotal]) {
			let costPerUnit = props.item[keyCostPerUnit]
			let units = props.item[keyUnits]
			if (costPerUnit && units) {
				let res = Math.round(Number(costPerUnit) * Number(units))
				let item = props.item as any
				item[keyTotal] = String(res)
			}
		}
	}

	const handlePreviewMap = (e: any) => {
		e.preventDefault();
		previewMap(JSON.stringify((props.item.spatialFootprint)));
	};

	let override: Record<string, JSX.Element | null | undefined> = {
		recordId: <p key="recordId">Disaster record ID: {props.item.recordId}</p>,
		sectorId: <p key="sectorId">Sector ID: {props.item.sectorId}</p>,
		assetId: <p key="assetId">Asset: {props.item.asset.name}</p>,

		publicUnit: undefined,
		publicRepairCostUnit: undefined,
		publicRepairCostUnitCurrency: undefined,
		publicRepairUnit: undefined,
		publicRepairUnits: undefined,
		publicRepairCostTotalOverride: undefined,
		publicReplacementCostUnit: undefined,
		publicReplacementCostUnitCurrency: undefined,
		publicReplacementUnit: undefined,
		publicReplacementUnits: undefined,
		publicReplacementCostTotalOverride: undefined,
		privateUnit: undefined,
		privateRepairCostUnit: undefined,
		privateRepairCostUnitCurrency: undefined,
		privateRepairUnit: undefined,
		privateRepairUnits: undefined,
		privateRepairCostTotalOverride: undefined,
		privateReplacementCostUnit: undefined,
		privateReplacementCostUnitCurrency: undefined,
		privateReplacementUnit: undefined,
		privateReplacementUnits: undefined,
		privateReplacementCostTotalOverride: undefined,

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
						  <a href={`/disaster-record/file-viewer/?name=${props.item.id}/${attachment.file.name.split("/").pop()}&loc=damages`} target="_blank" rel="noopener noreferrer">
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
		assetId: (
			<h2>Public</h2>
		),
		publicDisruptionDescription: (
			<h2>Private</h2>
		),
		publicRecoveryCostTotalOverride: (
			<h3>Disruption</h3>
		),
		privateRecoveryCostTotalOverride: (
			<h3>Disruption</h3>
		),
	}

	let hideDisruptionIfNoData = (publicOrPrivate: "public" | "private") => {
		let fields = ["DisruptionDurationDays", "DisruptionDurationHours", "DisruptionUsersAffected", "DisruptionPeopleAffected", "DisruptionDescription"]
		let exists = false
		for (let f of fields) {
			let fName = publicOrPrivate + f as keyof DamagesViewModel
			if (props.item[fName] !== null) {
				exists = true
			}
		}
		if (!exists) {
			let fName = publicOrPrivate + "RecoveryCostTotalOverride" as keyof (typeof elementsAfter)
			delete elementsAfter[fName]
			for (let f of fields) {
				let fName = publicOrPrivate + f
				override[fName] = null
			}
		}
	}
	hideDisruptionIfNoData("public")
	hideDisruptionIfNoData("private")

	if (props.item.publicDamage == "total") {
		override.publicRepairCostUnit = null
		override.publicRepairCostUnitCurrency = null
		override.publicRepairUnit = null
		override.publicRepairUnits = null
		override.publicRepairCostTotalOverride = null
	} else {
		override.publicReplacementCostUnit = null
		override.publicReplacementCostUnitCurrency = null
		override.publicReplacementUnit = null
		override.publicReplacementUnits = null
		override.publicReplacementCostTotalOverride = null
	}

	if (props.item.privateDamage == "total") {
		override.privateRepairCostUnit = null
		override.privateRepairCostUnitCurrency = null
		override.privateRepairUnit = null
		override.privateRepairUnits = null
		override.privateRepairCostTotalOverride = null
	} else {
		override.privateReplacementCostUnit = null
		override.privateReplacementCostUnitCurrency = null
		override.privateReplacementUnit = null
		override.privateReplacementUnits = null
		override.privateReplacementCostTotalOverride = null
	}

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

