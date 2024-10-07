import { Form } from "@remix-run/react";
import { Data, Errors } from "./model"

interface DataFormProps {
  edit: boolean;
  data?: Data; 
	errors?: Errors;
}

export function DataForm({ edit, data, errors}: DataFormProps) {
  return (
    <Form method="POST">
      <label>
        Field 1:
        <input type="text" name="field1" defaultValue={data?.field1} />
        {errors?.field1 ? <span>{errors.field1}</span> : null}
      </label>
      <label>
        Field 2:
        <input type="text" name="field2" defaultValue={data?.field2 || ""} />
        {errors?.field2 ? <span>{errors.field2}</span> : null}
      </label>
      <button type="submit">{edit ? "Update" : "Create"}</button>
    </Form>
  );
}
