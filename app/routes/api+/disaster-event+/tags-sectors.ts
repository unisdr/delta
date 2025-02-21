import {
    getSectorsByLevel
} from "~/backend.server/models/sector";
  
import {
    authLoaderApiDocs,
} from "~/util/auth";
  
  
export let loader = authLoaderApiDocs(async () => {
    let records = await getSectorsByLevel(2);

    return Response.json(
        records
    )
});