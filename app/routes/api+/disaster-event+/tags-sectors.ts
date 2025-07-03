/**
 * Disaster Event Tags and Sectors API
 * 
 * This endpoint provides access to sector data used for tagging disaster events.
 * 
 * IMPORTANT: This is a multitenant-safe endpoint as sectors are shared across all tenants.
 * The sector table does not include tenant isolation (no countryAccountsId column)
 * because sector definitions are standardized across the system and not tenant-specific.
 */

import {
    getSectorsByLevel
} from "~/backend.server/models/sector";
  
import {
    authLoaderApiDocs,
} from "~/util/auth";
  
  
export let loader = authLoaderApiDocs(async () => {
    let records = await getSectorsByLevel(2);

    return new Response(JSON.stringify(records), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
});