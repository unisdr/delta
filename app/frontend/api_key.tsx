
import {
	UserFormProps,
	FormInputDef,
	FieldsView,
	FormView,
	ViewComponent
} from "~/frontend/form";

import {ApiKeyFields, ApiKeyViewModel} from "~/backend.server/models/api_key";
import {formatDate} from "~/util/date";

export const route = "/settings/api-key"

export const fieldsDefCommon = [
	{key: "name", label: "Name", type: "text", required: true},
] as const;

export const fieldsDef: FormInputDef<ApiKeyFields>[] = [
	...fieldsDefCommon
];

export const fieldsDefView: FormInputDef<ApiKeyViewModel>[] = [
	{key: "createdAt", label: "Created At", type: "other"},
	{key: "managedByUser", label: "Managed By User", type: "other"},
	...fieldsDefCommon,
	{key: "secret", label: "Secret", type: "text"},
];

interface ApiKeyFormProps extends UserFormProps<ApiKeyFields> {}

export function ApiKeyForm(props: ApiKeyFormProps) {
	return (
		<FormView
			path={route}
			edit={props.edit}
			id={props.id}
			plural="API Keys"
			singular="API Key"
			errors={props.errors}
			fields={props.fields}
			fieldsDef={fieldsDef}
		/>
	);
}


interface ApiKeyViewProps {
	item: ApiKeyViewModel;
}

export function ApiKeyView(props: ApiKeyViewProps) {
	const item = props.item;
	return (
		<ViewComponent
			path={route}
			id={props.item.id}
			plural="API Keys"
			singular="API Key"
		>
			<FieldsView def={fieldsDefView} fields={item} override={{
				createdAt: (
					<div key="createdAt">
						<p>Created at: {formatDate(item.createdAt)}</p>
					</div>
				),
				managedByUser: (
					<div key="managedByUser">
						<p>Managed By: {item.managedByUser.email}</p>
					</div>
				)
			}} />
		</ViewComponent>
	);
}


