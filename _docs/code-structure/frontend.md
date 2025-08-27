- [Code structure](code-structure.md)

# Frontend
`app/frontend`
Contains UI logic shared between server and browser. No direct DB access here.

## Form, CSV, API code

### form.tsx
Shared code for form rendering and viewing.

- FormInputDef - Field definition type
- Inputs - Renders all fields based on field definitions, values and errors.
- Input - Renders a sinle form input
- FieldView -  Renders a single field value for read only display in view page.
- FormScreen... - Screen components that load data using useLoaderData and render form screen.
- ViewScreen... - View-only screen

### form_validate.tsx
Type checks data agains fieldsDef, ensures required fields are present. All other validation is in models instead.

### Dev example1
- `dev_example1.tsx` - Example of form and view using field definitions. Use as a reference when addinga new data types.

## Editable Table: Human effects
Implements an editable table where each row maps to a DB row. Edits are stored in `localStorage` until the user clicks Save.

- `view.tsx` - Table UI
- `data.ts`, `data_test.ts` - Manages data and local state

```
// Local state format
// map<id, map<field, value>
private updates: Map<string, Map<number, any>>
// set<id>
private deletes: Set<string>
// map<id, data>
private newRows: Map<string, any[]>

```
