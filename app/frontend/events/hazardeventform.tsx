import {
	Link
} from "@remix-run/react";

import {HazardousEventFields, HazardousEventViewModel} from "~/backend.server/models/event"

import {
	Field,
	FieldErrors,
	UserFormProps,
	FormInputDef,
	FieldsView,
	FormView,
	ViewComponent
} from "~/frontend/form";

import {formatDate} from "~/util/date";

import {useEffect, useState, useRef} from 'react';
import {approvalStatusField} from "~/frontend/approval";

import AuditLogHistory from "~/components/AuditLogHistory";
import {HazardPicker, Hip} from "~/frontend/hip/hazardpicker";
import {HipHazardInfo} from "~/frontend/hip/hip";

import { SpatialFootprintFormView } from '~/frontend/spatialFootprintFormView';
import { SpatialFootprintView } from '~/frontend/spatialFootprintView';
import { AttachmentsFormView } from "~/frontend/attachmentsFormView";
import { AttachmentsView } from "~/frontend/attachmentsView";

export const route = "/hazardous-event"

// 2025-02-25 - removed all fields not in DTS Variables and baselines
export const fieldsDefCommon = [
	approvalStatusField,
	// {key: "otherId1", label: "Event id in other system", type: "text", uiRowNew: true, uiRow: {}},
	// {key: "duration", label: "Duration", type: "text", uiRow: {}},
	{key: "nationalSpecification", label: "National specification", type: "textarea"},
	{key: "startDate", label: "Start Date", type: "date_optional_precision", required: true, uiRow: {}},
	{key: "endDate", label: "End Date", type: "date_optional_precision", required: true},
	{key: "description", label: "Description", type: "textarea", uiRowNew: true},
	//{key: "warningIssuedSummary", label: "Summary", type: "textarea", uiRowNew: true},
	//{key: "warningIssuedBy", label: "Issued By", type: "text", uiRow: {}},
	//{key: "warningIssuedDate", label: "Date", type: "date"},
	//{key: "warningIssuedCoverage", label: "Coverage", type: "textarea", uiRowNew: true},
	//{key: "warningIssuedContent", label: "Warning content", type: "textarea", uiRowNew: true},
	{key: "chainsExplanation", label: "Composite Event - Chains Explanation", type: "textarea"},
	{key: "magnitude", label: "Magnitude", type: "text"},
	{key: "spatialFootprint", label: "Spatial Footprint", type: "other", psqlType: "jsonb", uiRowNew: true},
	{key: "attachments", label: "Attachments", type: "other", psqlType: "jsonb", uiRowNew: true},
	{key: "recordOriginator", label: "Record Originator", type: "text", required: true, uiRow: {}},
	{
		key: "hazardousEventStatus", label: "Hazardous Event Status", type: "enum", enumData: [
			{key: "forecasted", label: "Forecasted"},
			{key: "ongoing", label: "Ongoing"},
			{key: "passed", label: "Passed"},
		],
		uiRowNew: true,
	},
	{key: "dataSource", label: "Data Source", type: "text"},


] as const;

export const fieldsDef: FormInputDef<HazardousEventFields>[] = [
	{key: "parent", label: "", type: "other"},
	{key: "hipHazardId", label: "Hazard", type: "other", uiRow: {colOverride: 1}},
	{key: "hipClusterId", label: "", type: "other"},
	{key: "hipTypeId", label: "", type: "other"},
	...fieldsDefCommon
];

export const fieldsDefApi: FormInputDef<HazardousEventFields>[] = [
	...fieldsDef,
	{key: "apiImportId", label: "API Import ID", type: "other"},
];

export const fieldsDefView: FormInputDef<HazardousEventViewModel>[] = [
	{key: "hipHazard", label: "", type: "other"},
	...fieldsDefCommon,
	{key: "createdAt", label: "", type: "other"},
	{key: "updatedAt", label: "", type: "other"},
];

interface HazardousEventFormProps extends UserFormProps<HazardousEventFields> {
	divisionGeoJSON?: any;
	ctryIso3?: any;
	hip: Hip;
	parent?: HazardousEventViewModel;
	treeData?: any[];
}

export function hazardousEventLabel(args: {
	id?: string;
	description?: string;
	hazard?: {nameEn: string};
}): string {
	let parts: string[] = []
	if (args.hazard) {
		parts.push(args.hazard.nameEn.slice(0, 50))
	}
	if (args.description) {
		parts.push(args.description.slice(0, 50))
	}
	if (args.id) {
		parts.push(args.id.slice(0, 5))
	}
	return parts.join(" ")
}

export function hazardousEventLongLabel(args: {
	id?: string;
	description?: string;
	hazard: {nameEn: string};
}) {
	return <ul>
		<li>ID: {args.id}</li>
		<li>Description: {args.description || "-"}</li>
		<li>Hazard: {args.hazard.nameEn}</li>
	</ul>
}
export function hazardousEventLink(args: {
	id: string;
	description: string;
	hazard?: {nameEn: string};
}) {
	return <Link to={`/hazardous-event/${args.id}`}>
		{hazardousEventLabel(args)}
	</Link>
}

export function HazardousEventForm(props: HazardousEventFormProps) {
	const fields = props.fields;
	const treeData = props.treeData;
	const ctryIso3 = props.ctryIso3;
	const divisionGeoJSON = props.divisionGeoJSON;
	//console.log('divisionGeoJSON: ', divisionGeoJSON);

	const [selected, setSelected] = useState(props.parent);

	useEffect(() => {
		const handleMessage = (event: any) => {
			if (event.data?.selected) {
				setSelected(event.data.selected);
			}
		};
		window.addEventListener('message', handleMessage);
		return () => {
			window.removeEventListener('message', handleMessage);
		};
	}, []);

	return (
		<FormView
			user={props.user}
			path={route}
			edit={props.edit}
			id={props.id}
			plural="hazardous events"
			singular="hazardous event"
			errors={props.errors}
			fields={props.fields}
			fieldsDef={fieldsDef}
			elementsAfter={{
			}}
			override={{
				parent:
					<Field key="parent" label="Parent">
						{selected ? hazardousEventLink(selected) : "-"}&nbsp;
						<Link target="_blank" rel="opener" to={"/hazardous-event/picker"}>Change</Link>
						<button onClick={(e:any) => {
							e.preventDefault()
							setSelected(undefined)
						}}>Unset</button>
						<input type="hidden" name="parent" value={selected?.id || ""} />
						<FieldErrors errors={props.errors} field="parent"></FieldErrors>
					</Field>
				,
				hipTypeId: null,
				hipClusterId: null,
				hipHazardId: (
					<Field key="hazardId" label="Hazard classification *">
						<HazardPicker hip={props.hip} typeId={fields.hipTypeId} clusterId={fields.hipClusterId} hazardId={fields.hipHazardId} required={true} />
						<FieldErrors errors={props.errors} field="hipHazardId"></FieldErrors>
					</Field>
				),
				spatialFootprint: (
					<Field key="spatialFootprint" label="">
							<SpatialFootprintFormView
								divisions={divisionGeoJSON}
								ctryIso3={ctryIso3 || ""}
								treeData={treeData ?? []}
								initialData={fields?.spatialFootprint}
							/>
					</Field>
				),
				attachments: (
					<Field key="attachments" label="">
						<AttachmentsFormView
							save_path_temp="/uploads/temp"
							file_viewer_temp_url="/hazardous-event/file-temp-viewer"
							file_viewer_url="/hazardous-event/file-viewer"
							api_upload_url="/hazardous-event/file-pre-upload"
							initialData={fields?.attachments}
						/>
					</Field>
				)
			}}
		/>
	);
}

interface HazardousEventViewProps {
	item: HazardousEventViewModel;
	isPublic: boolean;
	auditLogs?: any[];
}

export function HazardousEventView(props: HazardousEventViewProps) {
	const item = props.item;
	const auditLogs = props.auditLogs;

	return (
		<ViewComponent
			isPublic={props.isPublic}
			path={route}
			id={item.id}
			plural="Hazardous events"
			singular="Hazardous event"
			extraActions={
				<>
					<p>
						<Link to={`${route}/new?parent=${item.id}`}>Add Hazardous Event caused by this event</Link>
					</p>
				</>
			}
			extraInfo={
				<>
					{item.event.ps.length > 0 && (() => {
						const parent = item.event.ps[0].p.he;
						return (
							<p>
								Caused By:&nbsp;
								{hazardousEventLink(parent)}
							</p>
						);
					})()}

					{item.event.cs.length > 0 && (
						<>
							<p>Causing:</p>
							{item.event.cs.map((child) => {
								const childEvent = child.c.he;
								return (
									<p key={child.childId}>
										{hazardousEventLink(childEvent)}
									</p>
								);
							})}
						</>
					)}
				</>
			}
		>
			<FieldsView
				def={fieldsDefView}
				fields={item}
				elementsAfter={{
				}}
				override={{
					hipHazard: (
						<HipHazardInfo key="hazard" model={item} />
					),
					createdAt: (
						<p key="createdAt">Created at: {formatDate(item.createdAt)}</p>
					),
					updatedAt: (
						<p key="updatedAt">Updated at: {formatDate(item.updatedAt)}</p>
					),
					spatialFootprint: (
						<SpatialFootprintView
							initialData={item?.spatialFootprint || []}
							mapViewerOption={0}
							mapViewerDataSources={[]}
						/>
					),
					attachments: (
						<AttachmentsView
							id={item.id}
							initialData={item?.attachments || []}
							file_viewer_url="/hazardous-event/file-viewer"
						/>
					),
				}}
			/>
			{/* Add Audit Log History at the end */}
			<br />
			{auditLogs && auditLogs.length > 0 && (
				<>
					<h3>Audit Log History</h3>
					<AuditLogHistory auditLogs={auditLogs} />
				</>
			)}
		</ViewComponent>
	);
}
