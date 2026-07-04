import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/r2";
import { checkAuth } from "@/lib/tokens";

export async function POST(req: NextRequest) {
  if (!await checkAuth(req, "write")) {
    return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const { key, content } = await req.json();

    if (!key || content === undefined) {
      return NextResponse.json({ success: false, error: "Missing key or content", code: "MISSING_PARAM" }, { status: 400 });
    }

    const cleanKey = key.replace(/^\//, "");
    
    // Set appropriate text mime types for writing text files
    const ext = cleanKey.split(".").pop()?.toLowerCase() || "";
    let contentType = "text/plain; charset=utf-8";
    if (ext === "json") contentType = "application/json; charset=utf-8";
    else if (ext === "html") contentType = "text/html; charset=utf-8";
    else if (ext === "md") contentType = "text/markdown; charset=utf-8";
    else if (ext === "css") contentType = "text/css; charset=utf-8";
    else if (ext === "js") contentType = "application/javascript; charset=utf-8";

    const buffer = Buffer.from(content);
    await uploadFile(cleanKey, buffer, contentType, buffer.length);

    return NextResponse.json({ success: true, key: cleanKey });
  } catch (error: any) {
    console.error("Error writing file:", error);
    return NextResponse.json({ success: false, error: error.message, code: "WRITE_FAILED" }, { status: 500 });
  }
}
