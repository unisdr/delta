- [Code structure](code-structure.md)

# Models
`app/backend.server/models`

This forlder is the database access layer. Most files map directly to ta database table and provide function to read and write data.

Use `dev_example1.ts` as a template.

## Common pattern

Each model typically contains the following parts:

- `fieldsDef` - Maps form fields to DB columns. Includes type info and UI configuration, such as labels.

This can be a function if it needs to query the DB (for example for enum options), in that case it would be better to keep it in models folder. Otherwise if no database access needed, could be in the frontend.

More info in [Form/CSV/API](form-csv-api.md)

The pattern used to support database operation for common form based data is to provide the following functions:

- validate(fields)
- create(tx, fields)
- update(tx, id, fields)
- byId(id)
- deleteById(id)
- idByImportId(tx, importId) - This is used to allow CSV and API updates based on import id field.

Other queries related to the table usually go in the same file.


## Other model files

## user.ts
User management and auth related code. Includes email content for invites, password resets and similar, could be moved to a separate file.

## human_effects.ts
Hnadles DB logic for human direct effects stored across multiple tables with shared structure. Test cover most functionality.

## common.ts
selectTranslated
Divisions are stored with multiple names in jsonb as {"en":"a","it":"b"} structure. selectTransacted selects the available ones based on the passed language priority, which is helpful when not all translations are there.

delete...
basic functions for deleting 1 record

handleTransaction to have different logic for thrown error and {ok:false} result

constraintErrors
Has some helper function to check for constraint errors in postgres and converting that to the more readable error code.



