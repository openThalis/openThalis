import { state } from '../core/state.js';
import config from '/src/scaffold/shared/config/config.js';

function getBackendBaseUrl() {
  return config.getBackendUrlSync();
}

async function fetchJson(path, options) {
  const base = getBackendBaseUrl();
  const url = path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
  const res = await fetch(url, options);
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) throw new Error((data && (data.error || data.detail)) || `Request failed: ${res.status}`);
  return data;
}

export const api = {
  async home() {
    return fetchJson('/api/home');
  },
  async listdir(path) {
    const q = state.searchQuery ? `&q=${encodeURIComponent(state.searchQuery)}` : '';
    return fetchJson(`/api/listdir?path=${encodeURIComponent(path)}${q}`);
  },
  async drives() {
    return fetchJson('/api/drives');
  },
  async known() {
    return fetchJson('/api/knownfolders');
  },
  async mkdir(path, name) {
    return fetchJson('/api/mkdir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, name }),
    });
  },
  async newfile(path, name) {
    return fetchJson('/api/newfile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, name }),
    });
  },
  async rename(path, newName) {
    return fetchJson('/api/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, newName }),
    });
  },
  async del(path) {
    return fetchJson('/api/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
  },
  async upload(path, files) {
    const form = new FormData();
    for (const f of files) form.append('file', f, f.name);
    const base = getBackendBaseUrl();
    const res = await fetch(`${base}/api/upload?path=${encodeURIComponent(path)}`, { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to upload');
    return data;
  },
  async copy(sources, destination, overwrite = false) {
    return fetchJson('/api/copy', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sources, destination, overwrite }),
    });
  },
  async move(sources, destination, overwrite = false) {
    return fetchJson('/api/move', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sources, destination, overwrite }),
    });
  },
};


