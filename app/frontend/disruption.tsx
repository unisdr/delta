import {
	UserFormProps,
	FormInputDef,
	FieldsView,
	ViewComponent,
	FormView
} from "~/frontend/form"

import { DisruptionFields, DisruptionViewModel } from "~/backend.server/models/disruption"

// TODO: fix
export const route = "/disaster-record/edit-sub/placeholder-id/disruptions"

export const fieldsDef: FormInputDef<DisruptionFields>[] = [
	{ key: "durationDays", label: "Duration (Days)", type: "number" },
	{ key: "durationHours", label: "Duration (Hours)", type: "number" },
	{ key: "usersAffected", label: "Users Affected", type: "number" },
	{ key: "comment", label: "Comment", type: "text" },
	{ key: "responseOperation", label: "Response Operation", type: "text" },
	{ key: "responseCost", label: "Response Cost", type: "number" },
	{ key: "responseCurrency", label: "Response Currency", type: "text" }
]

export const fieldsDefApi: FormInputDef<DisruptionFields>[] = [
	...fieldsDef,
	{ key: "apiImportId", label: "", type: "other" }
]

export const fieldsDefView: FormInputDef<DisruptionFields>[] = [
	...fieldsDef
]

interface DisruptionFormProps extends UserFormProps<DisruptionFields> {}

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
			fieldsDef={fieldsDef}
		/>
	)
}

interface DisruptionViewProps {
	item: DisruptionViewModel
}

export function DisruptionView(props: DisruptionViewProps) {
	return (
		<ViewComponent
			path={route}
			id={props.item.id}
			plural="Disruptions"
			singular="Disruption"
		>
			<FieldsView def={fieldsDefView} fields={props.item} override={{}} />
		</ViewComponent>
	)
}

