import {
	Link
} from "@remix-run/react";

import {useEffect, useState} from 'react';

import {DisasterEventFields, DisasterEventViewModel, HazardEventBasicInfoViewModel} from "~/backend.server/models/event"

import {hazardEventLink} from "~/frontend/events/hazardeventform"

import {
	UserFormProps,
	FormInputDef,
	FieldsView,
	ViewComponent,
	FormView,
	FieldErrors,
	Field
} from "~/frontend/form";
import {approvalStatusField} from "../approval";
import {formatDate} from "~/util/date";

export const route = "/disaster-event"

export const fieldsDefCommon = [
	approvalStatusField,
	{key: "nationalDisasterId", label: "National Disaster ID", type: "text"},
	{key: "otherId1", label: "Event ID in other system", type: "text"},
	{key: "glide", label: "GLIDE Number", type: "text"},
	{key: "nameGlobalOrRegional", label: "Global/Regional Name", type: "text"},
	{key: "nameNational", label: "National Name", type: "text"},
	{key: "startDateUTC", label: "Start Date (UTC)", type: "date"},
	{key: "endDateUTC", label: "End Date (UTC)", type: "date"},
	{key: "startDateLocal", label: "Start Date (Local)", type: "date"},
	{key: "endDateLocal", label: "End Date (Local)", type: "date"},
	{key: "durationDays", label: "Duration (Days)", type: "number"},
	{key: "affectedGeographicDivisions", label: "Affected Geographic Divisions", type: "text"},
	{key: "affectedAdministrativeRegions", label: "Affected Administrative Regions", type: "text"},
	{key: "disasterDeclaration", label: "Disaster Declaration", type: "bool"},
	{key: "disasterDeclarationType", label: "Disaster Declaration Type", type: "bool"},
	{key: "disasterDeclarationEffect", label: "Disaster Declaration Effect", type: "bool"},
	{key: "disasterDeclarationDate", label: "Disaster Declaration Date", type: "date"},
	{key: "warningIssuedLevelsSeverity", label: "Warning Levels Severity", type: "text"},
	{key: "warningIssuedDate", label: "Warning Issued Date", type: "date"},
	{key: "preliminaryAssessmentDate", label: "Preliminary Assessment Date", type: "date"},
	{key: "responseOperations", label: "Response Operations", type: "text"},
	{key: "postDisasterAssementDate", label: "Post-Disaster Assessment Date", type: "date"},
	{key: "reAssessmentDate", label: "Re-Assessment Date", type: "date"},
	{key: "dataSource", label: "Data Source", type: "text"},
	{key: "originatorRecorderOfInformation", label: "Originator/Recorder", type: "text"},
	{key: "effectsTotalLocalCurrency", label: "Effects Total (Local Currency)", type: "number"},
	{key: "effectsTotalUsd", label: "Effects Total (USD)", type: "number"},
	{key: "subtotaldamageUsd", label: "Subtotal Damage (USD)", type: "number"},
	{key: "subtotalLossesUsd", label: "Subtotal Losses (USD)", type: "number"},
	{key: "responseCostTotalUsd", label: "Response Cost (Total)", type: "number"},
	{key: "humanitarianNeedsTotalUsd", label: "Humanitarian Needs (Total, USD)", type: "number"},
	{key: "recoveryNeedsTotalUsd", label: "Recovery Needs (Total, USD)", type: "number"},
] as const;

export const fieldsDef: FormInputDef<DisasterEventFields>[] = [
	{key: "hazardEventId", label: "", type: "other"},
	...fieldsDefCommon
];

export const fieldsDefApi: FormInputDef<DisasterEventFields>[] = [
	...fieldsDef,
	{key: "apiImportId", label: "", type: "other"},
];

export const fieldsDefView: FormInputDef<DisasterEventViewModel>[] = [
	...fieldsDef,
	{key: "createdAt", label: "", type: "other"},
	{key: "updatedAt", label: "", type: "other"},
];

interface DisasterEventFormProps extends UserFormProps<DisasterEventFields> {
	hazardEvent?: HazardEventBasicInfoViewModel
}

export function DisasterEventForm(props: DisasterEventFormProps) {
	const [selectedHazardEvent, setSelectedHazardEvent] = useState(props.hazardEvent);

	useEffect(() => {
		const handleMessage = (event: any) => {
			if (event.data?.selected) {
				setSelectedHazardEvent(event.data.selected);
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
			plural="disaster events"
			singular="disaster event"
			errors={props.errors}
			fields={props.fields}
			fieldsDef={fieldsDef}
			override={{
				hazardEventId:
					<Field key="hazardEventId" label="Hazard Event">
						{selectedHazardEvent ? hazardEventLink(selectedHazardEvent) : "-"}&nbsp;
						<Link target="_blank" rel="opener" to={"/hazard-event/picker"}>Change</Link>
						<input type="hidden" name="hazardEventId" value={selectedHazardEvent?.id || ""} />
						<FieldErrors errors={props.errors} field="hazardEventId"></FieldErrors>
					</Field>
				,
			}} />
	)
}

interface DisasterEventViewProps {
	item: DisasterEventViewModel;
	isPublic: boolean;
}

export function DisasterEventView(props: DisasterEventViewProps) {
	const {item} = props;

	return (
		<ViewComponent
			isPublic={props.isPublic}
			path={route}
			id={item.id}
			plural="Disaster events"
			singular="Disaster event"
		>
			<FieldsView def={fieldsDefView} fields={item} override={{
				hazardEventId: (
					<p>Hazardous Event: {hazardEventLink(item.hazardEvent)}</p>
				),
				createdAt: (
					<p key="createdAt">Created at: {formatDate(item.createdAt)}</p>
				),
				updatedAt: (
					<p key="updatedAt">Updated at: {formatDate(item.updatedAt)}</p>
				),

			}} />
		</ViewComponent>
	);
}




