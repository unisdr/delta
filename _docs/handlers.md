- [Code structure](code-structure.md)

### Request Handlers
`app/backend.server/handlers`

Handlers contain logic shared between multiple Remix routes. If a routes had repeating code, that logic was moved here.

Read about remix [routes](routes.md) first.

## Main handler files

## Form, CSV, API code
- form.ts, csv_export.ts, csv_import.ts

These handle form submissions, API requests, and CSV imports/exports. They do basic validation and call DB functions from models. See related tests.

- formSave - Used to create or update records from an HTML form.

Mainly used by createAction, which creates a Remix action function with EditData permission checks and DB integation.

The hazardous form doesn't use createAction, because it splits new and edit into separate files.

API related code
- jsonCreate
- jsonUpdate
- jsonUpsert

CSV related code
- csvCreate
- csvUpdate
- csvImportExample - Creates an sample CSV as a stating point for updates.

Self generated field list for API
- jsonPayloadExample - Generates field examples for docs
- jsonApiDocs - Returns API documentation



