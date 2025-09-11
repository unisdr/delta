import { handleFileRequest } from "~/components/ContentRepeater/FileViewer";
import { authLoaderPublicOrWithPerm } from "~/util/auth";
import { TEMP_UPLOAD_PATH } from "~/utils/paths";

export const loader = authLoaderPublicOrWithPerm("ViewData", async ({ request }: any) => {
  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "true"; // Parse `download` as a boolean
  return await handleFileRequest(request, TEMP_UPLOAD_PATH, download);
});