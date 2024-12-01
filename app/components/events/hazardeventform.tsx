import {
	Link
} from "@remix-run/react";

import {HazardEventFields, HazardEventViewModel} from "~/backend.server/models/event"

import {
	Form,
	Field,
	SubmitButton,
	FieldErrors,
	UserFormProps,
	FormInputDef,
	Inputs,
	FieldsView
} from "~/components/form";

import {HazardPicker, Hip} from "~/components/hip/hazardpicker"

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

export function HazardEventForm({edit, fields, errors, hip, id}: HazardEventFormProps) {
	return (<>
		<p><Link to="/hazard-event">Events</Link></p>
		{edit &&
			(<p><Link to={"/hazard-event/" + id}>View</Link></p>)}

		<h2>{edit ? "Edit" : "Add"} Hazardous Event</h2>
		<Form errors={errors}>
			{edit && <p>ID: {id}</p>}
			{fields.parent &&
				<p>Parent: {fields.parent}</p>
			}
			<Inputs def={fieldsDef} fields={fields} errors={errors} override={{
				parent: (
					<input type="hidden" name="parent" value={fields.parent} />
				),
				hazardId: (
					<Field key="hazardId" label="Specific Hazard">
						<HazardPicker name="hazardId" hip={hip} defaultValue={fields.hazardId || ""} />
						<FieldErrors errors={errors} field="hazardId"></FieldErrors>
					</Field>
				)
			}} />

			<SubmitButton label={edit ? "Update Event" : "Create Event"} />
		</Form>
	</>)
}

interface HazardEventViewProps {
	item: HazardEventViewModel;
}

export function HazardEventView(props: HazardEventViewProps) {
	const {item} = props;

	let cluster = item.hazard.cluster;
	let cls = cluster.class;

	return (<>
		<p><Link to="/hazard-event">Events</Link></p>
		<p><Link to={"/hazard-event/edit/" + item.id}>Edit</Link></p>
		<p><Link to={"/hazard-event/delete/" + item.id}>Delete</Link></p>
		<p><Link to={"/hazard-event/new?parent=" + item.id}>Add Child Event</Link></p>
		<h2>Hazardous Event</h2>
		<p>ID: {item.id}</p>

		{item.event.parents.length > 0 ? (<p>
			Caused By: <Link to={"/hazard-event/" + item.event.parents[0].parentId}>{item.event.parents[0].parentId.slice(0, 5)}</Link></p>) : null}

		{item.event.children.length > 0 ? (
			<>
				Causing:
				{item.event.children.map((event) => (
					<p key={event.childId}><Link to={"/hazard-event/" + event.childId}>
						{event.childId.slice(0, 5)}
					</Link>
					</p>
				))}
			</>
		) : null}

		<FieldsView def={fieldsDefView} fields={item} override={{
			hazard: (
				<div key="hazard">
					<p>Class: {cls.nameEn}</p>
					<p>Cluster: {cluster.nameEn}</p>
					<p>Hazard ID: {item.hazard.id}</p>
					<p>Hazard Name: {item.hazard.nameEn}</p>
				</div>
			)
		}} />

	</>)

}
