function getBackendBaseUrl() {
  if (typeof window !== 'undefined') {
    if (window.__BACKEND_URL__) {
      return String(window.__BACKEND_URL__).replace(/\/$/, '');
    }
    try {
      if (window.top && window.top !== window && window.top.__BACKEND_URL__) {
        return String(window.top.__BACKEND_URL__).replace(/\/$/, '');
      }
    } catch {}
  }
  throw new Error('Backend URL is not configured');
}

function qs(sel, root = document) { return root.querySelector(sel); }

const editor = qs('#editor');
const fileNameEl = qs('#editor-filename');

let filePath = '';
let autoSaveTimer = null;
let fileChangeCheckTimer = null;
let lastKnownModTime = null;
let lastKnownContent = '';
let isReloading = false; // Flag to prevent external change detection during reload
const AUTO_SAVE_DELAY = 1000; // Save after 1 second of inactivity
const FILE_CHANGE_CHECK_INTERVAL = 2000; // Check for external changes every 2 seconds

async function ensureBackendUrl() {
  if (typeof window !== 'undefined' && window.__BACKEND_URL__) return;
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      if (data && data.backend_url) {
        window.__BACKEND_URL__ = String(data.backend_url);
      }
    }
  } catch {}
}

async function fetchText(path) {
  const base = getBackendBaseUrl();
  const url = `${base}/api/raw?path=${encodeURIComponent(path)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Failed to load file (${r.status})`);
  const text = await r.text();
  return text;
}

async function saveText(path, text) {
  const base = getBackendBaseUrl();
  const res = await fetch(`${base}/api/write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content: text })
  });
  if (!res.ok) {
    let data = null; try { data = await res.json(); } catch {}
    throw new Error((data && (data.error || data.detail)) || `Failed to save (${res.status})`);
  }
}

async function getFileProperties(path) {
  const base = getBackendBaseUrl();
  const res = await fetch(`${base}/api/properties?path=${encodeURIComponent(path)}`);
  if (!res.ok) {
    let data = null; try { data = await res.json(); } catch {}
    throw new Error((data && (data.error || data.detail)) || `Failed to get file properties (${res.status})`);
  }
  const data = await res.json();
  return {
    modifiedIso: data.modifiedIso,
    sizeBytes: data.sizeBytes
  };
}

async function autoSave() {
  if (!filePath || !editor.value) return;

  try {
    // Check for external changes before saving
    const currentProps = await getFileProperties(filePath);
    if (currentProps.modifiedIso !== lastKnownModTime) {
      showExternalChangeNotification(currentProps);
      return;
    }

    await saveText(filePath, editor.value);
    // Update our tracking after successful save
    lastKnownModTime = currentProps.modifiedIso;
    lastKnownContent = editor.value;
  } catch (e) {
    // Auto-save failed - could add user notification here
  }
}

function showExternalChangeNotification(fileProps) {
  // Create or update notification about external changes
  let notification = document.getElementById('external-change-notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'external-change-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--panel-2);
      border: 1px solid var(--danger);
      border-radius: 8px;
      padding: 12px;
      color: var(--text);
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      max-width: 300px;
      cursor: default;
    `;

    const message = document.createElement('div');
    message.textContent = 'File was modified externally';
    message.style.marginBottom = '8px';

    const reloadBtn = document.createElement('button');
    reloadBtn.textContent = 'Reload to latest version';
    reloadBtn.className = 'btn';
    reloadBtn.style.marginRight = '8px';
    reloadBtn.onclick = async () => {
      notification.remove();
      await reloadFile();
    };

    const dismissBtn = document.createElement('button');
    dismissBtn.textContent = 'Keep my changes';
    dismissBtn.className = 'btn btn-secondary';
    dismissBtn.onclick = () => {
      notification.remove();
    };

    notification.appendChild(message);
    notification.appendChild(reloadBtn);
    notification.appendChild(dismissBtn);
    document.body.appendChild(notification);

    // Auto-hide after 10 seconds
    setTimeout(() => notification.remove(), 10000);
  }
}

async function reloadFile() {
  try {
    isReloading = true;

    const text = await fetchText(filePath);

    // Update the editor content and force a UI refresh
    editor.value = text;
    lastKnownContent = text;

    // Force the textarea to update visually
    editor.dispatchEvent(new Event('input', { bubbles: true }));

    const props = await getFileProperties(filePath);
    lastKnownModTime = props.modifiedIso;
    if (autoSaveTimer) clearTimeout(autoSaveTimer);

    // Restart external change checking if it was stopped
    if (!fileChangeCheckTimer) {
      fileChangeCheckTimer = setInterval(checkForExternalChanges, FILE_CHANGE_CHECK_INTERVAL);
    }

    // Allow external change detection again after a short delay
    setTimeout(() => {
      isReloading = false;
    }, 500);

    // Show a brief success message
    const successMsg = document.createElement('div');
    successMsg.textContent = 'File reloaded from disk';
    successMsg.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #4CAF50;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      z-index: 1001;
      font-size: 14px;
    `;
    document.body.appendChild(successMsg);

    // Remove the success message after 2 seconds
    setTimeout(() => {
      if (successMsg.parentNode) {
        successMsg.parentNode.removeChild(successMsg);
      }
    }, 2000);
  } catch (e) {
    isReloading = false;
    // Show a simple alert since the notification was already removed
    alert('Failed to reload file: ' + e.message);
  }
}

// Cleanup timers on page unload
window.addEventListener('beforeunload', () => {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  if (fileChangeCheckTimer) clearInterval(fileChangeCheckTimer);
});

async function checkForExternalChanges() {
  if (!filePath || isReloading) {
    return;
  }

  try {
    const currentProps = await getFileProperties(filePath);

    // Check if modification time changed (use timestamp comparison instead of size)
    const timeChanged = currentProps.modifiedIso !== lastKnownModTime;
    const contentChanged = editor.value !== lastKnownContent;

    if (timeChanged && contentChanged) {
      showExternalChangeNotification(currentProps);
    } else if (timeChanged && !contentChanged) {
      // No unsaved changes, just reload quietly
      const text = await fetchText(filePath);
      if (text !== editor.value) { // Double-check content actually changed
        editor.value = text;
        lastKnownContent = text;
        lastKnownModTime = currentProps.modifiedIso;
      }
    }
  } catch (e) {
    // Ignore errors during external change checks
  }
}

function scheduleAutoSave() {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }
  autoSaveTimer = setTimeout(autoSave, AUTO_SAVE_DELAY);

  // Start external change checking if not already running
  if (!fileChangeCheckTimer) {
    fileChangeCheckTimer = setInterval(checkForExternalChanges, FILE_CHANGE_CHECK_INTERVAL);
  }
}

async function init() {
  try {
    const params = new URLSearchParams(location.search);
    filePath = params.get('path') || '';
    if (!filePath) {
      return;
    }
    const name = filePath.split(/\\|\//).pop();
    fileNameEl.textContent = name || 'File';
    // Ensure backend URL is available (supports setups without /config.js)
    await ensureBackendUrl();

    const text = await fetchText(filePath);
    editor.value = text;
    lastKnownContent = text;

    // Get initial file properties for change tracking
    const props = await getFileProperties(filePath);
    lastKnownModTime = props.modifiedIso;

    // Add auto-save listener
    editor.addEventListener('input', scheduleAutoSave);

    // Start external change detection
    fileChangeCheckTimer = setInterval(checkForExternalChanges, FILE_CHANGE_CHECK_INTERVAL);
  } catch (e) {
    // Initialization failed - could add user notification here
  }
}

init();


