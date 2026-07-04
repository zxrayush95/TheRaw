import { NextRequest, NextResponse } from "next/server";
import { listFiles, deleteFile, createRepository, deleteRepository } from "@/lib/r2";
import { checkAuth } from "@/lib/tokens";

export async function GET(req: NextRequest) {
  if (!await checkAuth(req, "read")) {
    return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const repo = searchParams.get("repo");
    const isGlobal = searchParams.get("global") === "true";
    const continuationToken = searchParams.get("continuationToken") || undefined;
    const limitStr = searchParams.get("limit");
    const limit = limitStr ? parseInt(limitStr, 10) : 1000;

    if (repo) {
      // List files under a specific repository prefix with pagination
      const { contents, nextContinuationToken, isTruncated } = await listFiles(`${repo}/`, continuationToken, limit);
      const files = contents.map(item => ({
        key: item.Key || "",
        size: item.Size || 0,
        lastModified: item.LastModified || new Date(),
      }));
      return NextResponse.json({ files, nextContinuationToken, isTruncated });
    } else if (isGlobal) {
      // List files globally with pagination
      const { contents, nextContinuationToken, isTruncated } = await listFiles("", continuationToken, limit);
      const files = contents.map(item => ({
        key: item.Key || "",
        size: item.Size || 0,
        lastModified: item.LastModified || new Date(),
      }));
      return NextResponse.json({ files, nextContinuationToken, isTruncated });
    } else {
      // List repositories
      const { contents, nextContinuationToken, isTruncated } = await listFiles("", continuationToken, limit);
      const repos = new Set<string>();
      contents.forEach(item => {
        const key = item.Key || "";
        const parts = key.split("/");
        if (parts.length > 1) {
          repos.add(parts[0]);
        }
      });
      return NextResponse.json({ 
        repositories: Array.from(repos).sort(),
        nextContinuationToken,
        isTruncated 
      });
    }
  } catch (error: any) {
    console.error("Error listing files or repositories:", error);
    return NextResponse.json({ success: false, error: error.message, code: "LIST_FAILED" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!await checkAuth(req, "write")) {
    return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const { name } = await req.json();
    if (!name) {
      return NextResponse.json({ success: false, error: "Repository name is required", code: "MISSING_NAME" }, { status: 400 });
    }
    const cleanName = name.replace(/[\/\s]/g, "-").toLowerCase();
    await createRepository(cleanName);
    return NextResponse.json({ success: true, repo: cleanName });
  } catch (error: any) {
    console.error("Error creating repository:", error);
    return NextResponse.json({ success: false, error: error.message, code: "CREATE_FAILED" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!await checkAuth(req, "delete")) {
    return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    const repo = searchParams.get("repo");

    if (key) {
      // Delete single file
      await deleteFile(key);
      return NextResponse.json({ success: true });
    } else if (repo) {
      // Delete whole repository
      await deleteRepository(repo);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Missing key or repo parameter", code: "MISSING_PARAM" }, { status: 400 });
  } catch (error: any) {
    console.error("Error during deletion:", error);
    return NextResponse.json({ success: false, error: error.message, code: "DELETE_FAILED" }, { status: 500 });
  }
}
