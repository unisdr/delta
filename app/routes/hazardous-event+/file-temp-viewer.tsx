import { handleFileRequest } from "~/components/ContentRepeater/FileViewer";
import { authLoaderPublicOrWithPerm } from "~/util/auth";
import { TEMP_UPLOAD_PATH } from "~/utils/paths";
import { getCountryAccountsIdFromSession } from "~/util/session";

export const loader = authLoaderPublicOrWithPerm("ViewData", async ({ request, userSession }: any) => {
  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "true"; // Parse `download` as a boolean

  // Get tenant ID from URL or user session
  let tenantPath = url.searchParams.get("tenantPath");

  // Get the country accounts ID directly from the session
  const directCountryAccountsId = await getCountryAccountsIdFromSession(request);

  // Create a proper userSession object if it's missing data
  const effectiveUserSession = {
    id: userSession?.id,
    countryAccountsId: userSession?.countryAccountsId || directCountryAccountsId,
    role: userSession?.role
  };

  // Security check: If tenant path is specified in URL, verify it matches the user's tenant
  if (tenantPath && effectiveUserSession.countryAccountsId) {
    const urlTenantId = tenantPath.match(/tenant-([\w-]+)/);
    if (urlTenantId && urlTenantId[1] !== effectiveUserSession.countryAccountsId) {
      console.warn(`Tenant mismatch: URL tenant ${urlTenantId[1]} doesn't match user tenant ${effectiveUserSession.countryAccountsId}`);
      // Redirect to unauthorized page with specific reason
      const unauthorizedUrl = `/error/unauthorized?reason=access-denied`;
      return new Response(null, {
        status: 302,
        headers: {
          Location: unauthorizedUrl,
        },
      });
    }
  }

  // If no tenant path in URL but we have a country accounts ID in the session, use that
  if (!tenantPath && effectiveUserSession.countryAccountsId) {
    tenantPath = `/tenant-${effectiveUserSession.countryAccountsId}`;

    // Add the tenant path to the URL for the file handler
    url.searchParams.set("tenantPath", tenantPath);
    request = new Request(url.toString(), request);
  }

  // For temp files, we can't easily verify ownership by event ID, but we can enforce tenant isolation
  // by ensuring the tenant path matches the user's tenant, which we've done above

  // Pass the modified request with tenant path to the handler, INCLUDING the userSession
  return await handleFileRequest(request, TEMP_UPLOAD_PATH, download, effectiveUserSession);
});