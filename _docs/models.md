- [Code organization](code-organization.md)

# Models
`app/backend.server/models`

This folder contains a collection of database models or a database access layer. Most files map to a table in the database. These files provide functions for reading and writing data.

You can check dev_example1.ts for a common structure.

fieldsDef defines the mapping of the fields between form and the database table. It defines types and database related information, as well as some UI configuration for the form itself.

These definition can be a function in models folder, in that case it can query the database to get acceptable values for enums. If the database access is not needed, this can go in the frontend folder instead.

See more info in [form csv api](form-csv-api)

The pattern used to support database operation for common form based data is to provide the following functions:

- validate(fields)
- create(tx, fields)
- update(tx, id, fields)
- byId(id)
- deleteById(id)
- idByImportId(tx, importId) - This is used to allow CSV and API updated based on import id field.

In addition, queries related to those tables normally go the same file.

## Other code that does not match to the pattern above

## user.ts
User management and auth related code. This one also includes some email text when resetting/changing passwords, would be better to move that out to another file.

## human_effects.ts
We store human direct effect data across different tables, but following the same structure and editing functionality. This file covers all db related code. Tests cover most of it functionality.

## common.ts
selectTranslated
Divisions are stored with multiple names in jsonb as {"en":"a","it":"b"} structure. selectTransacted selects the available ones based on the passed language priority, which is helpful when not all translations are there.

delete...
basic functions for deleting 1 record

handleTransaction to have different logic for thrown error and {ok:false} result

constraintErrors
Has some helper function to check for constraint errors in postgres and converting that to the more readable error code.



