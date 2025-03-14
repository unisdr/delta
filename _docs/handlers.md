- [Code organization](code-organization.md)

### Request Handlers
`app/backend.server/handlers`

Learn about remix [routes](routes.md) before checking this.

The handlers contain code that is shared between multiple routes. So the same as for routes apply, but if the code is duplicated across routes, it went into this folder instead.

The following are the largest parts.

## Form, CSV, API code
- `form.ts`
- `csv_export.ts`
- `csv_import.ts`

Handling form or API requests, doing basic validation and calling related database functions.

See tests as well.

- formSave - The function for creating new records and updating records when using a HTML form.

Main use of this is in createAction, which creates a remix action function with EditData permission and calls provided database queries when needed. But formSave is also called from hazardous form directly, since it uses a different pattern of having separate new and edit page, not a shared one as. (This could be refactored to follow the same pattern as others)

API related code
- jsonCreate
- jsonUpdate
- jsonUpsert

CSV related code
- csvCreate
- csvUpdate
- csvImportExample - Creates an sample CSV with dummy data as a stating point for updates.

Self generated field list for API
- jsonPayloadExample
- jsonApiDocs



