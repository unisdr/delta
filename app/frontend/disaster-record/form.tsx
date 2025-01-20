import {
	Link
} from "@remix-run/react";

import {DisasterRecordsFields, DisasterRecordsViewModel} from "~/backend.server/models/disaster_record"

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

import {MainContainer} from "~/frontend/container";

export const route = "/disaster-record"

export const fieldsDefCommon = [
	approvalStatusField,
	{key: "disasterEventId", label: "Disaster Event", type: "text", required: true},
] as const;

export const fieldsDef: FormInputDef<DisasterRecordsFields>[] = [
	...fieldsDefCommon
];

export const fieldsDefView: FormInputDef<DisasterRecordsViewModel>[] = [
	...fieldsDefCommon,
	{key: "createdAt", label: "", type: "other"},
	{key: "updatedAt", label: "", type: "other"},
];

interface DisasterRecordsFormProps extends UserFormProps<DisasterRecordsFields> {
	parent?: DisasterRecordsViewModel;
}

export function disasterRecordsLabel(args: {
	id?: string;
	disasterEventId?: string;
}): string {
	const disasterEventId = args.disasterEventId;
	const shortId = args.id ? " " + args.id.slice(0, 8) : "";
	return disasterEventId + " " + shortId;
}

export function disasterRecordsLongLabel(args: {
	id?: string;
	disasterEventId?: string;
}) {
	return <ul>
		<li>ID: {args.id}</li>
		<li>Disaster Event: {args.disasterEventId || "-"}</li>
	</ul>
}
export function disasterRecordsLink(args: {
	id: string;
	disasterEventId: string;
}) {
	return <Link to={`/disaster-record/${args.id}`}>
		{disasterRecordsLabel(args)}
	</Link>
}

export function DisasterRecordsForm(props: DisasterRecordsFormProps) {
	const fields = props.fields;

	useEffect(() => {
	}, []);

	return (<>
		<FormView
			path={route}
			edit={props.edit}
			id={props.id}
			plural="Disaster Records"
			singular={`${props.edit ? "Edit" : "Add"} Disaster Record`}
			errors={props.errors}
			fields={props.fields}
			fieldsDef={fieldsDef}
		/>
		{props.edit &&
			<>
				<p>&nbsp;</p>
				<section>
					<div className="mg-container">
						<div>
							<h3 className="dts-heading-3">Human Direct Effects</h3>
						</div>
						<div>
							<h3 className="dts-heading-3">Sectors</h3>
						</div>
						<div>
							<h3 className="dts-heading-3">Non-economic Losses</h3>
							<Link to={`${route}/non-economic-losses/${props.id}`} replace>Add</Link>
							<table className="dts-table">
								<thead>
									<tr>
										<th>A</th>
									</tr>
								</thead>
								<tbody>
									<tr>
										<td>a</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
				</section>
			</>
		}
	</>);
}

interface DisasterRecordsViewProps {
	item: DisasterRecordsViewModel;
	isPublic: boolean
}

export function DisasterRecordsView(props: DisasterRecordsViewProps) {
	const item = props.item;

	return (
		<ViewComponent
			isPublic={props.isPublic}
			path={route}
			id={item.id}
			plural="Disaster Records"
			singular="Disaster Record"
			extraActions={
				<Link to={"/disaster-record-wip/edit/"+item.id +"/human-effects"}>Human Direct Effects</Link>
			}
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


