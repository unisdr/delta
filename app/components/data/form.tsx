import {
		Link
} from "@remix-run/react";

import { DataFields } from "~/.server/models/item"

import {
	Form,
	Field,
	SubmitButton,
	FieldErrors,
	Errors
} from "~/components/form";

interface DataFormProps {
	edit: boolean;
	fields: DataFields; 
	errors?: Errors<DataFields> ;
}

export function dataFieldsFromMap(data: { [key: string]: string }): DataFields {
	const fields: (keyof DataFields)[] = [
		"field1",
		"field2",
	];
	 return Object.fromEntries(
		fields.map(field => [field, data[field] || ""])
	) as unknown as DataFields;
}

export function DataForm({ edit, fields, errors}: DataFormProps) {
	return (<>
		<h2>Edit Data</h2>
		<Form errors={errors}>
			<Field label="Field 1">
				<input type="text" name="field1" defaultValue={fields.field1 || ""} />
				<FieldErrors errors={errors} field="field1"></FieldErrors>
			</Field>
			<Field label="Field 2">
				<input type="text" name="field2" defaultValue={fields.field2 || ""} />
				<FieldErrors errors={errors} field="field2"></FieldErrors>
			</Field>
				<SubmitButton label={edit ? "Update Data" : "Create Data"} />
		</Form>
		<Link to="/data">Back to Data</Link>
	</>)
}

