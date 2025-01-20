import {
	Link
} from "@remix-run/react";

import {ResourceRepoFields, ResourceRepoViewModel} from "~/backend.server/models/resource_repo"

import {formatDate} from "~/util/date";

import {
	Field,
	FieldErrors,
	UserFormProps,
	FormInputDef,
	FieldsView,
	FormView,
	ViewComponent
} from "~/frontend/form";

import {useEffect, useState} from 'react';
import {approvalStatusField} from "~/frontend/approval";

import { ContentRepeater } from "~/components/ContentRepeater";

export const route = "/resource-repo"

export const fieldsDefCommon = [
	approvalStatusField,
	{key: "title", label: "Title", type: "text", required: true},
	{key: "summary", label: "Summary", type: "textarea", required: true},
	{key: "attachments", label: "Attachments", type: "other"},
] as const;

export const fieldsDef: FormInputDef<ResourceRepoFields>[] = [
	...fieldsDefCommon
];

export const fieldsDefView: FormInputDef<ResourceRepoViewModel>[] = [
	...fieldsDefCommon,
	{key: "createdAt", label: "", type: "other"},
	{key: "updatedAt", label: "", type: "other"},
];

interface ResourceRepoFormProps extends UserFormProps<ResourceRepoFields> {
	parent?: ResourceRepoViewModel;
}

export function resourceRepoLabel(args: {
	id?: string;
	title?: string;
	summary?: string;
}): string {
	const title = args.title ? " " + args.title.slice(0, 50) : "";
	const summary = args.summary ? " " + args.summary.slice(0, 50) : "";
	const shortId = args.id ? " " + args.id.slice(0, 8) : "";
	return title + " " + summary + " " + shortId;
}

export function resourceRepoLongLabel(args: {
	id?: string;
	title?: string;
}) {
	return <ul>
		<li>ID: {args.id}</li>
		<li>Title: {args.title || "-"}</li>
	</ul>
}
export function resourceRepoLink(args: {
	id: string;
	title: string;
}) {
	return <Link to={`/resource-repo/${args.id}`}>
		{resourceRepoLabel(args)}
	</Link>
}

export function ResourceRepoForm(props: ResourceRepoFormProps) {
	const fields = props.fields;

	useEffect(() => {
	}, []);

	return (<>
		<FormView
			path={route}
			edit={props.edit}
			id={props.id}
			plural="PDNA resource repositories"
			singular={`${props.edit ? "Edit" : "Add"} PDNA resource repository`}
			errors={props.errors}
			fields={props.fields}
			fieldsDef={fieldsDef}
			override={{
				attachments: (
					<Field key="attachments" label="Attachments">
						<ContentRepeater
						id="attachments"
						dnd_order={true}
						save_path_temp="/uploads/temp"
						file_viewer_temp_url="/resource-repo/file-temp-viewer"
						file_viewer_url="/resource-repo/file-viewer"
						table_columns={[
							{ type: "dialog_field", dialog_field_id: "title", caption: "Title" },
							{ type: "dialog_field", dialog_field_id: "type", caption: "Type" },
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
							{
							id: "type",
							caption: "Type",
							type: "select",
							options: ["Document", "Media", "Other"],
							onChange: (e) => {
								const value = e.target.value;
								const otherField = document.getElementById("attachments_other"); // Assuming ID is "attachments_other"

								if (otherField) {
								const parentDiv = otherField.closest(".dts-form-component"); // Closest parent with the specific class
								if (value === "Other") {
									parentDiv?.style.setProperty("display", "block");
								} else {
									parentDiv?.style.setProperty("display", "none");
								}
								}
							},
							},
							{ id: "other", caption: "Other", type: "input", placeholder: "Enter value", show: false },
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
							{ id: "file", caption: "File Upload", type: "file", accept: "jpg|jpeg|gif|png|webp", note: "Image file only", download: false  }, 
							{ id: "url", caption: "Link", type: "input", placeholder: "Enter URL" },
							/*{ id: "comment", caption: "Comment", type: "textarea", placeholder: "" },*/
						]}
						data={(() => {
							try {
							return JSON.parse(fields.attachments) || [];
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
				)
			}}
		/>
	</>);
}

interface ResourceRepoViewProps {
	item: ResourceRepoViewModel;
	isPublic: boolean
}

export function ResourceRepoView(props: ResourceRepoViewProps) {
	const item = props.item;

	return (
		<ViewComponent
			isPublic={props.isPublic}
			path={route}
			id={item.id}
			plural="PDNA resource repositories"
			singular="PDNA resource repository"
		>
			<FieldsView
				def={fieldsDefView}
				fields={item}
				override={{
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
							<p>Attachments:</p>
							<table style={{ border: '1px solid #F2F2F2', borderCollapse: 'collapse', width: '100%', marginBottom: '2rem' }}>
								<thead>
									<tr>
										<th style={{ border: '1px solid #F2F2F2', padding: '5px' }}>Title</th>
										<th style={{ border: '1px solid #F2F2F2', padding: '5px' }}>Type</th>
										<th style={{ border: '1px solid #F2F2F2', padding: '5px' }}>File/URL</th>
									</tr>
								</thead>
								<tbody>
									{(() => {
										const dataAttachments = JSON.parse(item.attachments); // Parse the attachments JSON string
										return dataAttachments.map((attachment) => (
											<tr key={attachment.id}>
												<td style={{ border: '1px solid #F2F2F2', padding: '5px' }}>{attachment.title}</td>
												<td style={{ border: '1px solid #F2F2F2', padding: '5px' }}>{attachment.type}</td>
												<td style={{ border: '1px solid #F2F2F2', padding: '5px' }}>
													{attachment.file_option === 'File' ? (
														<span>{attachment.file?.name.split('/').pop()}</span>
													) : (
														<a href={attachment.url} target="_blank" rel="noopener noreferrer">{attachment.url}</a>
													)}
												</td>
											</tr>
										));
									})()}
								</tbody>
							</table>
						</>
					)
				}}				
			/>
		</ViewComponent>
	);
}


