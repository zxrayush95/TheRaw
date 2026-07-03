"use client";

import { useState, useEffect, FormEvent } from "react";

interface ApiToken {
  id: string;
  name: string;
  token: string;
  scopes: ("read" | "write" | "delete")[];
  createdAt: string;
}

export default function TokensPage() {
  const [apiTokens, setApiTokens] = useState<ApiToken[]>([]);
  const [newTokenName, setNewTokenName] = useState("");
  const [newTokenScopes, setNewTokenScopes] = useState<string[]>(["read"]);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [tokensLoading, setTokensLoading] = useState(true);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    setTokensLoading(true);
    try {
      const res = await fetch("/api/auth/tokens");
      if (res.status === 401) return;
      const data = await res.json();
      setApiTokens(data.tokens || []);
    } catch (err) {
      showToast("Failed to load API tokens", "error");
    } finally {
      setTokensLoading(false);
    }
  };

  const handleGenerateToken = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTokenName) return;

    try {
      const res = await fetch("/api/auth/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTokenName, scopes: newTokenScopes }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate token");
      }

      const data = await res.json();
      showToast("API Access Key generated", "success");
      setGeneratedToken(data.token.token);
      setNewTokenName("");
      setNewTokenScopes(["read"]);
      fetchTokens();
    } catch (err: any) {
      showToast(err.message || "Failed to generate key", "error");
    }
  };

  const handleRevokeToken = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this API access key? Any client using it will lose access immediately.")) return;

    try {
      const res = await fetch(`/api/auth/tokens?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to revoke token");
      }

      showToast("API Key revoked successfully", "success");
      fetchTokens();
    } catch (err: any) {
      showToast(err.message || "Failed to revoke key", "error");
    }
  };

  const handleToggleScope = (scope: string) => {
    if (newTokenScopes.includes(scope)) {
      setNewTokenScopes(newTokenScopes.filter(s => s !== scope));
    } else {
      setNewTokenScopes([...newTokenScopes, scope]);
    }
  };

  const copyToClipboard = (text: string, message = "Copied to clipboard!") => {
    navigator.clipboard.writeText(text);
    showToast(message, "success");
  };

  const showToast = (text: string, type: "success" | "error") => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  return (
    <div className="repo-dashboard" style={{ maxWidth: "900px" }}>
      <div className="repo-header-section">
        <div>
          <h1 className="repo-dashboard-title">API Access Keys</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
            Generate and revoke developer credentials to access storage APIs (list repos, list files, upload, create/edit, and delete files) via standard Bearer tokens.
          </p>
        </div>
      </div>

      {generatedToken && (
        <div className="panel-card" style={{ padding: "1.5rem", marginBottom: "2rem", border: "1px solid var(--accent-color)", backgroundColor: "rgba(181, 86, 60, 0.03)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <span style={{ fontWeight: 600, color: "var(--accent-color)", fontSize: "0.9rem" }}>
              ⚠️ Make sure to copy your API access key now. You won't be able to see it again!
            </span>
            
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.25rem" }}>
              <code style={{ 
                flexGrow: 1, 
                padding: "0.75rem", 
                backgroundColor: "var(--bg-color)", 
                borderRadius: "6px", 
                fontSize: "0.85rem",
                border: "1px solid var(--panel-border)",
                wordBreak: "break-all",
                fontFamily: "var(--font-mono)",
                color: "var(--text-primary)"
              }}>
                {generatedToken}
              </code>
              <button 
                className="btn btn-primary"
                onClick={() => copyToClipboard(generatedToken, "API access key copied!")}
                style={{ whiteSpace: "nowrap" }}
              >
                Copy Key
              </button>
            </div>
            
            <button 
              className="btn btn-outline"
              onClick={() => setGeneratedToken(null)}
              style={{ width: "max-content", marginTop: "0.25rem", padding: "0.35rem 0.75rem", fontSize: "0.75rem" }}
            >
              I've saved my key
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "2rem" }}>
        
        {/* Generate Key Form Panel */}
        <div className="panel-card" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem", color: "var(--text-primary)" }}>Generate New Developer Key</h2>
          
          <form onSubmit={handleGenerateToken} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="path-label">Key Label / Name</label>
              <input 
                type="text" 
                placeholder="e.g. MCP Client or VSCode Extension" 
                className="path-input" 
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="path-label" style={{ marginBottom: "0.5rem" }}>Key Access Scopes</label>
              <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }}>
                  <input 
                    type="checkbox" 
                    checked={newTokenScopes.includes("read")}
                    onChange={() => handleToggleScope("read")}
                    style={{ accentColor: "var(--accent-color)" }}
                  />
                  <span><strong>read</strong> (List repos, list files, view raw file contents)</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }}>
                  <input 
                    type="checkbox" 
                    checked={newTokenScopes.includes("write")}
                    onChange={() => handleToggleScope("write")}
                    style={{ accentColor: "var(--accent-color)" }}
                  />
                  <span><strong>write</strong> (Create repos, create files, edit files, upload files)</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }}>
                  <input 
                    type="checkbox" 
                    checked={newTokenScopes.includes("delete")}
                    onChange={() => handleToggleScope("delete")}
                    style={{ accentColor: "var(--accent-color)" }}
                  />
                  <span><strong>delete</strong> (Delete files, delete repositories)</span>
                </label>

              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "max-content" }} disabled={newTokenScopes.length === 0}>
              Generate Developer Key
            </button>
          </form>
        </div>

        {/* Active Keys Listing Panel */}
        <div className="panel-card" style={{ padding: "1.5rem", minHeight: "200px" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem", color: "var(--text-primary)" }}>Active Keys</h2>
          
          {tokensLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
              <div className="spinner"></div>
            </div>
          ) : apiTokens.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)", fontSize: "0.85rem", fontStyle: "italic" }}>
              No active API keys found. Generate a key above to allow script/CLI integration.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--panel-border)", textAlign: "left" }}>
                    <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600, color: "var(--text-secondary)" }}>Name</th>
                    <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600, color: "var(--text-secondary)" }}>Key Mask</th>
                    <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600, color: "var(--text-secondary)" }}>Scopes</th>
                    <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600, color: "var(--text-secondary)" }}>Created</th>
                    <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600, color: "var(--text-secondary)", textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {apiTokens.map(token => (
                    <tr key={token.id} style={{ borderBottom: "1px solid rgba(102, 101, 96, 0.05)" }}>
                      <td style={{ padding: "0.75rem", fontWeight: 500 }}>{token.name}</td>
                      <td style={{ padding: "0.75rem" }}><code style={{ fontFamily: "var(--font-mono)", opacity: 0.8 }}>{token.token}</code></td>
                      <td style={{ padding: "0.75rem" }}>
                        <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                          {token.scopes.map(scope => (
                            <span key={scope} style={{ 
                              fontSize: "0.7rem", 
                              backgroundColor: "rgba(181, 86, 60, 0.08)", 
                              color: "var(--accent-color)", 
                              padding: "0.1rem 0.35rem", 
                              borderRadius: "4px",
                              fontWeight: 600
                            }}>
                              {scope}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: "0.75rem", color: "var(--text-secondary)" }}>
                        {new Date(token.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td style={{ padding: "0.75rem", textAlign: "right" }}>
                        <button 
                          className="btn btn-outline btn-danger"
                          onClick={() => handleRevokeToken(token.id)}
                          style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem", borderRadius: "4px" }}
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Local Toast Alert */}
      {toast && (
        <div className={`toast ${toast.type === "success" ? "toast-success" : "toast-error"}`}>
          <span>{toast.type === "success" ? "✓" : "✗"}</span>
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
}
