import { handleFileRequest } from "~/components/ContentRepeater/FileViewer";
import { authLoaderPublicOrWithPerm, authLoaderGetAuth } from "~/util/auth";
import { getTenantContext } from "~/util/tenant";

export const loader = authLoaderPublicOrWithPerm("ViewData", async (loaderArgs: any) => {
  const { request } = loaderArgs;
  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "true"; // Parse `download` as a boolean

  // Extract tenant context from session if available
  const userSession = authLoaderGetAuth(loaderArgs);
  const tenantContext = userSession ? await getTenantContext(userSession) : undefined;

  // Pass tenant context to handleFileRequest
  return await handleFileRequest(request, "/uploads/disaster-event", download, tenantContext);
});