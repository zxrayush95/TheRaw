"use client";

import { useState, useEffect, useRef, DragEvent, ChangeEvent, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface FileItem {
  key: string;
  size: number;
  lastModified: string;
}

interface EditorState {
  isOpen: boolean;
  mode: "create" | "edit";
  filename: string;
  content: string;
  originalKey?: string;
}

export default function GlobalStoragePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPath = searchParams.get("path") || "";

  // Files explorer states
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Selection and preview
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [loadingContent, setLoadingContent] = useState(false);

  // Text editor state
  const [editorState, setEditorState] = useState<EditorState>({
    isOpen: false,
    mode: "create",
    filename: "",
    content: "",
  });

  // Upload states
  const [uploadPath, setUploadPath] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchGlobalFiles();
  }, []);

  // Fetch global files (lists entire bucket)
  const fetchGlobalFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/files?global=true");
      if (res.status === 401) return;
      const data = await res.json();
      setFiles(data.files || []);
    } catch (err) {
      showToast("Failed to load files", "error");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (text: string, type: "success" | "error") => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Fetch file content for preview
  useEffect(() => {
    if (!selectedFile) {
      setFileContent("");
      return;
    }

    const category = getFileCategory(selectedFile.key);
    if (category === "text") {
      loadTextContent(selectedFile.key);
    } else {
      setFileContent("");
    }
  }, [selectedFile]);

  const loadTextContent = async (key: string) => {
    setLoadingContent(true);
    try {
      const res = await fetch(`/api/raw/v1/${key}`);
      if (!res.ok) throw new Error("Could not load file content");
      const text = await res.text();
      setFileContent(text);
    } catch (err: any) {
      showToast(err.message || "Failed to load content", "error");
      setFileContent("Error loading content...");
    } finally {
      setLoadingContent(false);
    }
  };

  // Delete file
  const handleDeleteFile = async (key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${key}"?`)) return;

    try {
      const res = await fetch(`/api/files?key=${encodeURIComponent(key)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete file");
      showToast("File deleted", "success");
      
      if (selectedFile?.key === key) {
        setSelectedFile(null);
      }
      if (editorState.isOpen && editorState.originalKey === key) {
        setEditorState({ isOpen: false, mode: "create", filename: "", content: "" });
      }
      
      fetchGlobalFiles();
    } catch (err: any) {
      showToast(err.message || "Delete failed", "error");
    }
  };

  // Upload files
  const handleUploadFiles = async (fileList: FileList) => {
    if (fileList.length === 0) return;
    setIsUploading(true);

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const formData = new FormData();
        formData.append("file", file);
        
        const combinedPath = uploadPath ? uploadPath.replace(/\/$/, "") : "";
        formData.append("path", combinedPath);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || `Failed to upload ${file.name}`);
        }
      }

      showToast("Upload completed successfully", "success");
      setUploadPath("");
      fetchGlobalFiles();
    } catch (err: any) {
      showToast(err.message || "Upload failed", "error");
    } finally {
      setIsUploading(false);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadFiles(e.target.files);
    }
  };

  const copyToClipboard = (text: string, message = "Copied to clipboard!") => {
    navigator.clipboard.writeText(text);
    showToast(message, "success");
  };

  // Code editor keyboard shortcuts
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { value, selectionStart, selectionEnd } = textarea;

    if (e.key === "Tab") {
      e.preventDefault();
      const tabSpace = "  ";
      const newValue = value.substring(0, selectionStart) + tabSpace + value.substring(selectionEnd);
      setEditorState(prev => ({ ...prev, content: newValue }));
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + tabSpace.length;
      }, 0);
    }

    const pairs: Record<string, string> = {
      "{": "}",
      "(": ")",
      "[": "]",
      '"': '"',
      "'": "'",
      "`": "`",
    };
    if (pairs[e.key] !== undefined) {
      e.preventDefault();
      const closing = pairs[e.key];
      const newValue = value.substring(0, selectionStart) + e.key + closing + value.substring(selectionEnd);
      setEditorState(prev => ({ ...prev, content: newValue }));
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
      }, 0);
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const textBeforeCursor = value.substring(0, selectionStart);
      const lines = textBeforeCursor.split("\n");
      const currentLine = lines[lines.length - 1];
      const match = currentLine.match(/^(\s*)/);
      let indent = match ? match[1] : "";
      const lastChar = currentLine.trim().slice(-1);
      
      if (lastChar === "{") {
        indent += "  ";
      }

      const insertText = "\n" + indent;
      const newValue = value.substring(0, selectionStart) + insertText + value.substring(selectionEnd);
      setEditorState(prev => ({ ...prev, content: newValue }));
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + insertText.length;
      }, 0);
    }
  };

  // Open File Editor for creating a new file
  const openNewFileEditor = () => {
    setSelectedFile(null);
    setEditorState({
      isOpen: true,
      mode: "create",
      filename: currentPath,
      content: "",
    });
  };

  // Open File Editor for editing an existing file
  const openEditFileEditor = () => {
    if (!selectedFile) return;
    setEditorState({
      isOpen: true,
      mode: "edit",
      filename: selectedFile.key,
      content: fileContent,
      originalKey: selectedFile.key
    });
  };

  // Save/Commit file in editor
  const handleSaveFile = async () => {
    if (!editorState.filename) {
      showToast("Filename is required", "error");
      return;
    }

    let fileRelPath = editorState.filename.replace(/^\//, "");

    try {
      const res = await fetch("/api/files/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: fileRelPath, content: editorState.content }),
      });

      if (!res.ok) throw new Error("Failed to save file");
      
      showToast("File saved successfully", "success");
      setEditorState({ isOpen: false, mode: "create", filename: "", content: "" });
      fetchGlobalFiles();
      
      setSelectedFile({
        key: fileRelPath,
        size: Buffer.byteLength(editorState.content, "utf-8"),
        lastModified: new Date().toISOString(),
      });
    } catch (err: any) {
      showToast(err.message || "Save failed", "error");
    }
  };

  const navigateToFolder = (folderPath: string) => {
    setEditorState(prev => ({ ...prev, isOpen: false }));
    router.push(folderPath ? `/?path=${encodeURIComponent(folderPath)}` : "/");
  };

  // Directory listing calculations relative to bucket root
  const getDirectoryItems = () => {
    const folders = new Set<string>();
    const currentFiles: FileItem[] = [];

    const filteredFiles = files.filter(file => {
      return file.key.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const prefix = currentPath;

    filteredFiles.forEach((file) => {
      if (file.key.startsWith(prefix)) {
        const relativePart = file.key.substring(prefix.length);
        if (!relativePart || relativePart === ".gitkeep" || relativePart === ".keep" || relativePart.startsWith(".system/")) return;

        const slashIndex = relativePart.indexOf("/");
        if (slashIndex === -1) {
          currentFiles.push(file);
        } else {
          const folderName = relativePart.substring(0, slashIndex);
          folders.add(folderName);
        }
      }
    });

    return {
      folders: Array.from(folders).sort(),
      files: currentFiles.sort((a, b) => a.key.localeCompare(b.key)),
    };
  };

  const getBreadcrumbs = () => {
    const parts = currentPath.split("/").filter(p => p !== "");
    return [
      { name: "root", path: "" },
      ...parts.map((part, index) => {
        const fullPath = parts.slice(0, index + 1).join("/") + "/";
        return { name: part, path: fullPath };
      })
    ];
  };

  const { folders, files: folderFiles } = getDirectoryItems();
  const origin = typeof window !== "undefined" ? window.location.origin : "https://domain.com";

  const getFileCategory = (key: string) => {
    const ext = key.split(".").pop()?.toLowerCase() || "";
    const textExtensions = [
      "txt", "md", "js", "jsx", "ts", "tsx", "css", "json", "xml", "yaml", "yml", "ini", "conf",
      "py", "go", "rs", "cpp", "c", "h", "hpp", "java", "kt", "swift", "rb", "sh", "bat", "ps1", "sql", "html"
    ];
    const imageExtensions = ["png", "jpg", "jpeg", "gif", "svg", "webp", "ico"];
    const audioExtensions = ["mp3", "wav", "ogg"];
    const videoExtensions = ["mp4", "webm"];
    const pdfExtensions = ["pdf"];

    if (textExtensions.includes(ext)) return "text";
    if (imageExtensions.includes(ext)) return "image";
    if (audioExtensions.includes(ext)) return "audio";
    if (videoExtensions.includes(ext)) return "video";
    if (pdfExtensions.includes(ext)) return "pdf";
    return "binary";
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <main className="app-container">
      <div className="sidebar-panel">
        
        {/* Explorer Panel */}
        <div className="panel-card explorer-section">
          <div className="panel-header">
            <span className="panel-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ opacity: 0.7, marginRight: "0.25rem" }}>
                <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8z"></path>
              </svg>
              Global Drive
            </span>
            <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
              <button 
                className="btn btn-primary"
                style={{ padding: "0.25rem 0.5rem", fontSize: "0.7rem", borderRadius: "6px" }}
                onClick={openNewFileEditor}
              >
                + File
              </button>
              {currentPath && (
                <button 
                  className="btn btn-outline" 
                  style={{ padding: "0.25rem 0.5rem", fontSize: "0.7rem", borderRadius: "6px" }}
                  onClick={() => {
                    const parts = currentPath.split("/").filter(p => p !== "");
                    parts.pop();
                    navigateToFolder(parts.length > 0 ? parts.join("/") + "/" : "");
                  }}
                >
                  Back
                </button>
              )}
            </div>
          </div>

          <div className="search-container">
            <input 
              type="text" 
              placeholder="Filter files..." 
              className="search-input" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="breadcrumbs-container">
            {getBreadcrumbs().map((bc, idx, arr) => (
              <span key={bc.path}>
                <span 
                  className={`breadcrumb-item ${idx === arr.length - 1 ? "breadcrumb-active" : ""}`}
                  onClick={() => navigateToFolder(bc.path)}
                >
                  {bc.name}
                </span>
                {idx < arr.length - 1 && <span className="breadcrumb-separator">/</span>}
              </span>
            ))}
          </div>

          <div className="explorer-list">
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
                <div className="spinner"></div>
              </div>
            ) : folders.length === 0 && folderFiles.length === 0 ? (
              <div className="empty-explorer">
                No files found at this level.
              </div>
            ) : (
              <>
                {/* Folder listing with Custom SVG folder icon */}
                {folders.map(folder => (
                  <div 
                    key={folder} 
                    className="list-row"
                    onClick={() => navigateToFolder(currentPath + folder + "/")}
                  >
                    <div className="row-left">
                      <span className="row-icon">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0, opacity: 0.8 }}>
                          <path d="M1.75 1A1.75 1.75 0 000 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0016 13.25v-8.5A1.75 1.75 0 0014.25 3H7.58L6.02 1.44a1.75 1.75 0 00-1.24-.51H1.75zM1.5 2.75a.25.25 0 01.25-.25h3.03c.066 0 .13.026.177.073l1.816 1.817h7.477a.25.25 0 01.25.25v8.5a.25.25 0 01-.25.25H1.75a.25.25 0 01-.25-.25V2.75z"></path>
                        </svg>
                      </span>
                      <span className="row-name">{folder}</span>
                    </div>
                    <span className="row-meta">Folder</span>
                  </div>
                ))}

                {/* File listing with Custom SVG file icon */}
                {folderFiles.map(file => {
                  const isSelected = selectedFile?.key === file.key && !editorState.isOpen;
                  const displayPrefix = currentPath.length;
                  const relativeName = file.key.substring(displayPrefix);
                  
                  return (
                    <div 
                      key={file.key} 
                      className={`list-row ${isSelected ? "selected" : ""}`}
                      onClick={() => {
                        setSelectedFile(file);
                        setEditorState(prev => ({ ...prev, isOpen: false }));
                      }}
                    >
                      <div className="row-left">
                        <span className="row-icon">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0, opacity: 0.8 }}>
                            <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l3.414 3.414c.329.328.513.773.513 1.237v9.086A1.75 1.75 0 0113.75 16H3.75A1.75 1.75 0 012 14.25V1.75zm1.75-.25a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25h10a.25.25 0 00.25-.25V6H10.75A1.75 1.75 0 019 4.25V1.5H3.75zM10.5 1.5V4a.25.25 0 00.25.25h2.5L10.5 1.5z"></path>
                          </svg>
                        </span>
                        <span className="row-name" title={file.key}>{relativeName}</span>
                      </div>
                      <div className="row-meta">
                        <span>{formatSize(file.size)}</span>
                        <button 
                          className="delete-btn" 
                          title="Delete"
                          onClick={(e) => handleDeleteFile(file.key, e)}
                        >
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M11 1.75V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675a.75.75 0 10-1.492.15l.5 5.5A1.75 1.75 0 005.25 14h5.5a1.75 1.75 0 001.746-1.675l.5-5.5a.75.75 0 10-1.492-.15l-.5 5.5A.25.25 0 0110.75 12.5h-5.5a.25.25 0 01-.249-.24l-.5-5.5z"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Upload Panel */}
        <div className="panel-card upload-panel">
          <div className="path-input-group">
            <label className="path-label">Destination Folder</label>
            <input 
              type="text" 
              placeholder="e.g. assets/css" 
              className="path-input" 
              value={uploadPath}
              onChange={(e) => setUploadPath(e.target.value)}
              disabled={isUploading}
            />
          </div>

          <div 
            className={`dropzone ${dragActive ? "active" : ""}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              className="file-input" 
              ref={fileInputRef}
              multiple 
              onChange={handleFileInputChange}
              disabled={isUploading}
            />
            
            <div className="upload-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7, marginBottom: "0.25rem" }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            {isUploading ? (
              <div className="upload-text">Uploading to R2...</div>
            ) : (
              <div className="upload-text">
                Drop files here or <span>browse</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Right Editor OR Preview Section */}
      <div className="panel-card preview-panel">
        {editorState.isOpen ? (
          /* Online File Creator/Editor */
          <div className="editor-container">
            <div className="editor-header">
              <div className="editor-header-left">
                <span className="editor-title">
                  {editorState.mode === "create" ? "Create File" : "Edit File"}
                </span>
                <input 
                  type="text" 
                  placeholder="filename.js or folder/filename.css" 
                  className="editor-filename-input"
                  value={editorState.filename}
                  onChange={(e) => setEditorState(prev => ({ ...prev, filename: e.target.value }))}
                  disabled={editorState.mode === "edit"}
                />
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button 
                  className="btn btn-outline"
                  onClick={() => setEditorState(prev => ({ ...prev, isOpen: false }))}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleSaveFile}
                >
                  Commit Changes
                </button>
              </div>
            </div>

            <div className="editor-textarea-wrapper">
              <textarea 
                className="editor-textarea"
                placeholder={`// Start typing your code or text...\n// Press Tab to insert spaces. Enter auto-matches indents. Braces close automatically.`}
                value={editorState.content}
                onChange={(e) => setEditorState(prev => ({ ...prev, content: e.target.value }))}
                onKeyDown={handleEditorKeyDown}
                ref={textareaRef}
                autoFocus
              />
            </div>
          </div>
        ) : selectedFile ? (
          /* Preview pane */
          <>
            <div className="preview-header">
              <div className="preview-file-info">
                <span className="preview-filename">{selectedFile.key.split("/").pop()}</span>
                <span className="preview-filepath">{selectedFile.key}</span>
              </div>
              <div className="preview-actions">
                {getFileCategory(selectedFile.key) === "text" && (
                  <button 
                    className="btn btn-outline"
                    onClick={openEditFileEditor}
                  >
                    Edit File
                  </button>
                )}
                <button 
                  className="btn btn-outline"
                  onClick={() => copyToClipboard(`${origin}/api/raw/v1/${selectedFile.key}`, "Raw URL copied!")}
                >
                  Copy Raw URL
                </button>
                <a 
                  href={`/api/raw/v1/${selectedFile.key}`} 
                  download={selectedFile.key.split("/").pop()}
                  className="btn btn-primary"
                >
                  Download
                </a>
                <button 
                  className="btn btn-danger"
                  onClick={() => handleDeleteFile(selectedFile.key)}
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="endpoint-banner">
              <span className="endpoint-text">
                Raw Endpoint: <strong>GET</strong> {origin}/api/raw/v1/{selectedFile.key}
              </span>
              <button 
                className="copy-icon-btn" 
                title="Copy Endpoint"
                onClick={() => copyToClipboard(`${origin}/api/raw/v1/${selectedFile.key}`, "API endpoint link copied!")}
              >
                📋
              </button>
            </div>

            <div className="preview-content">
              {loadingContent && (
                <div className="loading-overlay">
                  <div className="spinner"></div>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Loading preview...</span>
                </div>
              )}

              {getFileCategory(selectedFile.key) === "text" && (
                <div className="code-viewer-container">
                  <div className="code-lines-num">
                    {fileContent.split("\n").map((_, i) => (
                      <span key={i}>{i + 1}</span>
                    ))}
                  </div>
                  <pre className="code-content-pre"><code>{fileContent}</code></pre>
                </div>
              )}

              {getFileCategory(selectedFile.key) === "image" && (
                <div className="image-viewer">
                  <img 
                    src={`/api/raw/v1/${selectedFile.key}`} 
                    alt={selectedFile.key} 
                  />
                </div>
              )}

              {getFileCategory(selectedFile.key) === "video" && (
                <div className="media-viewer">
                  <video controls src={`/api/raw/v1/${selectedFile.key}`} />
                  <span className="preview-filepath" style={{ marginTop: "0.5rem" }}>{formatSize(selectedFile.size)}</span>
                </div>
              )}

              {getFileCategory(selectedFile.key) === "audio" && (
                <div className="media-viewer">
                  <audio controls src={`/api/raw/v1/${selectedFile.key}`} />
                  <span className="preview-filepath" style={{ marginTop: "0.5rem" }}>{formatSize(selectedFile.size)}</span>
                </div>
              )}

              {getFileCategory(selectedFile.key) === "pdf" && (
                <iframe 
                  src={`/api/raw/v1/${selectedFile.key}`} 
                  style={{ width: "100%", height: "100%", border: "none", flexGrow: 1 }}
                />
              )}

              {getFileCategory(selectedFile.key) === "binary" && (
                <div className="binary-viewer">
                  <div className="binary-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                      <line x1="12" y1="22.08" x2="12" y2="12" />
                    </svg>
                  </div>
                  <div className="binary-title">{selectedFile.key.split("/").pop()}</div>
                  <div className="binary-desc">Size: {formatSize(selectedFile.size)}</div>
                  <div className="binary-desc" style={{ opacity: 0.7 }}>Previews are disabled for binaries. You can access it via the raw URL or download it locally.</div>
                  <a 
                    href={`/api/raw/v1/${selectedFile.key}`} 
                    download={selectedFile.key.split("/").pop()}
                    className="btn btn-primary"
                    style={{ marginTop: "1rem" }}
                  >
                    Download Binary File
                  </a>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="empty-preview">
            <div className="empty-preview-icon">
              <svg width="40" height="40" viewBox="0 0 16 16" fill="currentColor" style={{ opacity: 0.4 }}>
                <path d="M1.75 1a1.75 1.75 0 00-1.75 1.75v10.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0016 13.25v-8.5A1.75 1.75 0 0014.25 3H7.58L6.02 1.44a1.75 1.75 0 00-1.24-.51H1.75zM1.5 2.75a.25.25 0 01.25-.25h3.03c.066 0 .13.026.177.073l1.816 1.817h7.477a.25.25 0 01.25.25v8.5a.25.25 0 01-.25.25H1.75a.25.25 0 01-.25-.25V2.75z"></path>
              </svg>
            </div>
            <h3 className="empty-preview-title">No file selected</h3>
            <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              Select a file from the explorer list on the left to preview code, images, and audio/video directly, or to fetch its raw API endpoint.
            </p>
          </div>
        )}
      </div>

      {/* Local Toast Alert */}
      {toast && (
        <div className={`toast ${toast.type === "success" ? "toast-success" : "toast-error"}`}>
          <span>{toast.type === "success" ? "✓" : "✗"}</span>
          <span>{toast.text}</span>
        </div>
      )}
    </main>
  );
}
