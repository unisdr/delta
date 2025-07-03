/**
 * Disaster Event CSV Import Example API
 * 
 * This endpoint provides a static example CSV template for disaster event imports.
 * 
 * NOTE: This endpoint only serves static example data and does not interact with the database,
 * so tenant isolation is not required. No authentication or tenant context is needed.
 */

import { createExampleLoader } from "~/backend.server/handlers/form/csv_import";

import {
	fieldsDefApi,
} from "~/frontend/events/disastereventform";

export const loader = createExampleLoader({
	fieldsDef: fieldsDefApi
})
