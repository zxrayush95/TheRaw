import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/r2";
import { checkAuth } from "@/lib/tokens";
import { backupFile } from "@/lib/backups";
import { Readable } from "stream";

export async function POST(req: NextRequest) {
  if (!await checkAuth(req, "write")) {
    return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const contentTypeHeader = req.headers.get("content-type") || "";
    let key = "";
    let mimeType = "application/octet-stream";
    let streamBody: any = null;
    let size: number | undefined = undefined;

    if (contentTypeHeader.includes("multipart/form-data")) {
      // 1. Multipart Form Upload (used by Web Dashboard)
      const formData = await req.formData();
      const file = formData.get("file") as File;
      const path = formData.get("path") as string || "";

      if (!file) {
        return NextResponse.json({ success: false, error: "No file provided", code: "MISSING_FILE" }, { status: 400 });
      }

      const filename = file.name;
      key = path ? `${path.replace(/\/$/, "")}/${filename}` : filename;
      mimeType = file.type || "application/octet-stream";
      size = file.size;

      // Stream file without loading into memory buffer
      streamBody = Readable.fromWeb(file.stream() as any);
    } else {
      // 2. Direct Binary Stream Upload (useful for curl/CLI/MCP tools)
      const filename = req.headers.get("x-filename") || "upload.bin";
      const path = req.headers.get("x-path") || "";
      key = path ? `${path.replace(/\/$/, "")}/${filename}` : filename;
      mimeType = contentTypeHeader || "application/octet-stream";

      const contentLengthStr = req.headers.get("content-length");
      if (contentLengthStr) {
        size = parseInt(contentLengthStr, 10);
      }

      if (!req.body) {
        return NextResponse.json({ success: false, error: "Empty request body", code: "EMPTY_BODY" }, { status: 400 });
      }

      streamBody = Readable.fromWeb(req.body as any);
    }

    key = key.replace(/^\//, "");

    // Block writing to system folder
    if (key.startsWith(".system/")) {
      return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    // Back up the existing file if this operation overwrites it
    await backupFile(key, "overwritten");

    // Upload streamed content directly to R2
    await uploadFile(key, streamBody, mimeType, size);

    return NextResponse.json({ success: true, key });
  } catch (error: any) {
    console.error("Error uploading file stream:", error);
    return NextResponse.json({ success: false, error: error.message, code: "UPLOAD_FAILED" }, { status: 500 });
  }
}
