- [Code organization](code-organization.md)

# Frontend
`app/frontend`
Contains code that runs on both the server and browser. Primarily UI-related with no direct database access.

## Form, CSV, API code

### form.tsx
Shared form components

- FormInputDef - Defines the field
- Inputs - Converts field definitions, values, errors into form elements
- Input - Same for one element
- FieldView - Converts field definitions, values into a view page. It contains information about one row in the database.
- FormScreen... - Helpers that call useLoaderData and passed form components to render the form screen
- ViewScreen... - Similar for view screens

### form_validate.tsx
Checks that passed JSON or map data matches the expected types based on field definitions. Also checks presence of required fields, but no other validation.

### Dev example1
- `dev_example1.tsx` - Example of form and view using field definitions

## Editable Table (Human effects)
Editable table with each row representing a database row. Stores edits in localStorage until save button is called. Updates are stored in localStorage based on fields and ids.

`view.tsx`
View component for the table itself.

`data.ts`
`data_test.ts`
Data manager, here are most important data fields.

```
// map<id, map<field, value>
private updates: Map<string, Map<number, any>>
// set<id>
private deletes: Set<string>
// map<id, data>
private newRows: Map<string, any[]>

```
