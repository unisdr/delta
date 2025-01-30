import { handleFileRequest } from "~/components/ContentRepeater/FileViewer";

export const loader = async ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "true"; // Parse `download` as a boolean
  return await handleFileRequest(request, "/uploads/resource-repo", download);
};