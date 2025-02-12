import {
	UserFormProps,
	FormInputDef,
	FieldsView,
	ViewComponent,
	FormView
} from "~/frontend/form"

import {DisruptionFields, DisruptionViewModel} from "~/backend.server/models/disruption"

export const route = "/disaster-record/edit-sub/_/disruptions"

export function route2(recordId: string): string {
	return `/disaster-record/edit-sub/${recordId}/disruptions`
}

interface DisruptionFormProps extends UserFormProps<DisruptionFields> {
	fieldDef: FormInputDef<DisruptionFields>[]
}

export function DisruptionForm(props: DisruptionFormProps) {
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
			}}
		/>
	)
}

interface DisruptionViewProps {
	item: DisruptionViewModel
	fieldDef: FormInputDef<DisruptionFields>[]
}

export function DisruptionView(props: DisruptionViewProps) {
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
				}}

			/>
		</ViewComponent>
	)
}

