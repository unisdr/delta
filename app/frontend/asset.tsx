import {
	Field,
	UserFormProps,
	FieldsView,
	ViewComponent,
	FormView,
	ViewPropsBase,
} from "~/frontend/form";

import {AssetFields, AssetViewModel} from "~/backend.server/models/asset";

import { ContentPicker } from "~/components/ContentPicker";
import { contentPickerConfigSector } from "./asset-content-picker-config";

export const route = "/settings/assets";

interface AssetFormProps extends UserFormProps<AssetFields> {
	selectedDisplay: any;
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
			override={
				{
					sectorIds: (
						<Field key="sectorIds" label="Sector">
							<ContentPicker 
								{...contentPickerConfigSector} 
								value={ props.fields.sectorIds } //Assign the sector id here
								displayName={ props.selectedDisplay as any } //Assign the sector name here, from the loaderData > sectorDisplayName sample
								onSelect={(selectedItems: any) => {
									//This is where you can get the selected sector id
									//console.log('selectedItems: ', selectedItems);
								}}
							 />
						</Field>
					)
				}	
			}
		/>
	);
}

interface AssetViewProps extends ViewPropsBase<AssetFields> {
	item: AssetViewModel;
	extraData?: any;
}

export function AssetView(props: AssetViewProps) {
	const sectorNames = props.extraData?.selectedDisplay 
		?.map((s: { name: string }) => s.name)
		.join(", ") || "N/A";
	
	return (
		<ViewComponent
			path={route}
			id={props.item.id}
			plural="Assets"
			singular="Asset"
		>
			<FieldsView def={props.def} fields={props.item} 
				override={{
					sectorIds: (
						<><p>Sector: {sectorNames}</p></>
					)
				}} 
			/>
		</ViewComponent>
	);
}
