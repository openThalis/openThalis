import httpClient from '/src/scaffold/components/shared/js/httpClient.js';

export async function testHttpClientConfig() {
  try {
    await httpClient.initialize();
  } catch (error) {
    console.error('Eido: Error testing httpClient config:', error);
  }
}

export async function fetchSettings() {
  const response = await httpClient.apiGet('/eido', { suppressReloadOn401: true });
  if (!response.ok) {
    let errorText = '';
    try { errorText = await response.text(); } catch {}
    throw new Error(`Failed to load eido: ${response.status}${errorText ? ` – ${errorText}` : ''}`);
  }
  const data = await response.json();
  return data?.settings || {};
}

export async function fetchSettingsList() {
  const response = await httpClient.apiGet('/eido/list', { suppressReloadOn401: true });
  if (!response.ok) {
    let errorText = '';
    try { errorText = await response.text(); } catch {}
    throw new Error(`Failed to load eido list: ${response.status}${errorText ? ` – ${errorText}` : ''}`);
  }
  const data = await response.json();
  return Array.isArray(data?.settings) ? data.settings : [];
}

export async function updateSettings(settings) {
  const response = await httpClient.apiPut('/eido', { settings }, { suppressReloadOn401: true });
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try { const data = await response.json(); message = data?.detail || message; } catch {}
    throw new Error(message);
  }
  try { return await response.json(); } catch { return {}; }
}

export async function resetAllSettings() {
  const response = await httpClient.apiDelete('/eido', { suppressReloadOn401: true });
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try { const data = await response.json(); message = data?.detail || message; } catch {}
    throw new Error(message);
  }
}

export async function deleteAgentKey(keyName) {
  const resp = await httpClient.apiDelete(`/eido/item?key_name=${encodeURIComponent(keyName)}`, { suppressReloadOn401: true });
  if (!resp.ok) {
    let msg = `HTTP ${resp.status}`;
    try { const data = await resp.json(); msg = data?.detail || msg; } catch {}
    throw new Error(msg);
  }
}




