import { commandRenameBtn, commandDeleteBtn, cutBtn, copyBtn, pasteBtn } from '../core/dom.js';
import { state } from '../core/state.js';
import { api } from '../data/api.js';
import { showToast } from '../ui/toast.js';

export function attachCommandBar(openPath, showConfirm, showPrompt, validateWindowsName) {
  if (commandRenameBtn)
    commandRenameBtn.addEventListener('click', async () => {
      if (state.selected.size !== 1) {
        showToast('Select one item to rename', 'error');
        return;
      }
      const path = Array.from(state.selected)[0];
      const name = path.split(/\\|\//).pop();
      const newName = await showPrompt('Rename', 'New name', name, validateWindowsName);
      if (!newName || newName === name) return;
      try {
        await api.rename(path, newName);
        await openPath(state.cwd);
        showToast('Renamed', 'success');
      } catch (e) {
        showToast(String(e.message || e), 'error');
      }
    });

  if (commandDeleteBtn)
    commandDeleteBtn.addEventListener('click', async () => {
      if (state.selected.size === 0) {
        showToast('Select items to delete', 'error');
        return;
      }
      
      // Extract file names from selected paths
      const selectedPaths = Array.from(state.selected);
      const fileNames = selectedPaths.map(path => path.split(/\\|\//).pop());
      
      // Format the confirmation message with file names
      let message;
      if (fileNames.length === 1) {
        message = `Delete "${fileNames[0]}"?`;
      } else if (fileNames.length <= 5) {
        // Show all file names if 5 or fewer
        const namesList = fileNames.map(name => `• ${name}`).join('\n');
        message = `Delete the following ${fileNames.length} items?\n\n${namesList}`;
      } else {
        // Show first 4 and indicate how many more
        const firstNames = fileNames.slice(0, 4).map(name => `• ${name}`).join('\n');
        const remaining = fileNames.length - 4;
        message = `Delete the following ${fileNames.length} items?\n\n${firstNames}\n• ... and ${remaining} more`;
      }
      
      const ok = await showConfirm('Delete', message);
      if (!ok) return;
      try {
        for (const p of selectedPaths) {
          await api.del(p);
        }
        await openPath(state.cwd);
        showToast('Deleted', 'success');
      } catch (e) {
        showToast(String(e.message || e), 'error');
      }
    });

  if (cutBtn)
    cutBtn.addEventListener('click', () => {
      if (state.selected.size === 0) {
        showToast('Select items to cut', 'error');
        return;
      }
      state.clipboard = { paths: Array.from(state.selected), cut: true };
      showToast('Cut to clipboard');
    });

  if (copyBtn)
    copyBtn.addEventListener('click', () => {
      if (state.selected.size === 0) {
        showToast('Select items to copy', 'error');
        return;
      }
      state.clipboard = { paths: Array.from(state.selected), cut: false };
      showToast('Copied to clipboard');
    });

  if (pasteBtn)
    pasteBtn.addEventListener('click', async () => {
      if (!state.clipboard.paths.length) {
        showToast('Clipboard is empty', 'error');
        return;
      }
      try {
        if (state.clipboard.cut) {
          await api.move(state.clipboard.paths, state.cwd, true);
          state.clipboard = { paths: [], cut: false };
        } else {
          await api.copy(state.clipboard.paths, state.cwd, true);
        }
        await openPath(state.cwd);
        showToast('Pasted', 'success');
      } catch (e) {
        showToast(String(e.message || e), 'error');
      }
    });
}


