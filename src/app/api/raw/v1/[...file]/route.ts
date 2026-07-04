import { NextRequest } from "next/server";
import { getFile, headFile } from "@/lib/r2";

const textExtensions = [
  "txt", "md", "js", "jsx", "ts", "tsx", "css", "json", "xml", "yaml", "yml", "ini", "conf",
  "py", "go", "rs", "cpp", "c", "h", "hpp", "java", "kt", "swift", "rb", "sh", "bat", "ps1", "sql", "html", "toml"
];

function getMimeType(filename: string, r2ContentType?: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  
  if (textExtensions.includes(ext)) {
    return "text/plain; charset=utf-8";
  }
  
  switch (ext) {
    case "png": return "image/png";
    case "jpg": case "jpeg": return "image/jpeg";
    case "gif": return "image/gif";
    case "svg": return "image/svg+xml";
    case "webp": return "image/webp";
    case "ico": return "image/x-icon";
    case "mp3": return "audio/mpeg";
    case "wav": return "audio/wav";
    case "ogg": return "audio/ogg";
    case "mp4": return "video/mp4";
    case "webm": return "video/webm";
    case "pdf": return "application/pdf";
    case "apk": return "application/vnd.android.package-archive";
    case "ipa": return "application/octet-stream";
    case "aab": return "application/octet-stream";
    case "zip": return "application/zip";
    case "rar": return "application/x-rar-compressed";
    case "7z": return "application/x-7z-compressed";
    case "dll": return "application/octet-stream";
    case "exe": return "application/octet-stream";
    case "so": return "application/octet-stream";
    case "pak": return "application/octet-stream";
    case "uasset": return "application/octet-stream";
    case "uexp": return "application/octet-stream";
    case "sig": return "application/octet-stream";
    case "pem": return "application/x-x509-ca-cert";
    default: return r2ContentType || "application/octet-stream";
  }
}

// Applies standard zero-cache, security, and CORS headers
function applyHeaders(headers: Headers, mimeType: string, s3Response: any) {
  headers.set("Content-Type", mimeType);
  
  if (s3Response.ContentLength !== undefined) {
    headers.set("Content-Length", s3Response.ContentLength.toString());
  }
  
  if (s3Response.ContentRange) {
    headers.set("Content-Range", s3Response.ContentRange);
  }
  
  headers.set("Accept-Ranges", "bytes");

  if (s3Response.ETag) {
    headers.set("ETag", s3Response.ETag);
  }

  if (s3Response.LastModified) {
    headers.set("Last-Modified", s3Response.LastModified.toUTCString());
  }

  // Zero caching implementation
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");

  // CORS headers
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "*");

  // Security headers
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ file: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const fileKeyPath = resolvedParams.file.join("/");
    
    // Parse Range request header
    const rangeHeader = request.headers.get("range") || undefined;
    
    const response = await getFile(fileKeyPath, rangeHeader);
    if (!response.Body) {
      return new Response(JSON.stringify({ success: false, error: "File body empty", code: "EMPTY_BODY" }), { 
        status: 404, 
        headers: { "Content-Type": "application/json" }
      });
    }

    const mimeType = getMimeType(fileKeyPath, response.ContentType);
    const headers = new Headers();
    applyHeaders(headers, mimeType, response);

    // Stream the body directly from R2 to the response without buffering in memory
    const bodyStream = response.Body.transformToWebStream();
    const statusCode = response.$metadata.httpStatusCode || (rangeHeader ? 206 : 200);

    return new Response(bodyStream, {
      status: statusCode,
      headers,
    });
  } catch (error: any) {
    if (error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404) {
      return new Response(JSON.stringify({ success: false, error: "File not found", code: "NOT_FOUND" }), { 
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    console.error("Error serving raw file GET:", error);
    return new Response(JSON.stringify({ success: false, error: "Internal Server Error", code: "INTERNAL_ERROR" }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ file: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const fileKeyPath = resolvedParams.file.join("/");
    const rangeHeader = request.headers.get("range") || undefined;

    const response = await headFile(fileKeyPath, rangeHeader);
    const mimeType = getMimeType(fileKeyPath, response.ContentType);
    const headers = new Headers();
    applyHeaders(headers, mimeType, response);

    const statusCode = response.$metadata.httpStatusCode || (rangeHeader ? 206 : 200);

    return new Response(null, {
      status: statusCode,
      headers,
    });
  } catch (error: any) {
    if (error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404) {
      return new Response(null, { status: 404 });
    }
    console.error("Error serving raw file HEAD:", error);
    return new Response(null, { status: 500 });
  }
}

export async function OPTIONS() {
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "*");
  headers.set("Access-Control-Max-Age", "86400"); // 24 hours preflight cache
  return new Response(null, {
    status: 204,
    headers,
  });
}
