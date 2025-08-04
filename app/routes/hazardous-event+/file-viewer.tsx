import { handleFileRequest } from "~/components/ContentRepeater/FileViewer";
import { authLoaderPublicOrWithPerm } from "~/util/auth";

export const loader = authLoaderPublicOrWithPerm("ViewData", async ({ request }: any) => {
  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "true"; // Parse `download` as a boolean
  return await handleFileRequest(request, "/uploads/hazardous-event", download);
});