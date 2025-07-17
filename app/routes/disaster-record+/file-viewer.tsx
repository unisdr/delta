import { handleFileRequest } from "~/components/ContentRepeater/FileViewer";
import { authLoaderPublicOrWithPerm, authLoaderGetAuth } from "~/util/auth";
import { getTenantContext } from "~/util/tenant";

const ALLOWED_LOCS = new Set(["disruptions", "losses", "damages", "record"]);

export const loader = authLoaderPublicOrWithPerm("ViewData", async (loaderArgs: any) => {
  const { request } = loaderArgs;
  const url = new URL(request.url);
  const loc = url.searchParams.get("loc");
  const download = url.searchParams.get("download") === "true";

  // Extract tenant context from session if available
  const userSession = authLoaderGetAuth(loaderArgs);
  const tenantContext = userSession ? await getTenantContext(userSession) : undefined;

  if (!loc || !ALLOWED_LOCS.has(loc)) {
    return new Response("Invalid loc parameter", { status: 400 });
  }

  if (loc === "record") {
    return await handleFileRequest(request, "/uploads/disaster-record", download, tenantContext);
  }

  return await handleFileRequest(request, `/uploads/disaster-record/${loc}`, download);
});