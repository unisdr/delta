# Adding a new type linked to a form

## Database table
`app/drizzle/schema.ts`
Define database schema. Start by copying an example from dev_example1, replacing dev_example1 with your own table name and defining the fields.

## Database access layer
`app/backend.server/models/dev_example1.ts`
Start by copying an example. This includes the form field definitions. Also contains all database queries and record validation.

## Form definition
`app/frontend/dev_example1.tsx`
Copy this file as well. This includes the form definition, view definition.

## Routes
`app/routes/examples+/dev_example1+`
Copy the folder containing the routes form the example.

- edit.$id.tsx - Create and update form (/edit/new for creating a new record).
- $id.tsx - View record.
- \_index.tsx - List records.
- delete.$id.tsx - Delete a record.

CSV handling related files
- csv-import.tsx 
- csv-export.tsx

## API
`app/routes/api+/dev-example+1`

- \_index.tsx - Documentation for the API

Adding/modifying records
- add.ts
- update.ts
- upsert-ts

Getting the records
- list.ts

CSV
- csv-import-example.ts - Returns a csv file that can be used as an example to import data

