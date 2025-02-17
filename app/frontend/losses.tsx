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

import {useEffect, useRef} from "react"

import {LossesFields, LossesViewModel} from "~/backend.server/models/losses"
import {UnitPicker} from "./unit_picker"

export const route = "/disaster-record/edit-sub/_/losses"

export function route2(recordId: string): string {
	return `/disaster-record/edit-sub/${recordId}/losses`
}

interface LossesFormProps extends UserFormProps<LossesFields> {
	fieldDef: FormInputDef<LossesFields>[]
}

export function LossesForm(props: LossesFormProps) {
	// handle total overrides
	// this is duplicate code from damages
	// TODO: abstract to have 1 copy only
	//
	let formRef = useRef<HTMLFormElement>(null)
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
			"public",
			"private",
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
		let key = (prefix + "CostTotalOverride") as keyof LossesFields
		if (props.errors && props.errors.fields) {
			let e1 = props.errors.fields?.[key]
			errors = errorsToStrings(e1)
		}
		let v = props.fields[key] as string
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

		publicCostTotalOverride: totalCostOverride("public"),
		privateCostTotalOverride: totalCostOverride("private"),
		...extra
	}

	return (
		<FormView
			ref={formRef}
			path={route}
			listUrl={route2(props.fields.recordId!) + "?sectorId=" + props.fields.sectorId}
			edit={props.edit}
			id={props.id}
			plural="Losses"
			singular="Loss"
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

	let override = {
		sectorIsAgriculture: null,
		recordId: (
			<p key="recordId">Disaster record ID: {props.item.recordId}</p>
		),
		sectorId: (
			<p key="sectorId">Sector ID: {props.item.sectorId}</p>
		),
		...extra
	}

	return (
		<ViewComponent
			path={route}
			listUrl={route2(props.item.recordId!) + "?sectorId=" + props.item.sectorId}
			id={props.item.id}
			plural="Losses"
			singular="Loss"
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

