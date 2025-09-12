import {
	Field,
	UserFormProps,
	FormInputDef,
	FieldsView,
	ViewComponent,
	FormView
} from "~/frontend/form"

import {DisruptionFields, DisruptionViewModel} from "~/backend.server/models/disruption"

import { SpatialFootprintFormView } from '~/frontend/spatialFootprintFormView';
import { SpatialFootprintView } from '~/frontend/spatialFootprintView';
import { AttachmentsFormView } from "~/frontend/attachmentsFormView";
import { AttachmentsView } from "~/frontend/attachmentsView";
import { TEMP_UPLOAD_PATH } from "~/utils/paths";

export const route = "/disaster-record/edit-sub/_/disruptions"

export function route2(recordId: string): string {
	return `/disaster-record/edit-sub/${recordId}/disruptions`
}

interface DisruptionFormProps extends UserFormProps<DisruptionFields> {
	ctryIso3?: any;
	fieldDef: FormInputDef<DisruptionFields>[]
	treeData?: any[];
	divisionGeoJSON?: any[];
}

export function DisruptionForm(props: DisruptionFormProps) {
	const treeData = props.treeData;
	const ctryIso3 = props.ctryIso3;
	const divisionGeoJSON = props.divisionGeoJSON;

	return (
		<FormView
			path={route}
			listUrl={route2(props.fields.recordId!)+"?sectorId=" + props.fields.sectorId}
			edit={props.edit}
			id={props.id}
			plural="Disruptions"
			singular="Disruption"
			errors={props.errors}
			fields={props.fields}
			fieldsDef={props.fieldDef}
			override={{
				recordId: (
					<input key="recordId" name="recordId" type="hidden" value={props.fields.recordId} />
				),
				sectorId: (
					<input key="sectorId" name="sectorId" type="hidden" value={props.fields.sectorId} />
				),
				spatialFootprint: (
					<Field key="spatialFootprint" label="">
						<SpatialFootprintFormView
							divisions={divisionGeoJSON}
							ctryIso3={ctryIso3 || ""}
							treeData={treeData ?? []}
							initialData={props?.fields?.spatialFootprint}
							geographicLevel={false}
						/>
					</Field>
				),
				attachments: (
					<Field key="attachments" label="">
						<AttachmentsFormView
							save_path_temp={TEMP_UPLOAD_PATH}
							file_viewer_temp_url="/disaster-record/file-temp-viewer"
							file_viewer_url="/disaster-record/file-viewer?loc=disruptions"
							api_upload_url="/disaster-record/file-pre-upload"
							initialData={props?.fields?.attachments}
						/>
					</Field>
				)
			}}
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
			listUrl={route2(props.item.recordId!)+"?sectorId=" + props.item.sectorId}
			id={props.item.id}
			plural="Disruptions"
			singular="Disruption"
		>
			<FieldsView
				def={props.fieldDef}
				fields={props.item}
				override={{
					recordId: (
						<p key="recordId">Disaster record ID: {props.item.recordId}</p>
					),
					sectorId: (
						<p key="sectorId">Sector ID: {props.item.sectorId}</p>
					),
					spatialFootprint: (
						<SpatialFootprintView
							initialData={(props?.item?.spatialFootprint as any[]) || []}
							mapViewerOption={0}
							mapViewerDataSources={[]}
						/>
					),
					attachments: (
						<AttachmentsView
							id={props.item.id}
							initialData={(props?.item?.attachments as any[]) || []}
							file_viewer_url="/disaster-record/file-viewer"
							location="disruptions"
						/>
					  ),
				}}

			/>
		</ViewComponent>
	)
}

