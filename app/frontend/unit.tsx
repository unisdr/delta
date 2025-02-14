import {
	UserFormProps,
	FieldsView,
	ViewComponent,
	FormView,
	ViewPropsBase,
	Field
} from "~/frontend/form";

import {UnitFields, UnitViewModel} from "~/backend.server/models/unit"

export let route = "/settings/unit"

interface UnitFormProps extends UserFormProps<UnitFields> {}

export function UnitForm(props: UnitFormProps) {
	if (!props.fieldDef) {
		throw new Error("fieldDef not passed to UnitForm")
	}
	return (
		<FormView
			path={route}
			edit={props.edit}
			id={props.id}
			plural="Units"
			singular="Unit"
			errors={props.errors}
			fields={props.fields}
			fieldsDef={props.fieldDef}
		/>
	)
}

interface UnitViewProps extends ViewPropsBase<UnitFields> {
	item: UnitViewModel
}

export function UnitView(props: UnitViewProps) {
	return (
		<ViewComponent
			path={route}
			id={props.item.id}
			plural="Units"
			singular="Unit"
		>
			<FieldsView def={props.def} fields={props.item} override={{}} />
		</ViewComponent>
	)
}
