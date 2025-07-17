import ContentRepeaterPreUploadFile from "~/components/ContentRepeater/PreUploadFile";
import { authLoaderPublicOrWithPerm, authLoaderWithPerm, authLoaderGetAuth } from "~/util/auth";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { getTenantContext } from "~/util/tenant";

// export const loader = ContentRepeaterPreUploadFile.loader;
// export const action = ContentRepeaterPreUploadFile.action;

export const loader = ContentRepeaterPreUploadFile.loader
  ? authLoaderPublicOrWithPerm("ViewData", ContentRepeaterPreUploadFile.loader)
  : undefined as never; // Ensures it's always defined

// Wrap the action with authentication and tenant context extraction
export const action = authLoaderWithPerm("ViewData", async (args: LoaderFunctionArgs) => {
  // Extract tenant context from user session
  const userSession = authLoaderGetAuth(args);
  if (!userSession) {
    console.error("No user session available in disaster-event+/file-pre-upload action");
    throw new Response("Unauthorized", { status: 401 });
  }

  const tenantContext = await getTenantContext(userSession);

  console.log("disaster-event+/file-pre-upload action called with user session:", !!userSession);
  console.log("Extracted tenant context:", tenantContext);

  // Pass tenant context to the ContentRepeaterPreUploadFile action
  return ContentRepeaterPreUploadFile.action ?
    ContentRepeaterPreUploadFile.action({ ...args, request: args.request, tenantContext }) :
    null;
});