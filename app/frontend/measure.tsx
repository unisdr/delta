import {
	UserFormProps,
	FieldsView,
	ViewComponent,
	FormView,
	ViewPropsBase
} from "~/frontend/form";

import {MeasureFields, MeasureViewModel} from "~/backend.server/models/measure"
import {typeEnumKey, typeLabelForKey} from "~/backend.server/models/measureunit";

export const route = "/settings/measure"


export function measureLabel(obj: {name: string; type: typeEnumKey}): string {
	let typeLabel = typeLabelForKey(obj.type)
	return `${obj.name} (${typeLabel})`
}

interface MeasureFormProps extends UserFormProps<MeasureFields> {}

export function MeasureForm(props: MeasureFormProps) {
	if (!props.fieldDef) throw new Error("fieldDef not passed to MeasureForm")
	return (
		<FormView
			path={route}
			edit={props.edit}
			id={props.id}
			plural="Measures"
			singular="Measure"
			errors={props.errors}
			fields={props.fields}
			fieldsDef={props.fieldDef}
		/>
	)
}

interface MeasureViewProps extends ViewPropsBase<MeasureFields> {
	item: MeasureViewModel
}

export function MeasureView(props: MeasureViewProps) {
	return (
		<ViewComponent
			path={route}
			id={props.item.id}
			plural="Measures"
			singular="Measure"
		>
			<FieldsView def={props.def} fields={props.item} override={{}} />
		</ViewComponent>
	)
}

