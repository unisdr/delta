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

export const route = "/hazard-event"

export const fieldsDefCommon = [
	{key: "otherId1", label: "Event id in other system", type: "text"},
	{key: "startDate", label: "Start Date", type: "date"},
	{key: "endDate", label: "End Date", type: "date"},
	{key: "description", label: "Description", type: "text"},
	{key: "chainsExplanation", label: "Composite Event - Chains Explanation", type: "text"},
	{key: "duration", label: "Duration", type: "text"},
	{key: "magnitude", label: "Magnitude", type: "text"},
	{key: "spatialFootprint", label: "Spatial Footprint", type: "text"},
	{key: "recordOriginator", label: "Record Originator", type: "text"},
	{key: "dataSource", label: "Data Source", type: "text"},
] as const;

export const fieldsDef: FormInputDef<HazardEventFields>[] = [
	{key: "parent", label: "", type: "other"},
	{key: "hazardId", label: "", type: "other"},
	...fieldsDefCommon
];

export const fieldsDefView: FormInputDef<HazardEventViewModel>[] = [
	{key: "hazard", label: "", type: "other"},
	...fieldsDefCommon
];

interface HazardEventFormProps extends UserFormProps<HazardEventFields> {
	hip: Hip;
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


export function HazardEventForm(props: HazardEventFormProps) {
	const fields = props.fields;

	return (
		<FormView
			path={route}
			edit={props.edit}
			id={props.id}
			plural="Hazardous Events"
			singular={`${props.edit ? "Edit" : "Add"} Hazardous Event`}
			errors={props.errors}
			fields={props.fields}
			fieldsDef={fieldsDef}
			infoNodes={
				fields.parent && <p>Parent: {fields.parent}</p>
			}
			override={{
				parent: <input type="hidden" name="parent" value={fields.parent} />,
				hazardId: (
					<Field key="hazardId" label="Specific Hazard">
						<HazardPicker name="hazardId" hip={props.hip} defaultValue={fields.hazardId || ""} />
						<FieldErrors errors={props.errors} field="hazardId"></FieldErrors>
					</Field>
				),
			}}
		/>
	);
}


interface HazardEventViewProps {
	item: HazardEventViewModel;
}

export function HazardEventView(props: HazardEventViewProps) {
	const item = props.item;
	let cluster = item.hazard.cluster;
	let cls = cluster.class;

	return (
		<ViewComponent
			path={route}
			id={item.id}
			plural="Hazardous Events"
			singular="Hazard Event"
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
								<Link to={`/hazard-event/${parent.id}`}>
									{hazardEventLabel(parent)}
								</Link>
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
										<Link to={`/hazard-event/${childEvent.id}`}>
											{hazardEventLabel(childEvent)}
										</Link>
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
				}}
			/>
		</ViewComponent>
	);
}


