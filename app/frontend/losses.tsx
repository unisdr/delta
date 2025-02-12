import {
	UserFormProps,
	FormInputDef,
	FieldsView,
	ViewComponent,
	FormView
} from "~/frontend/form"

import {LossesFields, LossesViewModel} from "~/backend.server/models/losses"

export const route = "/disaster-record/edit-sub/_/losses"

export function route2(recordId: string): string {
	return `/disaster-record/edit-sub/${recordId}/losses`
}

interface LossesFormProps extends UserFormProps<LossesFields> {
	fieldDef: FormInputDef<LossesFields>[]
}

export function LossesForm(props: LossesFormProps) {

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
		...extra
	}

	return (
		<FormView
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
				publicTotalCostCurrency: (
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
			/>
		</ViewComponent>
	)
}

