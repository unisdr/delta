import { handleFileRequest } from "~/components/ContentRepeater/FileViewer";
import { authLoaderPublicOrWithPerm } from "~/util/auth";
import { DISASTER_RECORDS_UPLOAD_PATH } from "~/utils/paths";
import { getCountryAccountsIdFromSession } from "~/util/session";

const ALLOWED_LOCS = new Set(["disruptions", "losses", "damages", "record"]);

export const loader = authLoaderPublicOrWithPerm("ViewData", async ({ request, userSession }: any) => {
  // Enable debug logging
  const debug = true;
  const url = new URL(request.url);
  const loc = url.searchParams.get("loc");
  const download = url.searchParams.get("download") === "true";

  if (!loc || !ALLOWED_LOCS.has(loc)) {
    return new Response("Invalid loc parameter", { status: 400 });
  }

  // Get tenant ID from URL or user session
  let tenantPath = url.searchParams.get("tenantPath");
  const fileId = url.searchParams.get("name")?.split("/")?.[0]; // Extract record ID from file name
  
  // Get the country accounts ID directly from the session
  // This is a workaround for the issue where userSession.countryAccountsId is undefined
  const directCountryAccountsId = await getCountryAccountsIdFromSession(request);
  
  // Create a proper userSession object if it's missing data
  const effectiveUserSession = {
    id: userSession?.id,
    countryAccountsId: userSession?.countryAccountsId || directCountryAccountsId,
    role: userSession?.role
  };
  
  if (debug) {
    console.log("DEBUG - Disaster Record File viewer request:", {
      url: request.url,
      loc,
      tenantPath,
      fileId,
      directCountryAccountsId,
      userSession: userSession ? {
        id: userSession.id,
        countryAccountsId: userSession.countryAccountsId,
        role: userSession.role
      } : null,
      effectiveUserSession
    });
  }
  
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
  } else if (debug) {
    console.log("DEBUG - No tenant path check performed:", { 
      tenantPath, 
      userCountryAccountsId: effectiveUserSession.countryAccountsId 
    });
  }
  
  // If no tenant path in URL but we have a country accounts ID in the session, use that
  if (!tenantPath && effectiveUserSession.countryAccountsId) {
    tenantPath = `/tenant-${effectiveUserSession.countryAccountsId}`;
    
    // Add the tenant path to the URL for the file handler
    url.searchParams.set("tenantPath", tenantPath);
    
    // Always add the required tenant ID for security enforcement
    url.searchParams.set("requiredTenantId", effectiveUserSession.countryAccountsId);
    
    request = new Request(url.toString(), request);
  } else if (effectiveUserSession.countryAccountsId) {
    // If we already have a tenant path but also have a country accounts ID, add it as required tenant ID
    url.searchParams.set("requiredTenantId", effectiveUserSession.countryAccountsId);
    request = new Request(url.toString(), request);
  }
  
  // If we have a file ID, verify the user has access to the associated record
  if (fileId && effectiveUserSession.countryAccountsId) {
    try {
      // Import the model to check record ownership
      const { disasterRecordsTable } = await import("~/drizzle/schema");
      const { dr } = await import("~/db.server");
      const { eq } = await import("drizzle-orm");
      
      if (debug) {
        console.log("DEBUG - Checking disaster record ownership:", {
          fileId,
          userCountryAccountsId: effectiveUserSession.countryAccountsId
        });
      }
      
      // Check if the record belongs to the user's tenant
      const record = await dr
        .select({ id: disasterRecordsTable.id, countryAccountsId: disasterRecordsTable.countryAccountsId })
        .from(disasterRecordsTable)
        .where(eq(disasterRecordsTable.id, fileId));
      
      if (debug) {
        console.log("DEBUG - Disaster Record query result:", record);
      }
      
      // If no record found at all
      if (record.length === 0) {
        console.warn(`Disaster Record not found: ${fileId}`);
        // Continue anyway to try to serve the file
      }
      // If record found but doesn't belong to user's tenant
      else if (record[0].countryAccountsId !== effectiveUserSession.countryAccountsId) {
        console.warn(`Access denied: User from tenant ${effectiveUserSession.countryAccountsId} attempted to access file for disaster record ${fileId} belonging to tenant ${record[0].countryAccountsId}`);
        // Redirect to unauthorized page with specific reason
        const unauthorizedUrl = `/error/unauthorized?reason=access-denied`;
        return new Response(null, {
          status: 302,
          headers: {
            Location: unauthorizedUrl,
          },
        });
      } else if (debug) {
        console.log(`DEBUG - Access granted: Disaster Record ${fileId} belongs to user's tenant ${effectiveUserSession.countryAccountsId}`);
      }
    } catch (error) {
      console.error("Error verifying disaster record file access:", error);
      // Continue with the request if verification fails, but log the error
    }
  }

  // Determine the upload path based on location
  const uploadPath = loc === "record" ? DISASTER_RECORDS_UPLOAD_PATH : `${DISASTER_RECORDS_UPLOAD_PATH}/${loc}`;
  
  // Pass the modified request with tenant path to the handler, INCLUDING the userSession
  return await handleFileRequest(request, uploadPath, download, effectiveUserSession);
});