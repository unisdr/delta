import {
	UserFormProps,
	FormInputDef,
	FieldsView,
	ViewComponent,
	FormView
} from "~/frontend/form";

import {DevExample1} from "~/drizzle/schema";

import {DevExample1Fields, DevExample1ViewModel} from "~/backend.server/models/dev_example1"

export const route = "/examples/dev-example1"

export const fieldsDef: FormInputDef<DevExample1Fields>[] = [
	{key: "field1", label: "Field 1", type: "text", required: true},
	{key: "field2", label: "Field 2", type: "text"},
	{key: "field3", label: "Field 3", type: "number", required: true},
	{key: "field4", label: "Field 4", type: "number"},
	{key: "field5", label: "Field 5", type: "date"},
	{
		key: "field6", label: "Field 6", type: "enum", required: true, enumData: [
			{key: "one", label: "One"},
			{key: "two", label: "Two"},
			{key: "three", label: "Three"}
		]
	}
];

export const fieldsDefView: FormInputDef<DevExample1>[] = [
	...fieldsDef
];

interface DevExample1FormProps extends UserFormProps<DevExample1Fields> {}

export function DevExample1Form(props: DevExample1FormProps) {
	return (
		<FormView
			path={route}
			edit={props.edit}
			id={props.id}
			plural="Dev examples"
			singular={(props.edit ? "Edit" : "Add") + " dev example"}
			errors={props.errors}
			fields={props.fields}
			fieldsDef={fieldsDef}
		/>
	);
}


interface DevExample1ViewProps {
	item: DevExample1ViewModel;
}

export function DevExample1View(props: DevExample1ViewProps) {
	return (
		<ViewComponent
			path={route}
			id={props.item.id}
			plural="Dev examples"
			singular="Dev example"
		>
			<FieldsView def={fieldsDefView} fields={props.item} override={{}} />
		</ViewComponent>
	);
}

