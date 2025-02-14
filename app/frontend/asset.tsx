import {
	UserFormProps,
	FieldsView,
	ViewComponent,
	FormView,
	ViewPropsBase,
} from "~/frontend/form";

import {AssetFields, AssetViewModel} from "~/backend.server/models/asset";

export const route = "/settings/assets";

interface AssetFormProps extends UserFormProps<AssetFields> {
}

export function AssetForm(props: AssetFormProps) {
	if (!props.fieldDef) {
		throw new Error("fieldDef not passed to AssetForm");
	}
	return (
		<FormView
			path={route}
			edit={props.edit}
			id={props.id}
			plural="Assets"
			singular="Asset"
			errors={props.errors}
			fields={props.fields}
			fieldsDef={props.fieldDef}
			elementsAfter={{
				sectorId: (
					<a target="_blank" href="/settings/sectors">Edit sectors</a>
				),
				measureId: (
					<a target="_blank" href="/settings/measure">Edit measures/units</a>
				),
			}}
		/>
	);
}

interface AssetViewProps extends ViewPropsBase<AssetFields> {
	item: AssetViewModel;
}

export function AssetView(props: AssetViewProps) {
	return (
		<ViewComponent
			path={route}
			id={props.item.id}
			plural="Assets"
			singular="Asset"
		>
			<FieldsView def={props.def} fields={props.item} override={{}} />
		</ViewComponent>
	);
}
