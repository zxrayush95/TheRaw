import { getFile, uploadFile, deleteFile, headFile } from "./r2";
import { Readable } from "stream";

export interface BackupRecord {
  id: string;
  originalKey: string;
  backupKey: string;
  size: number;
  contentType: string;
  actionType: "deleted" | "overwritten";
  timestamp: string; // ISO format
}

const HISTORY_FILE = ".system/backup_history.json";

// Retrieve backup records
export async function getBackupHistory(): Promise<BackupRecord[]> {
  try {
    const res = await getFile(HISTORY_FILE);
    const text = await res.Body?.transformToString() || "[]";
    return JSON.parse(text);
  } catch (err: any) {
    if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
      return [];
    }
    console.error("Error reading backup history:", err);
    return [];
  }
}

// Persist backup records
export async function saveBackupHistory(history: BackupRecord[]): Promise<void> {
  const buffer = Buffer.from(JSON.stringify(history, null, 2));
  await uploadFile(HISTORY_FILE, buffer, "application/json", buffer.length);
}

// Perform a file backup before deleting or overwriting it
export async function backupFile(key: string, actionType: "deleted" | "overwritten"): Promise<boolean> {
  try {
    // 1. Get file metadata and body stream
    const response = await getFile(key);
    if (!response.Body) return false;

    const id = crypto.randomUUID();
    const backupKey = `.system/backups/${id}`;
    const size = response.ContentLength || 0;
    const contentType = response.ContentType || "application/octet-stream";

    // 2. Stream backup binary to R2
    const bodyStream = Readable.fromWeb(response.Body.transformToWebStream() as any);
    await uploadFile(backupKey, bodyStream, contentType, size);

    // 3. Save backup history record
    const record: BackupRecord = {
      id,
      originalKey: key,
      backupKey,
      size,
      contentType,
      actionType,
      timestamp: new Date().toISOString(),
    };

    const history = await getBackupHistory();
    history.push(record);
    await saveBackupHistory(history);

    return true;
  } catch (err: any) {
    // If the file doesn't exist, we don't need to back it up
    if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
      return false;
    }
    console.error(`Failed to back up file ${key}:`, err);
    return false;
  }
}

// Restore a file from Recycle Bin to its original path
export async function restoreFile(id: string): Promise<boolean> {
  try {
    const history = await getBackupHistory();
    const record = history.find((r) => r.id === id);
    if (!record) return false;

    // Get the backup binary stream
    const response = await getFile(record.backupKey);
    if (!response.Body) return false;

    const bodyStream = Readable.fromWeb(response.Body.transformToWebStream() as any);
    
    // Upload it back to the original key
    await uploadFile(record.originalKey, bodyStream, record.contentType, record.size);

    // Clean up backup file and record
    await deleteFile(record.backupKey);
    const updatedHistory = history.filter((r) => r.id !== id);
    await saveBackupHistory(updatedHistory);

    return true;
  } catch (err) {
    console.error(`Failed to restore backup ${id}:`, err);
    return false;
  }
}

// Permanently delete a backup file
export async function deleteBackupPermanently(id: string): Promise<boolean> {
  try {
    const history = await getBackupHistory();
    const record = history.find((r) => r.id === id);
    if (!record) return false;

    // Delete backup binary
    await deleteFile(record.backupKey);

    // Remove record from history
    const updatedHistory = history.filter((r) => r.id !== id);
    await saveBackupHistory(updatedHistory);

    return true;
  } catch (err) {
    console.error(`Failed to delete backup permanently ${id}:`, err);
    return false;
  }
}

// Clean up backup entries older than 24 hours
export async function cleanupExpiredBackups(): Promise<void> {
  try {
    const history = await getBackupHistory();
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    const expired = history.filter((r) => now - new Date(r.timestamp).getTime() > oneDayMs);
    if (expired.length === 0) return;

    // Delete expired binaries from R2
    for (const record of expired) {
      try {
        await deleteFile(record.backupKey);
      } catch (err) {
        console.error(`Failed to delete expired backup file ${record.backupKey}:`, err);
      }
    }

    // Keep active records
    const active = history.filter((r) => now - new Date(r.timestamp).getTime() <= oneDayMs);
    await saveBackupHistory(active);
  } catch (err) {
    console.error("Error cleaning up expired backups:", err);
  }
}
