import { handleFileRequest } from "~/components/ContentRepeater/FileViewer";
import { authLoaderPublicOrWithPerm } from "~/util/auth";
import { DISASTER_RECORDS_UPLOAD_PATH } from "~/utils/paths";

const ALLOWED_LOCS = new Set(["disruptions", "losses", "damages", "record"]);

export const loader = authLoaderPublicOrWithPerm("ViewData", async ({ request }: any) => {
  const url = new URL(request.url);
  const loc = url.searchParams.get("loc");
  const download = url.searchParams.get("download") === "true";

  if (!loc || !ALLOWED_LOCS.has(loc)) {
    return new Response("Invalid loc parameter", { status: 400 });
  }
  
  if (loc === "record") {
    return await handleFileRequest(request, DISASTER_RECORDS_UPLOAD_PATH, download);
  }
  
  return await handleFileRequest(request, `${DISASTER_RECORDS_UPLOAD_PATH}/${loc}`, download);
});