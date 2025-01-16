# Folder structure

### Database access

`app/backend.server/models`

Contains database queries, including CRUD and validation. Each new object type requires functions for all operations.

### Remix routes

`app/routes`

#### UI Routes

Handles both full URLs and URL segments. Segments are for building nested layouts.

#### API Routes

`app/routes/api+`
Defined external API endpoints, and non json api (files, images).

### Request handlers

`app/backend.server/handlers`
Utility functions for building Remix actions and loaders.

### Frontend

`app/frontend`
Contains code that runs on both the server and browser. Mostly UI related. No direct database access.

- form.tsx - Shared form components.
- dev_example1.tx - Example of how to build form and view using field definitions.

# Adding new object or form

## Database table

`app/drizzle/schema.ts`
Define database schema.

```
export const devExample1Table = pgTable("dev_example1", {
	id: serial("id").primaryKey(),
	field1: text("field1").notNull().unique(),
});

export type DevExample1 = typeof devExample1Table.$inferSelect;
export type DevExample1Insert = typeof devExample1Table.$inferInsert;
```

## Database access

`app/backend.server/models/dev_example1.ts`
Add queries.

## Form definition

`app/frontend/dev_example1/form.ts`
Add form definition, including a list of fields.

## Routes

`app/routes/dev_example1`
Create routes.

- edit.$id.tsx - Create and update form (/edit/new for creating a new record).
- $id.tsx - View record.
- \_index.tsx - List records.
- delete.$id.tsx - Delete a record.

## types

`app/types/global_example1.d.ts`
Place files in this directory where global types or declarations are stored.

## information-pages-override
End user will use this folder to place .md files which will be used to load its content by the loadMardownContent.tsx .

