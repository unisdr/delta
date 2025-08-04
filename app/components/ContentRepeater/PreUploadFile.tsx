import {
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/node";
import fs from "fs";
import path from "path";
import ContentRepeaterFileValidator from "./FileValidator";

export default class ContentRepeaterPreUploadFile {
  static async loader() {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  static async action({ request, countryAccountsId }: { request: Request; countryAccountsId?: string }) {
    console.log("PreUploadFile action called with tenant context:", countryAccountsId);
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { "Content-Type": "application/json" } }
      );
    }

    const uploadHandler = unstable_createMemoryUploadHandler({});

    try {
      const formData = await unstable_parseMultipartFormData(request, uploadHandler);

      // Required fields
      const savePathTemp = formData.get("save_path_temp") as string | null;
      const tempFilename = formData.get("temp_filename") as string | null;
      const originalFilename = formData.get("filename") as string | null;
      const uploadedFile = formData.get("file") as File | null;
      const tempFilenamePrev = formData.get("temp_filename_prev") as string | null; // Previous file with full path

      const fileViewerTempUrl = formData.get("file_viewer_temp_url") as string | null;

      // Validate required fields
      if (!savePathTemp || !tempFilename || !originalFilename || !uploadedFile) {
        return new Response(
          JSON.stringify({ error: "Missing required form data" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Validate file extension
      if (!ContentRepeaterFileValidator.isValidExtension(originalFilename)) {
        return new Response(
          JSON.stringify({
            error: `Invalid file type.`,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Validate file size
      if (!ContentRepeaterFileValidator.isValidSize(uploadedFile.size)) {
        return new Response(
          JSON.stringify({
            error: `File size exceeds the limit of ${ContentRepeaterFileValidator.maxFileSize / (1024 * 1024)
              } MB`,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Prepare paths with tenant isolation if tenant context is available
      let tenantPath = "";
      if (countryAccountsId) {
        // Use countryAccountId for tenant isolation in file paths
        tenantPath = `/tenant-${countryAccountsId}`;
        console.log("Using tenant path:", tenantPath);
      } else {
        console.log("No valid tenant context available for file paths");
      }

      const tempDirectory = path.resolve(`./public${tenantPath}${savePathTemp}`);
      const tempFilePath = path.join(tempDirectory, tempFilename);

      console.log("tempDirectory:", tempDirectory);
      console.log("tempFilePath:", tempFilePath);

      // Delete the previous temp file if it exists
      if (tempFilenamePrev) {
        // If the previous path already includes tenant path, use it as is
        // Otherwise, add tenant path if tenant context is available
        let prevPathWithTenant = tempFilenamePrev;
        if (countryAccountsId && !tempFilenamePrev.includes(`/tenant-`)) {
          const pathParts = tempFilenamePrev.split('/');
          pathParts.splice(1, 0, `tenant-${countryAccountsId}`);
          prevPathWithTenant = pathParts.join('/');
        }

        const prevFilePath = path.resolve(`./public${prevPathWithTenant}`);
        if (fs.existsSync(prevFilePath)) {
          try {
            fs.unlinkSync(prevFilePath);
            console.log(`Deleted previous temp file: ${prevFilePath}`);
          } catch (unlinkError) {
            console.warn(`Failed to delete previous temp file: ${prevFilePath}`, unlinkError);
          }
        } else {
          console.warn(`Previous temp file not found: ${prevFilePath}`);
        }
      }

      // Ensure the target directory exists
      fs.mkdirSync(tempDirectory, { recursive: true });

      // Save the new file
      const fileBuffer = Buffer.from(await uploadedFile.arrayBuffer());
      fs.writeFileSync(tempFilePath, fileBuffer);

      return new Response(
        JSON.stringify({
          name: `${tenantPath}${savePathTemp}/${tempFilename}`,
          view: (fileViewerTempUrl) ? `${fileViewerTempUrl}/?name=${tempFilename}&tenantPath=${encodeURIComponent(tenantPath)}` : `${tenantPath}${savePathTemp}/${tempFilename}`,
          content_type: uploadedFile.type,
          tenantPath: tenantPath, // Include tenant path in response for future reference
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("File upload error:", error);

      return new Response(
        JSON.stringify({
          error: "An error occurred while processing the file upload.",
          details: error instanceof Error ? error.message : "Unknown error",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
}  