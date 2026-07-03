// State variables
let allFiles = [];
let currentPath = ''; // e.g. "src/" or "" for root
let filteredFiles = [];

// DOM Elements
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const configWarning = document.getElementById('config-warning');
const uploadForm = document.getElementById('upload-form');
const fileInput = document.getElementById('file-input');
const fileSelectedName = document.getElementById('file-selected-name');
const dropZone = document.getElementById('drop-zone');
const uploadPath = document.getElementById('upload-path');
const customFilename = document.getElementById('custom-filename');
const uploadBtn = document.getElementById('upload-btn');
const searchInput = document.getElementById('search-input');
const refreshBtn = document.getElementById('refresh-btn');
const breadcrumbs = document.getElementById('breadcrumbs');
const fileListBody = document.getElementById('file-list-body');

// Progress Bar Elements
const progressContainer = document.getElementById('progress-container');
const progressFill = document.getElementById('progress-fill');
const progressStatus = document.getElementById('progress-status');
const progressPercent = document.getElementById('progress-percent');

// Modal Elements
const previewModal = document.getElementById('preview-modal');
const previewFilename = document.getElementById('preview-filename');
const previewMime = document.getElementById('preview-mime');
const previewBody = document.getElementById('preview-body');
const previewCloseBtn = document.getElementById('preview-close-btn');
const previewIcon = document.getElementById('preview-icon');
const codeContent = document.getElementById('code-content');
const imageView = document.getElementById('image-view');
const binaryView = document.getElementById('binary-view');
const previewCopyRawBtn = document.getElementById('preview-copy-raw-btn');
const previewOpenRawBtn = document.getElementById('preview-open-raw-btn');

// Initialize Lucide Icons
function initIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Inject Toast styling and container dynamically
const toastStyle = document.createElement('style');
toastStyle.textContent = `
  .toast-container {
    position: fixed;
    bottom: 24px;
    right: 24px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    z-index: 9999;
  }
  .toast {
    background: rgba(22, 27, 34, 0.95);
    border: 1px solid var(--border-color);
    padding: 12px 20px;
    border-radius: var(--radius-md);
    color: var(--text-main);
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.9rem;
    box-shadow: 0 8px 16px rgba(0,0,0,0.5);
    min-width: 280px;
    backdrop-filter: blur(10px);
    transform: translateY(20px);
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  }
  .toast.show {
    transform: translateY(0);
    opacity: 1;
  }
  .toast-success { border-left: 4px solid #10b981; }
  .toast-error { border-left: 4px solid #ef4444; }
  .toast-info { border-left: 4px solid #6366f1; }
  .toast i { width: 18px; height: 18px; }
  .toast-success i { color: #10b981; }
  .toast-error i { color: #ef4444; }
  .toast-info i { color: #6366f1; }
`;
document.head.appendChild(toastStyle);

const toastContainer = document.createElement('div');
toastContainer.className = 'toast-container';
document.body.appendChild(toastContainer);

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconName = 'check-circle';
  if (type === 'error') iconName = 'alert-circle';
  if (type === 'info') iconName = 'info';

  toast.innerHTML = `
    <i data-lucide="${iconName}"></i>
    <span>${message}</span>
  `;
  
  toastContainer.appendChild(toast);
  initIcons();

  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10);

  // Remove toast
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
  fetchFiles();
  setupEventListeners();
  initIcons();
});

// Setup Events
function setupEventListeners() {
  // Drag & drop handlers
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
    }, false);
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      fileInput.files = files;
      updateFileLabel(files[0].name);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      updateFileLabel(fileInput.files[0].name);
    }
  });

  // Form submission
  uploadForm.addEventListener('submit', handleUpload);

  // Search input
  searchInput.addEventListener('input', () => {
    renderFiles();
  });

  // Refresh
  refreshBtn.addEventListener('click', fetchFiles);

  // Close preview modal
  previewCloseBtn.addEventListener('click', closePreview);
  previewModal.addEventListener('click', (e) => {
    if (e.target === previewModal) closePreview();
  });

  // Breadcrumbs navigation
  breadcrumbs.addEventListener('click', (e) => {
    if (e.target.classList.contains('breadcrumb-item')) {
      const targetPath = e.target.getAttribute('data-path');
      navigateToFolder(targetPath);
    }
  });
}

function updateFileLabel(name) {
  fileSelectedName.textContent = name;
  fileSelectedName.style.display = 'inline-block';
}

// Navigate to folder
function navigateToFolder(path) {
  currentPath = path;
  renderBreadcrumbs();
  renderFiles();
}

// Render Breadcrumbs
function renderBreadcrumbs() {
  breadcrumbs.innerHTML = '';
  
  // Root breadcrumb
  const rootSpan = document.createElement('span');
  rootSpan.className = 'breadcrumb-item root';
  rootSpan.setAttribute('data-path', '');
  rootSpan.textContent = 'root';
  breadcrumbs.appendChild(rootSpan);

  if (currentPath) {
    const parts = currentPath.split('/').filter(p => p);
    let accumPath = '';
    
    parts.forEach(part => {
      accumPath += part + '/';
      
      const item = document.createElement('span');
      item.className = 'breadcrumb-item';
      item.setAttribute('data-path', accumPath);
      item.textContent = part;
      breadcrumbs.appendChild(item);
    });
  }
  initIcons();
}

// Fetch Files
async function fetchFiles() {
  showLoader();
  try {
    const res = await fetch('/api/files');
    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }
    const data = await res.json();
    
    allFiles = data.files || [];
    
    // Check credentials warning
    if (allFiles.length === 0 && data.error) {
      configWarning.classList.remove('hidden');
    } else {
      configWarning.classList.add('hidden');
    }

    statusDot.className = 'indicator-dot connected';
    statusText.textContent = 'Connected to Cloudflare R2';
    
    renderBreadcrumbs();
    renderFiles();
  } catch (error) {
    console.error('Fetch error:', error);
    statusDot.className = 'indicator-dot error';
    statusText.textContent = 'Connection Error';
    showErrorRow('Failed to load files from server. Is it running?');
    showToast('Failed to fetch files from server', 'error');
  }
}

// Loader state
function showLoader() {
  fileListBody.innerHTML = `
    <tr class="state-row">
      <td colspan="5">
        <div class="table-loader">
          <div class="spinner"></div>
          <p>Loading files from Cloudflare R2...</p>
        </div>
      </td>
    </tr>
  `;
}

// Error state
function showErrorRow(msg) {
  fileListBody.innerHTML = `
    <tr class="state-row">
      <td colspan="5">
        <div class="table-empty">
          <i data-lucide="alert-octagon" style="color: #ef4444;"></i>
          <p style="color: #fca5a5;">${msg}</p>
        </div>
      </td>
    </tr>
  `;
  initIcons();
}

// Render Files and virtual folder hierarchy
function renderFiles() {
  const searchQuery = searchInput.value.toLowerCase().trim();
  
  // 1. Group files by virtual folders for currentPath
  const items = new Map(); // key -> { isFolder: bool, fileObj: object }
  
  allFiles.forEach(file => {
    const key = file.key;
    
    // If not matching search query (globally), skip
    if (searchQuery && !key.toLowerCase().includes(searchQuery)) {
      return;
    }

    // If searching, we display flat structure of matching files instead of folder drilldown
    if (searchQuery) {
      items.set(key, { isFolder: false, fileObj: file });
      return;
    }

    // Folder drilldown routing (default behavior)
    // Check if key belongs to current folder path
    if (currentPath === '' || key.startsWith(currentPath)) {
      const relativePart = currentPath === '' ? key : key.slice(currentPath.length);
      
      if (!relativePart) return; // Exact match of directory name if it has a placeholder file
      
      const parts = relativePart.split('/');
      
      if (parts.length > 1) {
        // It's a directory
        const folderName = parts[0];
        const folderKey = currentPath + folderName + '/';
        
        if (!items.has(folderKey)) {
          items.set(folderKey, { 
            isFolder: true, 
            name: folderName,
            key: folderKey
          });
        }
      } else {
        // It's a file in the current directory
        const fileName = parts[0];
        items.set(key, { 
          isFolder: false, 
          name: fileName,
          fileObj: file 
        });
      }
    }
  });

  // Sort: folders first, then files (alphabetical)
  const sortedItems = Array.from(items.values()).sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;
    return a.name.localeCompare(b.name);
  });

  if (sortedItems.length === 0) {
    fileListBody.innerHTML = `
      <tr class="state-row">
        <td colspan="5">
          <div class="table-empty">
            <i data-lucide="folder-open"></i>
            <p>No files or folders found here.</p>
            <span class="sub-text">Upload a file on the left to get started.</span>
          </div>
        </td>
      </tr>
    `;
    initIcons();
    return;
  }

  fileListBody.innerHTML = '';
  
  sortedItems.forEach(item => {
    const row = document.createElement('tr');
    row.className = 'file-row';
    
    if (item.isFolder) {
      // Render Folder Row
      row.innerHTML = `
        <td class="file-name-cell" data-action="folder" data-path="${item.key}">
          <i data-lucide="folder" class="folder-icon"></i>
          <span class="file-name-txt">${item.name}/</span>
        </td>
        <td>Directory</td>
        <td>--</td>
        <td>--</td>
        <td class="cell-actions">
          <button class="action-btn" data-action="navigate" data-path="${item.key}" title="Explore folder">
            <i data-lucide="chevron-right"></i>
          </button>
        </td>
      `;
    } else {
      // Render File Row
      const f = item.fileObj;
      const cleanKey = f.key;
      const name = item.name;
      const sizeStr = formatBytes(f.size);
      const dateStr = formatDate(f.lastModified);
      const rawUrl = `${window.location.origin}/api/raw/v1/${cleanKey}`;
      
      const iconDetails = getFileIcon(name, f.mimeType);

      row.innerHTML = `
        <td class="file-name-cell" data-action="preview" data-key="${cleanKey}">
          <i data-lucide="${iconDetails.icon}" class="file-icon ${iconDetails.class}"></i>
          <span class="file-name-txt" title="${cleanKey}">${name}</span>
        </td>
        <td title="${f.mimeType}">${truncate(f.mimeType, 20)}</td>
        <td>${sizeStr}</td>
        <td>${dateStr}</td>
        <td class="cell-actions">
          <button class="action-btn" data-action="copy" data-url="${rawUrl}" title="Copy Raw Link">
            <i data-lucide="copy"></i>
          </button>
          <a href="${rawUrl}" target="_blank" class="action-btn" title="Open Raw File">
            <i data-lucide="external-link"></i>
          </a>
          <button class="action-btn delete" data-action="delete" data-key="${cleanKey}" title="Delete File">
            <i data-lucide="trash-2"></i>
          </button>
        </td>
      `;
    }
    
    fileListBody.appendChild(row);
  });

  initIcons();
  setupRowActions();
}

// Row Event Listeners
function setupRowActions() {
  fileListBody.querySelectorAll('[data-action="folder"], [data-action="navigate"]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const path = el.getAttribute('data-path');
      navigateToFolder(path);
    });
  });

  fileListBody.querySelectorAll('[data-action="preview"]').forEach(el => {
    el.addEventListener('click', (e) => {
      const key = el.getAttribute('data-key');
      openPreview(key);
    });
  });

  fileListBody.querySelectorAll('[data-action="copy"]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const url = el.getAttribute('data-url');
      navigator.clipboard.writeText(url).then(() => {
        showToast('Raw URL copied to clipboard!');
      }).catch(err => {
        showToast('Failed to copy link', 'error');
      });
    });
  });

  fileListBody.querySelectorAll('[data-action="delete"]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = el.getAttribute('data-key');
      if (confirm(`Are you sure you want to delete "${key}" from Cloudflare R2?`)) {
        deleteFile(key);
      }
    });
  });
}

// Upload Handler
async function handleUpload(e) {
  e.preventDefault();
  
  const files = fileInput.files;
  if (files.length === 0) {
    showToast('Please select a file to upload', 'error');
    return;
  }
  
  const file = files[0];
  const formData = new FormData();
  formData.append('file', file);
  
  // Set custom path and custom name if provided
  let pathVal = uploadPath.value.trim();
  if (pathVal) {
    formData.append('path', pathVal);
  } else if (currentPath) {
    formData.append('path', currentPath);
  }

  const customNameVal = customFilename.value.trim();
  if (customNameVal) {
    formData.append('filename', customNameVal);
  }

  // UI state for uploading
  uploadBtn.disabled = true;
  progressContainer.classList.remove('hidden');
  progressFill.style.width = '0%';
  progressPercent.textContent = '0%';
  progressStatus.textContent = 'Uploading to R2...';

  // Use XMLHttpRequest to track progress
  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/upload', true);

  xhr.upload.onprogress = (event) => {
    if (event.lengthComputable) {
      const percentComplete = Math.round((event.loaded / event.total) * 100);
      progressFill.style.width = percentComplete + '%';
      progressPercent.textContent = percentComplete + '%';
      if (percentComplete === 100) {
        progressStatus.textContent = 'Finalizing object upload...';
      }
    }
  };

  xhr.onload = () => {
    uploadBtn.disabled = false;
    progressContainer.classList.add('hidden');
    
    if (xhr.status === 200) {
      const response = JSON.parse(xhr.responseText);
      showToast('File uploaded successfully!');
      uploadForm.reset();
      fileSelectedName.textContent = 'No file selected';
      fetchFiles();
    } else {
      let errorMsg = 'Upload failed';
      try {
        const response = JSON.parse(xhr.responseText);
        errorMsg = response.error || errorMsg;
      } catch (err) {}
      showToast(errorMsg, 'error');
      console.error('Upload fail:', xhr.responseText);
    }
  };

  xhr.onerror = () => {
    uploadBtn.disabled = false;
    progressContainer.classList.add('hidden');
    showToast('Network error during upload', 'error');
  };

  xhr.send(formData);
}

// Delete Handler
async function deleteFile(key) {
  try {
    const res = await fetch(`/api/files/${encodeURIComponent(key)}`, {
      method: 'DELETE'
    });
    const result = await res.json();
    if (res.ok && result.success) {
      showToast('File deleted successfully');
      fetchFiles();
    } else {
      showToast(result.error || 'Failed to delete file', 'error');
    }
  } catch (error) {
    showToast('Network error deleting file', 'error');
    console.error(error);
  }
}

// Open Preview Modal
async function openPreview(key) {
  const file = allFiles.find(f => f.key === key);
  if (!file) return;

  const rawUrl = `${window.location.origin}/api/raw/v1/${key}`;
  
  previewFilename.textContent = key.split('/').pop();
  previewMime.textContent = file.mimeType;
  
  // Set link actions
  previewOpenRawBtn.href = rawUrl;
  previewCopyRawBtn.onclick = () => {
    navigator.clipboard.writeText(rawUrl).then(() => {
      showToast('Raw URL copied!');
    });
  };

  // Reset preview content states
  codeContent.textContent = '';
  imageView.classList.add('hidden');
  binaryView.classList.add('hidden');
  document.querySelector('.code-view').classList.add('hidden');
  
  // Determine file class
  const iconDetails = getFileIcon(key, file.mimeType);
  previewIcon.setAttribute('data-lucide', iconDetails.icon);
  
  previewModal.classList.remove('hidden');
  initIcons();

  // Try previewing based on MIME type or file extension
  const mimeType = file.mimeType.toLowerCase();
  
  if (mimeType.startsWith('image/')) {
    imageView.classList.remove('hidden');
    imageView.querySelector('img').src = rawUrl;
  } else if (
    mimeType.startsWith('text/') || 
    mimeType === 'application/javascript' || 
    mimeType === 'application/json' ||
    mimeType === 'application/xml' ||
    key.endsWith('.md') || 
    key.endsWith('.js') || 
    key.endsWith('.css') || 
    key.endsWith('.html') || 
    key.endsWith('.json') || 
    key.endsWith('.yml') || 
    key.endsWith('.yaml') || 
    key.endsWith('.sh') ||
    key.endsWith('.py') ||
    key.endsWith('.go') ||
    key.endsWith('.ts')
  ) {
    // It's a text-based file, fetch content
    codeContent.textContent = 'Loading file content...';
    document.querySelector('.code-view').classList.remove('hidden');
    
    try {
      const res = await fetch(rawUrl);
      if (res.ok) {
        const text = await res.text();
        // Capping preview size to 500KB to prevent page lag
        if (text.length > 500 * 1024) {
          codeContent.textContent = text.slice(0, 500 * 1024) + '\n\n... [Truncated! File is too large to preview completely]';
        } else {
          codeContent.textContent = text;
        }
      } else {
        codeContent.textContent = `Error fetching preview content: HTTP ${res.status}`;
      }
    } catch (err) {
      codeContent.textContent = `Error fetching preview content: ${err.message}`;
    }
  } else {
    // Binary or unsupported type
    binaryView.classList.remove('hidden');
  }
}

function closePreview() {
  previewModal.classList.add('hidden');
}

// Helpers
function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function truncate(str, n) {
  return (str.length > n) ? str.slice(0, n - 1) + '...' : str;
}

// Map file types to appropriate lucide icons
function getFileIcon(filename, mimeType) {
  const ext = filename.split('.').pop().toLowerCase();
  
  if (mimeType.startsWith('image/')) {
    return { icon: 'file-image', class: 'image' };
  }
  
  const codeExts = ['html', 'css', 'js', 'jsx', 'ts', 'tsx', 'py', 'go', 'sh', 'json', 'yml', 'yaml', 'md', 'xml', 'c', 'cpp', 'h', 'cs', 'java', 'php', 'rb'];
  if (codeExts.includes(ext) || mimeType.startsWith('text/') || mimeType === 'application/javascript' || mimeType === 'application/json') {
    return { icon: 'file-code', class: 'code' };
  }
  
  const archiveExts = ['zip', 'tar', 'gz', 'rar', '7z', 'bz2'];
  if (archiveExts.includes(ext)) {
    return { icon: 'file-archive', class: 'archive' };
  }
  
  const videoExts = ['mp4', 'mkv', 'avi', 'mov', 'webm'];
  if (videoExts.includes(ext) || mimeType.startsWith('video/')) {
    return { icon: 'file-video', class: 'video' };
  }
  
  const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'm4a'];
  if (audioExts.includes(ext) || mimeType.startsWith('audio/')) {
    return { icon: 'file-audio', class: 'audio' };
  }

  return { icon: 'file', class: '' };
}
