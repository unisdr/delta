import {
	Link
} from "@remix-run/react";


import {
	Form,
	Field,
	SubmitButton,
	FieldErrors,
	Errors
} from "~/frontend/form";
import {DivitionInsert} from "~/drizzle/schema";

import {divisionBreadcrumb, DivisionBreadcrumbRow, divisionsAllLanguages} from "~/backend.server/models/division";


interface DivisionFormProps {
	edit: boolean;
	fields: DivitionInsert;
	errors: any
	breadcrumbs: DivisionBreadcrumbRow[] | null
}

/*
export function dataFieldsFromMap(data: { [key: string]: string }): DataFields {
	const fields: (keyof DataFields)[] = [
		"field1",
		"field2",
	];
	 return Object.fromEntries(
		fields.map(field => [field, data[field] || ""])
	) as unknown as DataFields;
}
*/


export function DivisionForm({edit, fields, errors, breadcrumbs}: DivisionFormProps) {
	return (
		<>
			<h2>{edit ? "Edit Division" : "Create Division"}</h2>
			<Breadcrumb rows={breadcrumbs} linkLast={true} />
			<Form errors={errors}>
				<Field label="Parent ID">
					<input
						type="text"
						name="parentId"
						defaultValue={fields.parentId ? String(fields.parentId) : ""}
					/>
					<FieldErrors errors={errors} field="parentId" />
				</Field>

				{fields.name &&
					Object.keys(fields.name).map((lang) => (
						<Field key={lang} label={`Name (${lang})`}>
							<input
								type="text"
								name={`names[${lang}]`}
								defaultValue={fields.name?.[lang] || ""}
							/>
							<FieldErrors errors={errors} field={`names.${lang}`} />
						</Field>
					))}


				<SubmitButton className="mg-button mg-button-primary" label={edit ? "Update Division" : "Create Division"} />
			</Form>

			<Link to={"/settings/geography?parent=" + fields.parentId}>Back to List</Link>
		</>
	);
}


type BreadcrumbProps = {
	rows: DivisionBreadcrumbRow[] | null;
	linkLast?: boolean
};

export function Breadcrumb({rows, linkLast}: BreadcrumbProps) {
	if (!rows) {
		return null;
	}
	return (
		<nav aria-label="breadcrumb">
			<ol>
				<li key="root">
					<Link to={`/settings/geography`}>Root</Link>
				</li>
				{rows.map((row, index) => (
					<li key={row.id}>
						{index < rows.length - 1 || linkLast ? (
							<Link to={`/settings/geography?parent=${row.id}`}>{row.name}</Link>
						) : (
							<span>{row.name}</span>
						)}
					</li>
				))}
			</ol>
		</nav>
	);
}



