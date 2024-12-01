import {
	Link
} from "@remix-run/react";

import {DisasterEventFields, DisasterEventViewModel} from "~/backend.server/models/event"

import {
	Form,
	SubmitButton,
	UserFormProps,
	FormInputDef,
	Inputs,
	FieldsView
} from "~/components/form";


export const fieldsDefCommon = [
	{ key: "nationalDisasterId", label: "National Disaster ID", type: "text" },
  { key: "otherId1", label: "Event ID in other system", type: "text" },
  { key: "glide", label: "GLIDE Number", type: "text" },
  { key: "nameGlobalOrRegional", label: "Global/Regional Name", type: "text" },
  { key: "nameNational", label: "National Name", type: "text" },
  { key: "startDateUTC", label: "Start Date (UTC)", type: "date" },
  { key: "endDateUTC", label: "End Date (UTC)", type: "date" },
  { key: "startDateLocal", label: "Start Date (Local)", type: "date" },
  { key: "endDateLocal", label: "End Date (Local)", type: "date" },
  { key: "durationDays", label: "Duration (Days)", type: "number" },
  { key: "affectedGeographicDivisions", label: "Affected Geographic Divisions", type: "text" },
  { key: "affectedAdministrativeRegions", label: "Affected Administrative Regions", type: "text" },
  { key: "disasterDeclaration", label: "Disaster Declaration", type: "bool" },
  { key: "disasterDeclarationType", label: "Disaster Declaration Type", type: "bool" },
  { key: "disasterDeclarationEffect", label: "Disaster Declaration Effect", type: "bool" },
  { key: "disasterDeclarationDate", label: "Disaster Declaration Date", type: "date" },
  { key: "warningIssuedLevelsSeverity", label: "Warning Levels Severity", type: "text" },
  { key: "warningIssuedDate", label: "Warning Issued Date", type: "date" },
  { key: "preliminaryAssessmentDate", label: "Preliminary Assessment Date", type: "date" },
  { key: "responseOperations", label: "Response Operations", type: "text" },
  { key: "postDisasterAssementDate", label: "Post-Disaster Assessment Date", type: "date" },
  { key: "reAssementDate", label: "Re-Assessment Date", type: "date" },
  { key: "dataSource", label: "Data Source", type: "text" },
  { key: "originatorRecorderOfInformation", label: "Originator/Recorder", type: "text" },
  { key: "effectsTotalLocalCurrency", label: "Effects Total (Local Currency)", type: "number" },
  { key: "effectsTotalUsd", label: "Effects Total (USD)", type: "number" },
  { key: "subtotaldamageUsd", label: "Subtotal Damage (USD)", type: "number" },
  { key: "subtotalLossesUsd", label: "Subtotal Losses (USD)", type: "number" },
  { key: "responseCostTotalUsd", label: "Response Cost (Total)", type: "number" },
  { key: "humanitarianNeedsTotalUsd", label: "Humanitarian Needs (Total, USD)", type: "number" },
  { key: "recoveryNeedsTotalUsd", label: "Recovery Needs (Total, USD)", type: "number" },
] as const;

export const fieldsDef: FormInputDef<DisasterEventFields>[] = [
	//{key: "parent", label: "", type: "other"},
	//{key: "hazardId", label: "", type: "other"},
	...fieldsDefCommon
];

export const fieldsDefView: FormInputDef<DisasterEventViewModel>[] = [
	//{key: "hazard", label: "", type: "other"},
	...fieldsDefCommon
];

interface DisasterEventFormProps extends UserFormProps<DisasterEventFields> {
	//hip: Hip;
}

export function DisasterEventForm({edit, fields, errors, id}: DisasterEventFormProps) {
	return (<>
		<p><Link to="/disaster-event">Events</Link></p>
		{edit &&
			(<p><Link to={"/disaster-event/" + id}>View</Link></p>)}

		<h2>{edit ? "Edit" : "Add"} Disaster Event</h2>
		<Form errors={errors}>
			{edit && <p>ID: {id}</p>}
			<Inputs def={fieldsDef} fields={fields} errors={errors} override={{
			}} />

			<SubmitButton label={edit ? "Update Event" : "Create Event"} />
		</Form>
	</>)
}

interface DisasterEventViewProps {
	item: DisasterEventViewModel;
}

export function DisasterEventView(props: DisasterEventViewProps) {
	const {item} = props;

//	let cluster = item.hazard.cluster;
//	let cls = cluster.class;

	return (<>
		<p><Link to="/disaster-event">Events</Link></p>
		<p><Link to={"/disaster-event/edit/" + item.id}>Edit</Link></p>
		<p><Link to={"/disaster-event/delete/" + item.id}>Delete</Link></p>
		<h2>Disaster Event</h2>
		<p>ID: {item.id}</p>

		<FieldsView def={fieldsDefView} fields={item} override={{
		}} />
	</>)

}
