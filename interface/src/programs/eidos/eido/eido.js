// Load backend URL if not available
if (!window.__BACKEND_URL__) {
  const script = document.createElement('script');
  script.src = '/config.js';
  document.head.appendChild(script);
}

import EidoManager, { createEidoManager as _createEidoManager } from './js/manager.js';

export default EidoManager;
export function createEidoManager() { return _createEidoManager(); }

const eidoManager = new EidoManager();
export { eidoManager };

