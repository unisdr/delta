import {
	UserFormProps,
	FormInputDef,
	FieldsView,
	ViewComponent,
	FormView
} from "~/frontend/form"

import {DamagesFields, DamagesViewModel} from "~/backend.server/models/damages"

export const route = "/disaster-record/edit-sub/_/damages"

export function route2(recordId: string): string {
	return `/disaster-record/edit-sub/${recordId}/damages`
}

interface DamagesFormProps extends UserFormProps<DamagesFields> {
	fieldDef: FormInputDef<DamagesFields>[]
}

export function DamagesForm(props: DamagesFormProps) {
	return (
		<FormView
			path={route}
			listUrl={route2(props.fields.recordId!) + "?sectorId=" + props.fields.sectorId}
			edit={props.edit}
			id={props.id}
			plural="Damages"
			singular={(props.edit ? "Edit" : "Add") + " damage"}
			errors={props.errors}
			fields={props.fields}
			fieldsDef={props.fieldDef}
			headersAfter={{
				sectorId: (
					<h2>Public</h2>
				),
				pubDisruptionDescription: (
					<h2>Private</h2>
				),
			}}
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

interface DamagesViewProps {
	item: DamagesViewModel
	fieldDef: FormInputDef<DamagesFields>[]
}

export function DamagesView(props: DamagesViewProps) {
	return (
		<ViewComponent
			path={route}
			listUrl={route2(props.item.recordId!) + "?sectorId=" + props.item.sectorId}
			id={props.item.id}
			plural="Damages"
			singular="Damage"
		>
			<FieldsView
				def={props.fieldDef}
				fields={props.item}
				headersAfter={{
					sectorId: (
						<h2>Public</h2>
					),
					pubDisruptionDescription: (
						<h2>Private</h2>
					),
				}}
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

