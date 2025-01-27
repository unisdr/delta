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

## types
`app/types/global_example1.d.ts`
Place files in this directory where global types or declarations are stored.

## information-pages-override
End user will use this folder to place .md files which will be used to load its content by the loadMardownContent.tsx .

