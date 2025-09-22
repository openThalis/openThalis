// Load backend URL if not available
if (!window.__BACKEND_URL__) {
  const script = document.createElement('script');
  script.src = '/config.js';
  document.head.appendChild(script);
}

import SettingsManager, { createSettingsManager as _createSettingsManager } from './js/manager.js';

export default SettingsManager;
export function createSettingsManager() {
  return _createSettingsManager();
}

const settingsManager = new SettingsManager();

// Make settingsManager globally available for debugging
window.settingsManager = settingsManager;

export { settingsManager };


