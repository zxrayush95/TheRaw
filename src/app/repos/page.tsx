"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function RepositoriesPage() {
  const router = useRouter();
  const [repositories, setRepositories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRepoName, setNewRepoName] = useState("");
  const [showCreateRepoForm, setShowCreateRepoForm] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchRepositories();
  }, []);

  const fetchRepositories = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/files");
      if (res.status === 401) {
        // AppShell handles main auth redirect, but let's be safe
        return;
      }
      const data = await res.json();
      setRepositories(data.repositories || []);
    } catch (err) {
      showToast("Failed to load repositories", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRepo = async (e: FormEvent) => {
    e.preventDefault();
    if (!newRepoName) return;
    try {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRepoName }),
      });
      if (!res.ok) throw new Error("Failed to create repository");
      
      const data = await res.json();
      showToast(`Repository "${data.repo}" created`, "success");
      setNewRepoName("");
      setShowCreateRepoForm(false);
      fetchRepositories();
    } catch (err: any) {
      showToast(err.message || "Failed to create repo", "error");
    }
  };

  const handleDeleteRepo = async (repoName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Warning: Deleting repository "${repoName}" will delete ALL files inside it. Proceed?`)) return;

    try {
      const res = await fetch(`/api/files?repo=${encodeURIComponent(repoName)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete repository");
      
      showToast("Repository deleted", "success");
      fetchRepositories();
    } catch (err: any) {
      showToast(err.message || "Failed to delete repo", "error");
    }
  };

  const showToast = (text: string, type: "success" | "error") => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  return (
    <div className="repo-dashboard">
      <div className="repo-header-section">
        <h1 className="repo-dashboard-title">Repositories</h1>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowCreateRepoForm(!showCreateRepoForm)}
        >
          {showCreateRepoForm ? "Cancel" : "New Repository"}
        </button>
      </div>

      {showCreateRepoForm && (
        <div className="panel-card" style={{ padding: "1.5rem", marginBottom: "2rem", maxWidth: "500px" }}>
          <form onSubmit={handleCreateRepo} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="path-label">Repository Name</label>
              <input 
                type="text" 
                placeholder="e.g. project-assets" 
                className="path-input" 
                value={newRepoName}
                onChange={(e) => setNewRepoName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: "max-content" }}>
              Create Repository
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
          <div className="spinner"></div>
        </div>
      ) : repositories.length === 0 ? (
        <div className="panel-card" style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-secondary)" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>
            <svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1c3.866 0 7 1.12 7 2.5s-3.134 2.5-7 2.5-7-1.12-7-2.5S4.134 1 8 1zm0 6c3.866 0 7-1.12 7-2.5V7c0 1.38-3.134 2.5-7 2.5S1 8.38 1 7V4.5c0 1.38 3.134 2.5 7 2.5zM1 8.5c0 1.38 3.134 2.5 7 2.5s7-1.12 7-2.5v2.5c0 1.38-3.134 2.5-7 2.5S1 12.38 1 11V8.5z"></path>
            </svg>
          </div>
          <h3>No Repositories</h3>
          <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>Create your first repository or use Global Storage.</p>
        </div>
      ) : (
        <div className="repo-grid">
          {repositories.map(repo => (
            <div 
              key={repo} 
              className="repo-card"
              onClick={() => router.push(`/repos/${encodeURIComponent(repo)}`)}
            >
              <div className="repo-card-details">
                <span className="repo-card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" style={{ opacity: 0.8 }}>
                    <path d="M1.75 1A1.75 1.75 0 000 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0016 13.25v-8.5A1.75 1.75 0 0014.25 3H7.58L6.02 1.44a1.75 1.75 0 00-1.24-.51H1.75zM1.5 2.75a.25.25 0 01.25-.25h3.03c.066 0 .13.026.177.073l1.816 1.817h7.477a.25.25 0 01.25.25v8.5a.25.25 0 01-.25.25H1.75a.25.25 0 01-.25-.25V2.75z"></path>
                  </svg>
                  {repo}
                </span>
                <span className="repo-card-desc">Cloudflare R2 Bucket Prefix</span>
              </div>
              <div className="repo-card-footer">
                <span>Active Storage</span>
                <button 
                  className="repo-delete-btn" 
                  onClick={(e) => handleDeleteRepo(repo, e)}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M11 1.75V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675a.75.75 0 10-1.492.15l.5 5.5A1.75 1.75 0 005.25 14h5.5a1.75 1.75 0 001.746-1.675l.5-5.5a.75.75 0 10-1.492-.15l-.5 5.5A.25.25 0 0110.75 12.5h-5.5a.25.25 0 01-.249-.24l-.5-5.5z"></path>
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Local Toast Indicator */}
      {toast && (
        <div className={`toast ${toast.type === "success" ? "toast-success" : "toast-error"}`}>
          <span>{toast.type === "success" ? "✓" : "✗"}</span>
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
}
