import { NextRequest, NextResponse } from "next/server";
import { getFile } from "@/lib/r2";

// Helper to convert Web ReadableStream to Node Buffer
async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: any[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// Extensions we want to force render as raw text (instead of running them or forcing download)
const textExtensions = [
  "txt", "md", "js", "jsx", "ts", "tsx", "css", "json", "xml", "yaml", "yml", "ini", "conf",
  "py", "go", "rs", "cpp", "c", "h", "hpp", "java", "kt", "swift", "rb", "sh", "bat", "ps1", "sql", "html"
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
    default: return r2ContentType || "application/octet-stream";
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ file: string[] }> }
) {
  try {
    const resolvedParams = await params;
    
    // Join the catch-all array back into the R2 file key
    const fileKeyPath = resolvedParams.file.join("/");
    
    const response = await getFile(fileKeyPath);
    if (!response.Body) {
      return new Response("File body empty", { status: 404 });
    }

    // Convert S3 Body (which can be a Stream) to a transferrable byte array or buffer
    let bodyData: any;
    if (typeof response.Body.transformToByteArray === "function") {
      bodyData = await response.Body.transformToByteArray();
    } else {
      bodyData = await streamToBuffer(response.Body);
    }

    const mimeType = getMimeType(fileKeyPath, response.ContentType);

    const headers = new Headers();
    headers.set("Content-Type", mimeType);
    headers.set("Content-Length", (response.ContentLength || bodyData.length).toString());
    
    // Set CORS headers so third-party sites can fetch raw code if they want to
    headers.set("Access-Control-Allow-Origin", "*");
    
    // Standard caching rules for raw resources
    headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=30");

    return new Response(bodyData, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error("Error serving raw file:", error);
    if (error.name === "NoSuchKey") {
      return new Response("File not found", { status: 404 });
    }
    return new Response("Internal Server Error", { status: 500 });
  }
}
