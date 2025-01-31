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
  
    static async action({ request }: { request: Request }) {
      if (request.method !== "POST") {
        return new Response(
          JSON.stringify({ error: "Method not allowed" }),
          { status: 405, headers: { "Content-Type": "application/json" } }
        );
      }
  
      const uploadHandler = unstable_createMemoryUploadHandler({});
      // const uploadHandler = unstable_createMemoryUploadHandler({
      //   maxFileSize: ContentRepeaterFileValidator.maxFileSize, // Max file size in bytes
      // });
  
      try {
        const formData = await unstable_parseMultipartFormData(request, uploadHandler);
  
        // Required fields
        const savePathTemp = formData.get("save_path_temp") as string | null;
        const tempFilename = formData.get("temp_filename") as string | null;
        const originalFilename = formData.get("filename") as string | null;
        const uploadedFile = formData.get("file") as File | null;
        const tempFilenamePrev = formData.get("temp_filename_prev") as string | null; // Previous file with full path
  
        const fileViewerTempUrl = formData.get("file_viewer_temp_url") as string | null;
        const fileViewerUrl = formData.get("file_viewer_url") as string | null;
  
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
              error: `File size exceeds the limit of ${
                ContentRepeaterFileValidator.maxFileSize / (1024 * 1024)
              } MB`,
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
  
        // Prepare paths
        const tempDirectory = path.resolve(`./public${savePathTemp}`);
        const tempFilePath = path.join(tempDirectory, tempFilename);
  
        console.log("tempDirectory:", tempDirectory);
        console.log("tempFilePath:", tempFilePath);
  
        // Delete the previous temp file if it exists
        if (tempFilenamePrev) {
          const prevFilePath = path.resolve(`./public${tempFilenamePrev}`);
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
            name: `${savePathTemp}/${tempFilename}`, 
            view: (fileViewerTempUrl) ? `${fileViewerTempUrl}/?name=${tempFilename}` : `${savePathTemp}/${tempFilename}`,
            content_type: uploadedFile.type,
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