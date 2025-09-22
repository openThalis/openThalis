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
const saveBtn = qs('#save-btn');
const downloadBtn = qs('#download-btn');
const fileNameEl = qs('#editor-filename');
const filePathEl = qs('#editor-path');
const statusbar = qs('#statusbar');

let filePath = '';
let originalText = '';

function setStatus(msg) {
  if (statusbar) statusbar.textContent = msg;
}

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

async function init() {
  try {
    const params = new URLSearchParams(location.search);
    filePath = params.get('path') || '';
    if (!filePath) { setStatus('Missing file path'); return; }
    const name = filePath.split(/\\|\//).pop();
    fileNameEl.textContent = name || 'File';
    filePathEl.textContent = filePath;
    // Ensure backend URL is available (supports setups without /config.js)
    await ensureBackendUrl();
    downloadBtn.href = `${getBackendBaseUrl()}/api/raw?path=${encodeURIComponent(filePath)}`;
    setStatus('Loading...');
    const text = await fetchText(filePath);
    originalText = text;
    editor.value = text;
    setStatus('Ready');
  } catch (e) {
    setStatus(String(e.message || e));
  }
}

if (saveBtn) saveBtn.addEventListener('click', async () => {
  if (!filePath) return;
  try {
    setStatus('Saving...');
    await saveText(filePath, editor.value);
    originalText = editor.value;
    setStatus('Saved');
  } catch (e) {
    setStatus(String(e.message || e));
  }
});

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    saveBtn?.click();
  }
});

init();


