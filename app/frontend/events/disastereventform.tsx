import {
	Link
} from "@remix-run/react";

import {useEffect, useState} from 'react';

import {DisasterEventFields, DisasterEventViewModel, HazardEventBasicInfoViewModel} from "~/backend.server/models/event"

import {hazardEventLink} from "~/frontend/events/hazardeventform"

import { ContentRepeater } from "~/components/ContentRepeater";

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
	{key: "attachments", label: "Attachments", type: "other"},
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
				attachments: props.edit ? (
					<Field key="attachments" label="Attachments">
						<ContentRepeater
						id="attachments"
						dnd_order={true}
						save_path_temp="/uploads/temp"
						file_viewer_temp_url="/resource-repo/file-temp-viewer"
						file_viewer_url="/resource-repo/file-viewer"
						api_upload_url="/resource-repo/file-pre-upload"
						table_columns={[
							{ type: "dialog_field", dialog_field_id: "title", caption: "Title" },
							{ 
								type: "custom", caption: "Tags",
								render: (item) => {
									try {
										const tags = JSON.parse(item.tag); // Parse the JSON string
										if (Array.isArray(tags) && tags.length > 0) {
											// Map the names and join them with commas
											return tags.map(tag => tag.name).join(", ");
										}
										return "N/A"; // If no tags exist
									} catch (error) {
										console.error("Failed to parse tags:", error);
										return "N/A"; // Return "N/A" if parsing fails
									}
								} 
							},
							{
							type: "custom",
							caption: "File/URL",
							render: (item) => {
								// Get the file name or fallback to URL
								const fullFileName = item.file?.name ? item.file.name.split('/').pop() : item.url;
							
								// Truncate long file names while preserving the file extension
								const maxLength = 30; // Adjust to fit your design
								let truncatedFileName = fullFileName;
							
								if (fullFileName && fullFileName.length > maxLength) {
								const extension = fullFileName.includes('.')
									? fullFileName.substring(fullFileName.lastIndexOf('.'))
									: '';
								const baseName = fullFileName.substring(0, maxLength - extension.length - 3); // Reserve space for "..."
								truncatedFileName = `${baseName}...${extension}`;
								}
							
								return truncatedFileName || "N/A"; // Return the truncated name or fallback to "N/A"
							},
							},                        
							{ type: "action", caption: "Action" },
						]}
						dialog_fields={[
							{ id: "title", caption: "Title", type: "input" },
							{ id: "tag", caption: "Tags", type: "tokenfield", dataSource: [{ id: 1, name: "React" }, { id: 2, name: "Vue" }, { id: 3, name: "Angular" }, { id: 4, name: "Svelte" }, { id: 5, name: "SolidJS" } , { id: 6, name: "Remix" }] },
							{
							id: "file_option",
							caption: "Option",
							type: "option",
							options: ["File", "Link"],
							onChange: (e) => {
								const value = e.target.value;
								const fileField = document.getElementById("attachments_file");
								const urlField = document.getElementById("attachments_url");

								if (fileField && urlField) {
								const fileDiv = fileField.closest(".dts-form-component");
								const urlDiv = urlField.closest(".dts-form-component");

								if (value === "File") {
									fileDiv?.style.setProperty("display", "block");
									urlDiv?.style.setProperty("display", "none");
								} else if (value === "Link") {
									fileDiv?.style.setProperty("display", "none");
									urlDiv?.style.setProperty("display", "block");
								}
								}
							},
							},
							{ id: "file", caption: "File Upload", type: "file"  }, 
							{ id: "url", caption: "Link", type: "input", placeholder: "Enter URL" },
						]}
						data={(() => {
							try {
							return JSON.parse(props.fields.attachments) || [];
							} catch {
							return []; // Default to an empty array if parsing fails
							}
						})()}
						onChange={(items) => {
							try {
							const parsedItems = Array.isArray(items) ? items : JSON.parse(items);
							console.log("Updated Items:", parsedItems);
							// Save or process `parsedItems` here, e.g., updating state or making an API call
							} catch {
							console.error("Failed to process items.");
							}
						}}
						/>
					</Field>
				) : (
					<Field key="attachments" label=""></Field>
				)
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
					<p key="hazardEventId">Hazardous Event: {hazardEventLink(item.hazardEvent)}</p>
				),
				createdAt: (
					<p key="createdAt">Created at: {formatDate(item.createdAt)}</p>
				),
				updatedAt: (
					<p key="updatedAt">Updated at: {formatDate(item.updatedAt)}</p>
				),

			}}
			otherRenderView={{
				attachments: (
				  <>
					{item.attachments && item.attachments !== "[]" ? (
					<table style={{ border: '1px solid gray', width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
					<thead>
						<tr style={{ backgroundColor: '#f2f2f2' }}>
							<th style={{ border: '1px solid gray', padding: '8px', textAlign: 'left', fontWeight: 'normal' }}>Title</th>
							<th style={{ border: '1px solid gray', padding: '8px', textAlign: 'left', fontWeight: 'normal' }}>Tags</th>
							<th style={{ border: '1px solid gray', padding: '8px', textAlign: 'left', fontWeight: 'normal' }}>File/URL</th>
						</tr>
					</thead>
					  <tbody>
						{JSON.parse(item.attachments).map((attachment) => {
						  const tags = attachment.tag
							? JSON.parse(attachment.tag).map((tag) => tag.name).join(", ")
							: "N/A";
						  const fileOrUrl =
							attachment.file_option === "File" && attachment.file
							  ? (
								<a href={`/resource-repo/file-viewer/?name=${item.id}/${attachment.file.name.split("/").pop()}`} target="_blank" rel="noopener noreferrer">
								  {attachment.file.name.split("/").pop()}
								</a>
							  )
							  : attachment.file_option === "Link"
							  ? <a href={attachment.url} target="_blank" rel="noopener noreferrer">{attachment.url}</a>
							  : "N/A";
			  
						  return (
							<tr key={attachment.id} style={{ borderBottom: '1px solid gray' }}>
								<td style={{ border: '1px solid gray', padding: '8px' }}>{attachment.title || "N/A"}</td>
								<td style={{ border: '1px solid gray', padding: '8px' }}>{tags}</td>
								<td style={{ border: '1px solid gray', padding: '8px' }}>{fileOrUrl}</td>
							</tr>
						  );
						})}
					  </tbody>
					</table>
					) : (<></>)}
				  </>
				),
			  }}			  
			/>
		</ViewComponent>
	);
}




