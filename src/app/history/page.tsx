"use client";

import { useState, useEffect } from "react";
import { BackupRecord } from "@/lib/backups";

export default function HistoryPage() {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/backups");
      if (res.status === 401) return;
      const data = await res.json();
      setBackups(data.history || []);
    } catch (err) {
      showToast("Failed to load Recycle Bin history", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const res = await fetch("/api/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to restore backup");
      }

      showToast("File restored successfully to original path", "success");
      fetchBackups();
    } catch (err: any) {
      showToast(err.message || "Restore failed", "error");
    }
  };

  const handleDeletePermanently = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this backup? This action is irreversible!")) return;

    try {
      const res = await fetch(`/api/backups?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete backup");
      }

      showToast("Backup deleted permanently from storage", "success");
      fetchBackups();
    } catch (err: any) {
      showToast(err.message || "Deletion failed", "error");
    }
  };

  const calculateTimeRemaining = (timestamp: string) => {
    const deletedTime = new Date(timestamp).getTime();
    const expiryTime = deletedTime + 24 * 60 * 60 * 1000;
    const now = Date.now();
    const msRemaining = expiryTime - now;

    if (msRemaining <= 0) return "Expired";

    const hours = Math.floor(msRemaining / (1000 * 60 * 60));
    const minutes = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    return `${minutes}m left`;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const showToast = (text: string, type: "success" | "error") => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  return (
    <div className="repo-dashboard" style={{ maxWidth: "1000px" }}>
      <div className="repo-header-section">
        <div>
          <h1 className="repo-dashboard-title">Recycle Bin & History</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
            Deleted and overwritten files are temporarily retained here for **24 hours**. You can restore them or delete them permanently.
          </p>
        </div>
      </div>

      <div className="panel-card" style={{ padding: "1.5rem", minHeight: "300px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)" }}>Recent Backups</h2>
          <button className="btn btn-outline" onClick={fetchBackups} style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}>
            Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
            <div className="spinner"></div>
          </div>
        ) : backups.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--text-secondary)", fontSize: "0.85rem", fontStyle: "italic" }}>
            The Recycle Bin is empty. Files deleted or overwritten in the explorer will appear here.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--panel-border)", textAlign: "left" }}>
                  <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600, color: "var(--text-secondary)" }}>Original File Path</th>
                  <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600, color: "var(--text-secondary)" }}>Size</th>
                  <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600, color: "var(--text-secondary)" }}>Type</th>
                  <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600, color: "var(--text-secondary)" }}>Deleted At</th>
                  <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600, color: "var(--text-secondary)" }}>Expiration</th>
                  <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600, color: "var(--text-secondary)", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid rgba(102, 101, 96, 0.05)" }}>
                    <td style={{ padding: "0.75rem", fontWeight: 500, fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>
                      {item.originalKey}
                    </td>
                    <td style={{ padding: "0.75rem", color: "var(--text-secondary)" }}>
                      {formatSize(item.size)}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      <span style={{ 
                        fontSize: "0.7rem", 
                        backgroundColor: item.actionType === "deleted" ? "rgba(181, 86, 60, 0.08)" : "rgba(102, 101, 96, 0.08)", 
                        color: item.actionType === "deleted" ? "var(--accent-color)" : "var(--text-secondary)", 
                        padding: "0.15rem 0.4rem", 
                        borderRadius: "4px",
                        fontWeight: 600,
                        textTransform: "capitalize"
                      }}>
                        {item.actionType}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem", color: "var(--text-secondary)" }}>
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: "0.75rem", fontWeight: 600, color: "var(--accent-color)" }}>
                      {calculateTimeRemaining(item.timestamp)}
                    </td>
                    <td style={{ padding: "0.75rem", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                        <button 
                          className="btn btn-outline"
                          onClick={() => handleRestore(item.id)}
                          style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem", borderRadius: "4px" }}
                        >
                          Restore
                        </button>
                        <button 
                          className="btn btn-outline btn-danger"
                          onClick={() => handleDeletePermanently(item.id)}
                          style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem", borderRadius: "4px" }}
                        >
                          Purge
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && (
        <div className={`toast ${toast.type === "success" ? "toast-success" : "toast-error"}`}>
          <span>{toast.type === "success" ? "✓" : "✗"}</span>
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
}
