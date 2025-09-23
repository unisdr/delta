import fs from "fs";
import path from "path";
import ContentRepeaterFileValidator from "./FileValidator";

interface UserSession {
  id?: string;
  countryAccountsId?: string;
  role?: string;
}

export async function handleFileRequest(
  request: Request,
  upload_path: string,
  download?: boolean,
  userSession?: UserSession
): Promise<Response> {
  const debug = true; // Set to true for debugging
  const url = new URL(request.url);
  const fileName = url.searchParams.get("name");
  const tenantPath = url.searchParams.get("tenantPath");
  const requiredTenantId = url.searchParams.get("requiredTenantId");

  if (debug) {
    console.log(`File request: ${fileName}`);
    console.log(`Tenant path: ${tenantPath}`);
    console.log(`Required tenant ID: ${requiredTenantId}`);
    console.log(`Base upload path: ${upload_path}`);
    console.log(`User session:`, userSession);
  }

  if (!fileName) {
    return new Response("File name is required", { status: 400 });
  }

  // Security check: Ensure user session is valid for tenant access
  if (!userSession?.countryAccountsId) {
    console.warn("File access attempted without valid user session");
    // Redirect to unauthorized page with specific reason
    const unauthorizedUrl = `/error/unauthorized?reason=no-tenant`;
    return new Response(null, {
      status: 302,
      headers: {
        Location: unauthorizedUrl,
      },
    });
  }

  // Normalize file path to prevent path traversal
  const normalizedFilePath = path.normalize(fileName).replace(/^(\.\.(\/|\\|$))+/, "");

  // If tenantPath is provided, validate user has access to that tenant
  if (tenantPath) {
    const tenantIdFromPath = tenantPath.match(/tenant-([\w-]+)/);
    const requestedTenantId = tenantIdFromPath ? tenantIdFromPath[1] : null;

    if (requestedTenantId && requestedTenantId !== userSession.countryAccountsId) {
      console.warn(`Security violation: User ${userSession.countryAccountsId} attempted to access tenant ${requestedTenantId}`);
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

  // If requiredTenantId is provided, validate user has access
  if (requiredTenantId && requiredTenantId !== userSession.countryAccountsId) {
    console.warn(`Security violation: User ${userSession.countryAccountsId} attempted to access required tenant ${requiredTenantId}`);
    // Redirect to unauthorized page with specific reason
    const unauthorizedUrl = `/error/unauthorized?reason=access-denied`;
    return new Response(null, {
      status: 302,
      headers: {
        Location: unauthorizedUrl,
      },
    });
  }

  // Build the user's tenant-specific base directory
  const userTenantPath = `tenant-${userSession.countryAccountsId}`;
  const userTenantDirectory = path.resolve(`./${userTenantPath}${upload_path}`);
  const userTenantFilePath = path.resolve(userTenantDirectory, normalizedFilePath);

  if (debug) {
    console.log(`User tenant directory: ${userTenantDirectory}`);
    console.log(`User tenant file path: ${userTenantFilePath}`);
  }

  // Ensure the file path is within the user's allowed directory
  if (!userTenantFilePath.startsWith(userTenantDirectory)) {
    console.warn(`Path traversal attempt: ${userTenantFilePath}`);
    const unauthorizedUrl = `/error/unauthorized?reason=access-denied`;
    return new Response(null, {
      status: 302,
      headers: {
        Location: unauthorizedUrl,
      },
    });
  }

  // First, try to find the file in the user's tenant directory
  if (fs.existsSync(userTenantFilePath) && fs.statSync(userTenantFilePath).isFile()) {
    if (debug) console.log(`Found file in user's tenant: ${userTenantFilePath}`);
    return serveFile(userTenantFilePath, fileName, download);
  }

  // If tenantPath was explicitly provided and matches user's tenant, try that path
  if (tenantPath) {
    const normalizedTenantPath = tenantPath.startsWith('/') ? tenantPath.substring(1) : tenantPath;
    const explicitTenantDirectory = path.resolve(`./${normalizedTenantPath}${upload_path}`);
    const explicitTenantFilePath = path.resolve(explicitTenantDirectory, normalizedFilePath);

    // Validate this is still the user's tenant
    if (explicitTenantFilePath.startsWith(userTenantDirectory)) {
      if (fs.existsSync(explicitTenantFilePath) && fs.statSync(explicitTenantFilePath).isFile()) {
        if (debug) console.log(`Found file at explicit tenant path: ${explicitTenantFilePath}`);
        return serveFile(explicitTenantFilePath, fileName, download);
      }
    }
  }

  // As a fallback, try the standard upload directory (for legacy files)
  // Only if no tenant-specific path was requested
  if (!tenantPath && !requiredTenantId) {
    const standardDirectory = path.resolve(`.${upload_path}`);
    const standardFilePath = path.resolve(standardDirectory, normalizedFilePath);

    if (standardFilePath.startsWith(standardDirectory)) {
      if (fs.existsSync(standardFilePath) && fs.statSync(standardFilePath).isFile()) {
        if (debug) console.log(`Found file at standard path: ${standardFilePath}`);
        return serveFile(standardFilePath, fileName, download);
      }
    }
  }

  // File not found in any allowed location
  if (debug) console.log(`File not found in any accessible location for user ${userSession.countryAccountsId}`);
  return new Response("File not found", { status: 404 });
}

/**
 * Helper function to serve a file with proper headers
 */
function serveFile(filePath: string, fileName: string, download?: boolean): Response {
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