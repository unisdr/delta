import {
	Link
} from "@remix-run/react";

import {HazardEventFields, HazardEventViewModel} from "~/backend.server/models/event"

import {
	Field,
	FieldErrors,
	UserFormProps,
	FormInputDef,
	FieldsView,
	FormView,
	ViewComponent
} from "~/frontend/form";

import {HazardPicker, Hip} from "~/frontend/hip/hazardpicker"
import {formatDate} from "~/util/date";

import {useEffect, useState} from 'react';
import {approvalStatusField} from "~/frontend/approval";


export const route = "/hazard-event"

export const fieldsDefCommon = [
	approvalStatusField,
	{key: "otherId1", label: "Event id in other system", type: "text"},
	{key: "startDate", label: "Start Date", type: "date", required: true},
	{key: "endDate", label: "End Date", type: "date", required: true},
	{key: "description", label: "Description", type: "textarea"},
	{key: "chainsExplanation", label: "Composite Event - Chains Explanation", type: "text"},
	{key: "duration", label: "Duration", type: "text"},
	{key: "magnitude", label: "Magnitude", type: "text"},
	{key: "spatialFootprint", label: "Spatial Footprint", type: "text"},
	{key: "recordOriginator", label: "Record Originator", type: "text", required: true},
	{key: "dataSource", label: "Data Source", type: "text"},
] as const;

export const fieldsDef: FormInputDef<HazardEventFields>[] = [
	{key: "parent", label: "", type: "other"},
	{key: "hazardId", label: "Hazard", type: "other", required: true},
	...fieldsDefCommon
];

export const fieldsDefApi: FormInputDef<HazardEventFields>[] = [
	...fieldsDef,
	{key: "apiImportId", label: "API Import ID", type: "other"},
];

export const fieldsDefView: FormInputDef<HazardEventViewModel>[] = [
	{key: "hazard", label: "", type: "other"},
	...fieldsDefCommon,
	{key: "createdAt", label: "", type: "other"},
	{key: "updatedAt", label: "", type: "other"},
];

interface HazardEventFormProps extends UserFormProps<HazardEventFields> {
	hip: Hip;
	parent?: HazardEventViewModel;
}

export function hazardEventLabel(args: {
	id?: string;
	description?: string;
	hazard: {nameEn: string};
}): string {
	const hazardName = args.hazard.nameEn.slice(0, 50);
	const desc = args.description ? " " + args.description.slice(0, 50) : "";
	const shortId = args.id ? " " + args.id.slice(0, 5) : "";
	return hazardName + " " + desc + " " + shortId;
}

export function hazardEventLongLabel(args: {
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
export function hazardEventLink(args: {
	id: string;
	description: string;
	hazard: {nameEn: string};
}) {
	return <Link to={`/hazard-event/${args.id}`}>
		{hazardEventLabel(args)}
	</Link>
}

export function HazardEventForm(props: HazardEventFormProps) {
	const fields = props.fields;

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
			path={route}
			edit={props.edit}
			id={props.id}
			plural="hazardous events"
			singular="hazardous event"
			errors={props.errors}
			fields={props.fields}
			fieldsDef={fieldsDef}
			override={{
				parent:
					<Field key="parent" label="Parent">
						{selected ? hazardEventLink(selected) : "-"}&nbsp;
						<Link target="_blank" rel="opener" to={"/hazard-event/picker"}>Change</Link>
						<input type="hidden" name="parent" value={selected?.id || ""} />
						<FieldErrors errors={props.errors} field="parent"></FieldErrors>
					</Field>
				,
				hazardId: (
					<Field key="hazardId" label="Specific Hazard *">
						<HazardPicker name="hazardId" hip={props.hip} defaultValue={fields.hazardId || ""} required={true} />
						<FieldErrors errors={props.errors} field="hazardId"></FieldErrors>
					</Field>
				),
			}}
		/>
	);
}

interface HazardEventViewProps {
	item: HazardEventViewModel;
	isPublic: boolean
}

export function HazardEventView(props: HazardEventViewProps) {
	const item = props.item;
	let cluster = item.hazard.cluster;
	let cls = cluster.class;

	return (
		<ViewComponent
			isPublic={props.isPublic}
			path={route}
			id={item.id}
			plural="Hazardous events"
			singular="Hazard event"
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
								{hazardEventLink(parent)}
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
										{hazardEventLink(childEvent)}
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
				override={{
					hazard: (
						<div key="hazard">
							<p>Class: {cls.nameEn}</p>
							<p>Cluster: {cluster.nameEn}</p>
							<p>Hazard ID: {item.hazard.id}</p>
							<p>Hazard Name: {item.hazard.nameEn}</p>
						</div>
					),
					createdAt: (
						<p key="createdAt">Created at: {formatDate(item.createdAt)}</p>
					),
					updatedAt: (
						<p key="updatedAt">Updated at: {formatDate(item.updatedAt)}</p>
					),
				}}
			/>
		</ViewComponent>
	);
}


