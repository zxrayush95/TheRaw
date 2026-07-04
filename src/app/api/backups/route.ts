import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackupHistory, restoreFile, deleteBackupPermanently, cleanupExpiredBackups } from "@/lib/backups";
import { hashToken, compareTokens } from "@/lib/tokens";

// Checks if the dashboard session is authorized (cookie-only verification)
async function isAuthorizedSession() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("auth_session")?.value;
    const expectedPassword = process.env.ADMIN_PASSWORD || "admin";
    if (session && expectedPassword) {
      return compareTokens(hashToken(session), hashToken(expectedPassword));
    }
  } catch (e) {}
  return false;
}

// 1. List active backups (performs expired cleanup first)
export async function GET(req: NextRequest) {
  if (!await isAuthorizedSession()) {
    return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    // Purge any expired backups older than 24 hours
    await cleanupExpiredBackups();
    
    const history = await getBackupHistory();
    return NextResponse.json({ success: true, history });
  } catch (err: any) {
    console.error("Error listing backup history:", err);
    return NextResponse.json({ success: false, error: err.message, code: "LIST_FAILED" }, { status: 500 });
  }
}

// 2. Restore a backup
export async function POST(req: NextRequest) {
  if (!await isAuthorizedSession()) {
    return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ success: false, error: "Backup ID is required", code: "MISSING_PARAM" }, { status: 400 });
    }

    const success = await restoreFile(id);
    if (!success) {
      return NextResponse.json({ success: false, error: "Backup record not found or restore failed", code: "RESTORE_FAILED" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error restoring file:", err);
    return NextResponse.json({ success: false, error: err.message, code: "RESTORE_ERROR" }, { status: 500 });
  }
}

// 3. Permanently delete a backup
export async function DELETE(req: NextRequest) {
  if (!await isAuthorizedSession()) {
    return NextResponse.json({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Backup ID is required", code: "MISSING_PARAM" }, { status: 400 });
    }

    const success = await deleteBackupPermanently(id);
    if (!success) {
      return NextResponse.json({ success: false, error: "Backup record not found or deletion failed", code: "DELETE_FAILED" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error permanently deleting backup:", err);
    return NextResponse.json({ success: false, error: err.message, code: "DELETE_ERROR" }, { status: 500 });
  }
}
