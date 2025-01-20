import { loader } from "@remix-run/node";
import { handleFileRequest } from "~/components/ContentRepeaterFileViewer";

export const loader = async ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "true"; // Parse `download` as a boolean
  return await handleFileRequest(request, "/uploads/temp", download);
};