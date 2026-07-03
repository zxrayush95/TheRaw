"use client";

import React, { useState, useEffect, FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";

interface ToastMessage {
  text: string;
  type: "success" | "error";
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Layout states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Verify authentication on mount and route changes
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const res = await fetch("/api/auth/check");
      const data = await res.json();
      if (data.authenticated) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (err) {
      setIsAuthenticated(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoginLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      
      if (res.ok) {
        setIsAuthenticated(true);
        setPassword("");
        showToast("Logged in successfully", "success");
        // Reload current page to initialize data fetching
        router.refresh();
      } else {
        const data = await res.json();
        throw new Error(data.error || "Login failed");
      }
    } catch (err: any) {
      showToast(err.message || "Invalid credentials", "error");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setIsAuthenticated(false);
      showToast("Logged out successfully", "success");
      router.push("/");
    } catch (err) {
      showToast("Logout failed", "error");
    }
  };

  const showToast = (text: string, type: "success" | "error") => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleNavigation = (path: string) => {
    setIsDrawerOpen(false);
    router.push(path);
  };

  // Determine header sub-title based on active URL route
  const getHeaderTitle = () => {
    if (pathname === "/tokens") return "API Access Keys";
    if (pathname.startsWith("/repos")) {
      const parts = pathname.split("/");
      if (parts.length > 2 && parts[2]) {
        return `Repository: ${decodeURIComponent(parts[2])}`;
      }
      return "Repositories";
    }
    return "Global Storage";
  };

  // Loading state during auth check
  if (isAuthenticated === null) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div className="spinner"></div>
        <p style={{ marginTop: "1rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>Initializing session...</p>
      </div>
    );
  }

  // Secure Login page
  if (isAuthenticated === false) {
    return (
      <>
        <div className="login-container">
          <div className="login-card">
            <div className="login-header">
              <div className="login-logo" style={{ display: "inline-block" }}>TheRaw</div>
              <p className="login-subtitle">Sign in to manage your Cloudflare R2 repository</p>
            </div>
            
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label" htmlFor="pass">Security Password</label>
                <input 
                  type="password" 
                  id="pass"
                  placeholder="Enter security key..." 
                  className="form-input" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loginLoading}
                  required
                  autoFocus
                />
              </div>

              <button type="submit" className="login-btn" disabled={loginLoading}>
                {loginLoading ? "Authenticating..." : "Sign In"}
              </button>
            </form>
          </div>
        </div>

        {toast && (
          <div className={`toast ${toast.type === "success" ? "toast-success" : "toast-error"}`}>
            <span>{toast.type === "success" ? "✓" : "✗"}</span>
            <span>{toast.text}</span>
          </div>
        )}
      </>
    );
  }

  // Determine active view to style buttons in drawer
  const isGlobalActive = pathname === "/";
  const isReposActive = pathname.startsWith("/repos");
  const isTokensActive = pathname === "/tokens";

  return (
    <>
      <header className="app-header">
        <div className="logo-container">
          <button 
            className="hamburger-menu-btn" 
            onClick={() => setIsDrawerOpen(true)}
            title="Open Menu"
            style={{ marginRight: "0.5rem" }}
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M1 2.75A.75.75 0 011.75 2h12.5a.75.75 0 010 1.5H1.75A.75.75 0 011 2.75zm0 5A.75.75 0 011.75 7h12.5a.75.75 0 010 1.5H1.75A.75.75 0 011 7.75zM1.75 12a.75.75 0 000 1.5h12.5a.75.75 0 000-1.5H1.75z"></path>
            </svg>
          </button>
          
          <div className="logo-icon" onClick={() => handleNavigation("/")}>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
              <path d="M7.75 14c.06 0 .1-.04.1-.1v-4.8c0-.06-.04-.1-.1-.1h-4.8c-.06 0-.1.04-.1.1v4.8c0 .06.04.1.1.1h4.8zM8.75 9.1c0-.06.04-.1.1-.1h4.8c.06 0 .1.04.1.1v4.8c0 .06-.04.1-.1.1h-4.8c-.06 0-.1-.04-.1-.1v-4.8zM2.85 2.1h4.8c.06 0 .1.04.1.1v4.8c0 .06-.04.1-.1.1h-4.8c-.06 0-.1-.04-.1-.1v-4.8c0-.06.04-.1.1-.1zM9.85 3c-.06 0-.1.04-.1.1v3.8c0 .06.04.1.1.1h3.8c.06 0 .1-.04.1-.1V3.1c0-.06-.04-.1-.1-.1h-3.8z"></path>
            </svg>
          </div>
          <span className="logo-text" onClick={() => handleNavigation("/")}>TheRaw</span>
        </div>
        
        <div className="header-right">
          <div className="api-badge" style={{ fontStyle: "italic" }}>
            {getHeaderTitle()}
          </div>
        </div>
      </header>

      {/* Navigation Drawer Overlay */}
      <div 
        className={`nav-drawer-overlay ${isDrawerOpen ? "open" : ""}`} 
        onClick={() => setIsDrawerOpen(false)}
      />
      
      {/* Navigation Drawer */}
      <div className={`nav-drawer ${isDrawerOpen ? "open" : ""}`}>
        <div className="drawer-header">
          <div className="logo-container">
            <div className="logo-icon">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                <path d="M7.75 14c.06 0 .1-.04.1-.1v-4.8c0-.06-.04-.1-.1-.1h-4.8c-.06 0-.1.04-.1.1v4.8c0 .06.04.1.1.1h4.8zM8.75 9.1c0-.06.04-.1.1-.1h4.8c.06 0 .1.04.1.1v4.8c0 .06-.04.1-.1.1h-4.8c-.06 0-.1-.04-.1-.1v-4.8zM2.85 2.1h4.8c.06 0 .1.04.1.1v4.8c0 .06-.04.1-.1.1h-4.8c-.06 0-.1-.04-.1-.1v-4.8c0-.06.04-.1.1-.1zM9.85 3c-.06 0-.1.04-.1.1v3.8c0 .06.04.1.1.1h3.8c.06 0 .1-.04.1-.1V3.1c0-.06-.04-.1-.1-.1h-3.8z"></path>
              </svg>
            </div>
            <span className="logo-text">TheRaw</span>
          </div>
          <button className="delete-btn" onClick={() => setIsDrawerOpen(false)} title="Close Drawer" style={{ fontSize: "1.1rem" }}>
            ✕
          </button>
        </div>
        
        <div className="drawer-content">
          <button 
            className={`drawer-nav-item ${isGlobalActive ? "active" : ""}`}
            onClick={() => handleNavigation("/")}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a8 8 0 110 16A8 8 0 018 0zM1.5 8a6.5 6.5 0 1013 0 6.5 6.5 0 00-13 0zm6.5-5.75c1.47 0 2.66 2.57 2.66 5.75s-1.19 5.75-2.66 5.75S5.34 11.18 5.34 8s1.19-5.75 2.66-5.75zM8 3.51c-.6 0-1.16 1.88-1.16 4.49S7.4 12.49 8 12.49s1.16-1.88 1.16-4.49S8.6 3.51 8 3.51zM2.53 5.5h10.94a5.978 5.978 0 01.44 2.5H2.09a5.978 5.978 0 01.44-2.5zm-.44 4h11.82c-.17.91-.56 1.75-1.13 2.5H3.25a5.978 5.978 0 01-1.16-2.5z"></path>
            </svg>
            Global Storage
          </button>
          
          <button 
            className={`drawer-nav-item ${isReposActive ? "active" : ""}`}
            onClick={() => handleNavigation("/repos")}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1c3.866 0 7 1.12 7 2.5s-3.134 2.5-7 2.5-7-1.12-7-2.5S4.134 1 8 1zm0 6c3.866 0 7-1.12 7-2.5V7c0 1.38-3.134 2.5-7 2.5S1 8.38 1 7V4.5c0 1.38 3.134 2.5 7 2.5zM1 8.5c0 1.38 3.134 2.5 7 2.5s7-1.12 7-2.5v2.5c0 1.38-3.134 2.5-7 2.5S1 12.38 1 11V8.5z"></path>
            </svg>
            Repositories
          </button>

          <button 
            className={`drawer-nav-item ${isTokensActive ? "active" : ""}`}
            onClick={() => handleNavigation("/tokens")}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.5 1a3.5 3.5 0 00-3.5 3.5c0 .35.05.69.15 1.01L1.15 12.51a.75.75 0 000 1.06l1.28 1.28a.75.75 0 001.06 0l1.28-1.28a.25.25 0 01.18-.07h1.5a.25.25 0 01.18.07l1.04 1.04a.75.75 0 001.06 0l1.04-1.04a.25.25 0 01.18-.07H11a.75.75 0 00.53-.22l1.41-1.41c.32.1.66.15 1.01.15a3.5 3.5 0 003.5-3.5V4.5A3.5 3.5 0 0015 1h-3.5zM15 4.5a1.5 1.5 0 01-1.5 1.5H12a.75.75 0 00-.75.75v1.25a.25.25 0 01-.07.18l-1.41 1.41a.25.25 0 01-.18.07H8.09a.75.75 0 00-.53.22L6.12 11.32a.25.25 0 01-.36 0L4.48 9.68a.25.25 0 010-.36L5.78 8.02a.75.75 0 00.22-.53V6.09a.25.25 0 01.07-.18l1.41-1.41a.25.25 0 01.18-.07H9a.75.75 0 00.75-.75V3.5a1.5 1.5 0 011.5-1.5H15a1.5 1.5 0 011.5 1.5V4.5zM13 3.5a1 1 0 11-2 0 1 1 0 012 0z"></path>
            </svg>
            API Access Keys
          </button>
        </div>

        <div className="drawer-footer">
          <button className="btn btn-outline" onClick={handleLogout} style={{ width: "100%" }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Routed Page Content */}
      {children}

      {/* Global Toast Container */}
      {toast && (
        <div className={`toast ${toast.type === "success" ? "toast-success" : "toast-error"}`}>
          <span>{toast.type === "success" ? "✓" : "✗"}</span>
          <span>{toast.text}</span>
        </div>
      )}
    </>
  );
}
