import { NextRequest, NextResponse } from "next/server";
import { listFiles, deleteFile, createRepository, deleteRepository } from "@/lib/r2";
import { checkAuth } from "@/lib/tokens";

export async function GET(req: NextRequest) {
  if (!await checkAuth(req, "read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const repo = searchParams.get("repo");
    const isGlobal = searchParams.get("global") === "true";

    if (repo) {
      // List files under a specific repository prefix
      const contents = await listFiles(`${repo}/`);
      const files = contents.map(item => ({
        key: item.Key || "",
        size: item.Size || 0,
        lastModified: item.LastModified || new Date(),
      }));
      return NextResponse.json({ files });
    } else if (isGlobal) {
      // List all files in the bucket for global view
      const contents = await listFiles();
      const files = contents.map(item => ({
        key: item.Key || "",
        size: item.Size || 0,
        lastModified: item.LastModified || new Date(),
      }));
      return NextResponse.json({ files });
    } else {
      // List all repositories by checking top-level folder names
      const contents = await listFiles();
      const repos = new Set<string>();
      contents.forEach(item => {
        const key = item.Key || "";
        const parts = key.split("/");
        if (parts.length > 1) {
          repos.add(parts[0]);
        }
      });
      return NextResponse.json({ repositories: Array.from(repos).sort() });
    }
  } catch (error: any) {
    console.error("Error listing files or repositories:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!await checkAuth(req, "write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name } = await req.json();
    if (!name) {
      return NextResponse.json({ error: "Repository name is required" }, { status: 400 });
    }
    const cleanName = name.replace(/[\/\s]/g, "-").toLowerCase();
    await createRepository(cleanName);
    return NextResponse.json({ success: true, repo: cleanName });
  } catch (error: any) {
    console.error("Error creating repository:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!await checkAuth(req, "delete")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    return NextResponse.json({ error: "Missing key or repo parameter" }, { status: 400 });
  } catch (error: any) {
    console.error("Error during deletion:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
