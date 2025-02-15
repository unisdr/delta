import {
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

	let setDisplay = (form: HTMLFormElement, prefix: string, show: boolean) => {
		let fields = [
			"CostUnit",
			"CostUnitCurrency",
			"UnitType",
			"Unit",
			"Units",
			"CostTotalOverride",
			"CostTotalOverrideCheckbox",
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

	let getEl = (prefix: string, field: string): HTMLFormElement => {
		let f = formRef.current!.querySelector('[name="' + prefix + field + '"]') as HTMLFormElement
		return f
	}

	// handle total overrides
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
			"privateRepair",
			"privateReplacement"
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
		let def = props.fieldDef.find(d => d.key == prefix + "CostTotalOverride")!
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
							</>
						}
						errors={assetIdErrors}
					/>
				) : (
					<p>No assets, add asset first.</p>
				)}
				<Link target="_blank" to={"/settings/assets/edit/new?sectorId=" + props.fields.sectorId}>
					Add asset
				</Link>
			</>
		),
		recordId: (
			<input key="recordId" name="recordId" type="hidden" value={props.fields.recordId} />
		),
		sectorId: (
			<input key="sectorId" name="sectorId" type="hidden" value={props.fields.sectorId} />
		),

		publicRepairUnit: <UnitPicker labelPrefix="Repair" name="publicRepairUnit" defaultValue={props.fields.publicRepairUnit || undefined} />,
		publicReplacementUnit: <UnitPicker labelPrefix="Replacement" name="publicReplacementUnit" defaultValue={props.fields.publicReplacementUnit || undefined} />,
		publicRecoveryUnit: <UnitPicker labelPrefix="Recovery" name="publicRecoveryUnit" defaultValue={props.fields.publicRecoveryUnit || undefined} />,

		privateRepairUnit: <UnitPicker labelPrefix="Repair" name="privateRepairUnit" defaultValue={props.fields.publicRepairUnit || undefined} />,
		privateReplacementUnit: <UnitPicker labelPrefix="Replacement" name="privateReplacementUnit" defaultValue={props.fields.publicReplacementUnit || undefined} />,
		privateRecoveryUnit: <UnitPicker labelPrefix="Recovery" name="privateRecoveryUnit" defaultValue={props.fields.publicRecoveryUnit || undefined} />,


		publicRepairCostTotalOverride: totalCostOverride("publicRepair"),
		publicReplacementCostTotalOverride: totalCostOverride("publicReplacement"),
		publicRecoveryCostTotalOverride: totalCostOverride("publicRecovery"),
		privateRepairCostTotalOverride: totalCostOverride("privateRepair"),
		privateReplacementCostTotalOverride: totalCostOverride("privateReplacement"),
		privateRecoveryCostTotalOverride: totalCostOverride("privateRecovery"),
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

	let override: Record<string, JSX.Element | null | undefined> = {
		recordId: <p key="recordId">Disaster record ID: {props.item.recordId}</p>,
		sectorId: <p key="sectorId">Sector ID: {props.item.sectorId}</p>,
		assetId: <p key="assetId">Asset: {props.item.asset.name}</p>,


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
	}

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
				elementsAfter={{
					assetId: (
						<h2>Public</h2>
					),
					publicDisruptionDescription: (
						<h2>Private</h2>
					),
				}}
				override={override}
			/>
		</ViewComponent>
	)
}

