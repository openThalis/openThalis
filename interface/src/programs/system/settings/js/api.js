import httpClient from '/src/scaffold/shared/utils/http/httpClient.js';

export async function testHttpClientConfig() {
  try {
    await httpClient.initialize();
  } catch (error) {
    console.error('Settings: Error testing httpClient config:', error);
  }
}

export async function fetchSettings() {
  const response = await httpClient.apiGet('/settings');
  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Failed to load settings: ${response.status}${errorData ? ` – ${errorData}` : ''}`);
  }
  const data = await response.json();
  return data?.settings || {};
}

export async function updateSettings(settings) {
  const response = await httpClient.apiPut('/settings', { settings });
  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData?.detail || errorMessage;
    } catch {}
    throw new Error(errorMessage);
  }
  return response.json();
}

export async function resetAllSettings() {
  const response = await httpClient.apiDelete('/settings');
  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData?.detail || errorMessage;
    } catch {}
    throw new Error(errorMessage);
  }
}

export async function deleteSettingItem(keyName) {
  const resp = await httpClient.apiDelete(`/settings/item?key_name=${encodeURIComponent(keyName)}`);
  if (!resp.ok) {
    let message = `HTTP ${resp.status}`;
    try {
      const data = await resp.json();
      message = data?.detail || message;
    } catch {}
    throw new Error(message);
  }
}

export async function renameSettingKey(oldKeyName, newKeyName) {
  const resp = await httpClient.apiPost('/settings/rename', {
    old_key_name: oldKeyName,
    new_key_name: newKeyName,
  });
  if (!resp.ok) {
    let message = `HTTP ${resp.status}`;
    try {
      const data = await resp.json();
      message = data?.detail || message;
    } catch {}
    throw new Error(message);
  }
}


