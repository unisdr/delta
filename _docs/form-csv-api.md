# Form-CSV-API Pattern
- [creating a new type](creating-a-new-type-linked-to-a-form.md)

## Overview

This app is form-heavy. To make adding new form/data types easier, and also expose them as API and CSV, we have added an abstraction which is based on `fieldDefs`.

These definitions include type, allow values, description and UI related settings, for form layout and number of columns.

Adding a new type requires adding multiple files, but adding or chaning a field is simple, only need to update the Drizzle schema and the field definition. The change would appear in the form, view, CSV and API. It also keeps the approach consistent for different types.

This approach is flexible enough for customization of edit forms, views and lists as needed.

There is no a built in library for Remix that does all this, though similar tools exist for other Typescript frameworks.

Use dev_example1 as a template to get started.

Related docs (Form,CSV,API sections)
- [Handlers](handlers.md)
- [Frontend](frontend.md)

## Adding a new type

### Database table
`app/drizzle/schema.ts`
Copy an example for dev_example1, rename, define your fields.

### Database access layer
`app/backend.server/models/dev_example1.ts`
Copy and rename. This includes:
- `fieldDefs` for the form
- DB queries
- Record validation

### Form definition
`app/frontend/dev_example1.tsx`
Copy and rename. This includes:
- Form rendering logic
- View layout

### Routes
`app/routes/examples+/dev_example1+`
Copy the full forlder. It includes:

- edit.$id.tsx - Create and update form (/edit/new for creating a new record)
- $id.tsx - View record
- \_index.tsx - List records
- delete.$id.tsx - Delete a record

CSV handling related files
- csv-import.tsx 
- csv-export.tsx

### API
`app/routes/api+/dev-example+1`

- \_index.tsx - Documentation for the API
- add.ts,update.ts,upsert.ts - Write operations
- list.ts - Fetch records
- csv-import-example.ts - Example CSV for imports

