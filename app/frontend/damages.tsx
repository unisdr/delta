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

import * as totaloverrides from "~/frontend/components/totaloverrides"

import { rewindGeoJSON } from '~/utils/spatialUtils'

import { SpatialFootprintFormView } from '~/frontend/spatialFootprintFormView';
import { SpatialFootprintView } from '~/frontend/spatialFootprintView';
import { AttachmentsFormView } from "~/frontend/attachmentsFormView";
import { AttachmentsView } from "~/frontend/attachmentsView";

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
				<SpatialFootprintFormView
					divisions={divisionGeoJSON}
					ctryIso3={ctryIso3 || ""}
					treeData={treeData ?? []}
					initialData={props?.fields?.spatialFootprint}
					geographicLevel={false}
				/>
			</Field>
		),
		attachments: (
			<Field key="attachments" label="">
				<AttachmentsFormView
					save_path_temp="/uploads/temp"
					file_viewer_temp_url="/disaster-record/file-temp-viewer"
					file_viewer_url="/disaster-record/file-viewer?loc=damages"
					api_upload_url="/disaster-record/file-pre-upload"
					initialData={props?.fields?.attachments}
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
	let override: Record<string, JSX.Element | null | undefined> = {
		recordId: <p key="recordId">Disaster record ID: {props.item.recordId}</p>,
		sectorId: <p key="sectorId">Sector ID: {props.item.sectorId}</p>,
		assetId: <p key="assetId">Asset: {props.item.asset.name}</p>,

		spatialFootprint: (
			<SpatialFootprintView
				initialData={(props?.item?.spatialFootprint as any[]) || []}
				mapViewerOption={0}
				mapViewerDataSources={[]}
			/>
		),
		attachments: (
			<AttachmentsView
				id={props.item.id}
				initialData={(props?.item?.attachments as any[]) || []}
				file_viewer_url="/disaster-record/file-viewer"
				location="damages"
			/>
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

