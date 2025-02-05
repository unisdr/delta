import {
	UserFormProps,
	FormInputDef,
	FieldsView,
	ViewComponent,
	FormView
} from "~/frontend/form"

import {DisruptionFields, DisruptionViewModel} from "~/backend.server/models/disruption"
import {configCurrencies} from "~/util/config"

// TODO: fix
export const route = "/disaster-record/edit-sub/placeholder-id/disruptions"

interface DisruptionFormProps extends UserFormProps<DisruptionFields> {
	fieldDef: FormInputDef<DisruptionFields>[]
}

export function DisruptionForm(props: DisruptionFormProps) {
	return (
		<FormView
			path={route}
			edit={props.edit}
			id={props.id}
			plural="Disruptions"
			singular={(props.edit ? "Edit" : "Add") + " disruption"}
			errors={props.errors}
			fields={props.fields}
			fieldsDef={props.fieldDef}
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
			id={props.item.id}
			plural="Disruptions"
			singular="Disruption"
		>
			<FieldsView def={props.fieldDef} fields={props.item} override={{}} />
		</ViewComponent>
	)
}

