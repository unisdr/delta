import {
	UserFormProps,
	FieldsView,
	ViewComponent,
	FormView,
	ViewPropsBase
} from "~/frontend/form";

import {DevExample1Fields, DevExample1ViewModel} from "~/backend.server/models/dev_example1"

export const route = "/examples/dev-example1"

interface DevExample1FormProps extends UserFormProps<DevExample1Fields> {
}

export function DevExample1Form(props: DevExample1FormProps) {
	if (!props.fieldDef){
		throw new Error("fieldDef not passed to DevExample1Form")
	}
	return (
		<FormView
			path={route}
			edit={props.edit}
			id={props.id}
			plural="Dev examples"
			singular="dev example"
			errors={props.errors}
			fields={props.fields}
			fieldsDef={props.fieldDef}
		/>
	)
}


interface DevExample1ViewProps extends ViewPropsBase<DevExample1Fields> {
	item: DevExample1ViewModel
}

export function DevExample1View(props: DevExample1ViewProps) {
	return (
		<ViewComponent
			path={route}
			id={props.item.id}
			plural="Dev examples"
			singular="Dev example"
		>
			<FieldsView def={props.def} fields={props.item} override={{}} />
		</ViewComponent>
	)
}

