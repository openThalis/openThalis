import { qs } from '../core/dom.js';
import { state } from '../core/state.js';
import { api } from '../data/api.js';
import { showToast } from '../ui/toast.js';

export function attachNewAndUploadHandlers(openPath, showPrompt, validateWindowsName) {
  // New actions dispatched by background context menu
  document.addEventListener('app:new', async (e) => {
    const type = e.detail && e.detail.type;
    if (type === 'folder') {
      const name = await showPrompt('New Folder', 'Folder name', '', validateWindowsName);
      if (!name) return;
      try {
        await api.mkdir(state.cwd, name);
        await openPath(state.cwd);
        showToast('Folder created', 'success');
      } catch (err) {
        showToast(String(err.message || err), 'error');
      }
    } else if (type === 'file') {
      const name = await showPrompt('New File', 'File name', 'New File', validateWindowsName);
      if (!name) return;
      try {
        await api.newfile(state.cwd, name);
        await openPath(state.cwd);
        showToast('File created', 'success');
      } catch (err) {
        showToast(String(err.message || err), 'error');
      }
    }
  });

  // Upload input setup
  let fileInput = qs('#file-input');
  if (!fileInput) {
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.id = 'file-input';
    document.body.appendChild(fileInput);
    fileInput.hidden = true;
  }

  const uploadBtn = qs('#upload-btn');
  if (uploadBtn) uploadBtn.addEventListener('click', () => { fileInput && fileInput.click(); });
  if (fileInput)
    fileInput.addEventListener('change', async () => {
      if (!fileInput.files || fileInput.files.length === 0) return;
      try {
        await api.upload(state.cwd, fileInput.files);
        await openPath(state.cwd);
        showToast('Upload complete', 'success');
      } catch (err) {
        showToast(String(err.message || err), 'error');
      } finally {
        fileInput.value = '';
      }
    });
}


