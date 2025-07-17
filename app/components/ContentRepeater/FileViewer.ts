import fs from "fs";
import path from "path";
import ContentRepeaterFileValidator from "./FileValidator";
import type { TenantContext } from "~/util/tenant";

export async function handleFileRequest(
  request: Request,
  upload_path: string,
  download?: boolean,
  tenantContext?: TenantContext
): Promise<Response> {
  const url = new URL(request.url);
  const fileName = url.searchParams.get("name");

  if (!fileName) {
    return new Response("File name is required", { status: 400 });
  }

  // Apply tenant isolation if tenant context is provided
  let tenantBasedUploadPath = upload_path;
  if (tenantContext?.countryAccountId) {
    // Check if the path already includes tenant info
    if (!upload_path.includes(`/tenant-${tenantContext.countryAccountId}/`)) {
      tenantBasedUploadPath = `/tenant-${tenantContext.countryAccountId}${upload_path}`;
    }
  }

  // Normalize and resolve the file path relative to the `upload_path`
  const baseDirectory = path.resolve(`./public${tenantBasedUploadPath}`);
  const normalizedFilePath = path.normalize(fileName).replace(/^(\.\.(\/|\\|$))+/, ""); // Prevent path traversal
  const filePath = path.resolve(baseDirectory, normalizedFilePath);

  // If file doesn't exist in tenant path but tenant context is provided, try the legacy path
  if (tenantContext?.countryAccountId && !fs.existsSync(filePath)) {
    const legacyBaseDirectory = path.resolve(`./public${upload_path}`);
    const legacyFilePath = path.resolve(legacyBaseDirectory, normalizedFilePath);

    // If file exists in legacy path, use that instead
    if (fs.existsSync(legacyFilePath) && fs.statSync(legacyFilePath).isFile()) {
      // Use the legacy file path but still perform security checks
      if (!legacyFilePath.startsWith(legacyBaseDirectory)) {
        return new Response("Access denied", { status: 403 });
      }

      const fileExtension = path.extname(fileName).substring(1).toLowerCase();
      if (!ContentRepeaterFileValidator.allowedExtensions.includes(fileExtension)) {
        return new Response("Invalid file type", { status: 400 });
      }

      const fileContent = fs.readFileSync(legacyFilePath);

      // Use the mimeType from the defined mimeTypes object
      const mimeTypes: { [key: string]: string } = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp",
        bmp: "image/bmp",
        svg: "image/svg+xml",
        tiff: "image/tiff",
        ico: "image/x-icon",
        pdf: "application/pdf",
        doc: "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        txt: "text/plain",
        md: "text/markdown",
        odt: "application/vnd.oasis.opendocument.text",
        rtf: "application/rtf",
        xls: "application/vnd.ms-excel",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ods: "application/vnd.oasis.opendocument.spreadsheet",
        csv: "text/csv",
        ppt: "application/vnd.ms-powerpoint",
        pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        odp: "application/vnd.oasis.opendocument.presentation",
        zip: "application/zip",
        rar: "application/x-rar-compressed",
        tar: "application/x-tar",
        gz: "application/gzip",
        "7z": "application/x-7z-compressed"
      };

      const contentType = mimeTypes[fileExtension] || "application/octet-stream";

      const headers = new Headers();
      headers.set("Content-Type", contentType);

      if (download) {
        headers.set("Content-Disposition", `attachment; filename="${fileName}"`);
      } else {
        headers.set("Content-Disposition", `inline; filename="${fileName}"`);
      }

      return new Response(fileContent, { status: 200, headers });
    }
  }

  // Ensure the file is within the allowed directory
  if (!filePath.startsWith(baseDirectory)) {
    return new Response("Access denied", { status: 403 });
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return new Response("File not found", { status: 404 });
  }

  const fileExtension = path.extname(fileName).substring(1).toLowerCase();
  if (!ContentRepeaterFileValidator.allowedExtensions.includes(fileExtension)) {
    return new Response("Invalid file type", { status: 400 });
  }

  const mimeTypes: { [key: string]: string } = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    bmp: "image/bmp",
    svg: "image/svg+xml",
    tiff: "image/tiff",
    ico: "image/x-icon",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    txt: "text/plain",
    md: "text/markdown",
    odt: "application/vnd.oasis.opendocument.text",
    rtf: "application/rtf",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ods: "application/vnd.oasis.opendocument.spreadsheet",
    csv: "text/csv",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    odp: "application/vnd.oasis.opendocument.presentation",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    m4a: "audio/mp4",
    aac: "audio/aac",
    flac: "audio/flac",
    mp4: "video/mp4",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
    mov: "video/quicktime",
    wmv: "video/x-ms-wmv",
    webm: "video/webm",
    flv: "video/x-flv",
    zip: "application/zip",
    rar: "application/x-rar-compressed",
    "7z": "application/x-7z-compressed",
    tar: "application/x-tar",
    gz: "application/gzip",
    tgz: "application/gzip",
  };

  const contentType = mimeTypes[fileExtension] || "application/octet-stream";

  try {
    const fileBuffer = fs.readFileSync(filePath);

    // Determine the content disposition
    const dispositionType = download ? "attachment" : "inline";
    const contentDisposition = `${dispositionType}; filename="${path.basename(fileName)}"`;

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error serving file:", error);
    return new Response("Internal server error", { status: 500 });
  }
}