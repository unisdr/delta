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


export const route = "/resource-repo"

export const fieldsDefCommon = [
	approvalStatusField,
	{key: "title", label: "Title", type: "text", required: true},
	{key: "summary", label: "Summary", type: "textarea", required: true},
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

	return (
		<FormView
			path={route}
			edit={props.edit}
			id={props.id}
			plural="PDNA resource repositories"
			singular={`${props.edit ? "Edit" : "Add"} PDNA resource repository`}
			errors={props.errors}
			fields={props.fields}
			fieldsDef={fieldsDef}
		/>
	);
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
			/>
		</ViewComponent>
	);
}


