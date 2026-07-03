import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/r2";
import { checkAuth } from "@/lib/tokens";

export async function POST(req: NextRequest) {
  if (!await checkAuth(req, "write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    let path = formData.get("path") as string || "";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const filename = file.name;
    let key = path ? `${path.replace(/\/$/, "")}/${filename}` : filename;
    key = key.replace(/^\//, "");

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const contentType = file.type || "application/octet-stream";

    await uploadFile(key, buffer, contentType);

    return NextResponse.json({ success: true, key });
  } catch (error: any) {
    console.error("Error uploading file:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
