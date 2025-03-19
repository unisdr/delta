# Type linked to Form, CSV, API

## Overview

This application is relatively form-heavy. To reduce the code needed to add a new form/data type that would also expose the data as API and CSV for reading and writing, we added an abstraction that relies on `fieldsDefs`, which are field definitions for each field used. It includes the type, possible values, description, as well as some UI data such as the number of columns in the form and similar.

While adding a new type still requires adding multiple files, adding or changing a field is simple since it's defined in two places only: the Drizzle schema and the field definition. This can allow a consistent experience across the application for different types.

There wasn't a good option that already provided all this for Remix, while similar solutions exist for other TypeScript frameworks.

While this provides a consistent basis for data management, it is also flexible enough for customization of edit forms and similar when needed.

There is an example of this pattern named `dev_example1` that you can use as a baseline.

See Form, CSV, API code sections in the following files as well.

- [Handlers](handlers.md)
- [Frontend](frontend.md)

## Adding a new type

### Database table
`app/drizzle/schema.ts`
Define database schema. Start by copying an example from dev_example1, replacing dev_example1 with your own table name and defining the fields.

### Database access layer
`app/backend.server/models/dev_example1.ts`
Start by copying an example. This includes the form field definitions. Also contains all database queries and record validation.

### Form definition
`app/frontend/dev_example1.tsx`
Copy this file as well. This includes the form definition, view definition.

### Routes
`app/routes/examples+/dev_example1+`
Copy the folder containing the routes form the example.

- edit.$id.tsx - Create and update form (/edit/new for creating a new record).
- $id.tsx - View record.
- \_index.tsx - List records.
- delete.$id.tsx - Delete a record.

CSV handling related files
- csv-import.tsx 
- csv-export.tsx

### API
`app/routes/api+/dev-example+1`

- \_index.tsx - Documentation for the API

Adding/modifying records
- add.ts
- update.ts
- upsert.ts

Getting the records
- list.ts

CSV
- csv-import-example.ts - Returns a csv file that can be used as an example to import data

