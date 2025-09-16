import { collectFilesFromItems } from '../core/utils.js';
import { state } from '../core/state.js';
import { api } from '../data/api.js';
import { showToast } from '../ui/toast.js';

export function attachDropHandlers(openPath) {
  // Internal DnD move/copy completion
  document.addEventListener('app:internal-drop', async (e) => {
    const { destination, sources, copy } = e.detail || {};
    if (!destination || !Array.isArray(sources) || sources.length === 0) return;
    try {
      if (copy) await api.copy(sources, destination, true);
      else await api.move(sources, destination, true);
      await openPath(state.cwd);
      showToast(copy ? 'Copied' : 'Moved', 'success');
    } catch (err) {
      showToast(String(err.message || err), 'error');
    }
  });

  // Upload from rendered areas
  document.addEventListener('app:upload-drop', async (e) => {
    let { files, path } = e.detail || {};
    if (!files || !files.length) return;
    const dest = path || state.cwd;
    try {
      await api.upload(dest, files);
      await openPath(dest);
      showToast('Upload complete', 'success');
    } catch (err) {
      showToast(String(err.message || err), 'error');
    }
  });

  // Global dragover/drop from OS
  document.addEventListener('dragover', (e) => {
    if (!e.dataTransfer) return;
    const hasPaths = e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('text/paths');
    if (!hasPaths) e.preventDefault();
  });
  document.addEventListener('drop', async (e) => {
    if (!e.dataTransfer) return;
    const hasPaths = e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('text/paths');
    if (hasPaths) return; // internal drop handled elsewhere
    if (e.dataTransfer.items && e.dataTransfer.items.length) {
      e.preventDefault();
      const files = await collectFilesFromItems(e.dataTransfer.items);
      if (files && files.length) {
        document.dispatchEvent(new CustomEvent('app:upload-drop', { detail: { files } }));
      }
    }
  });
}


