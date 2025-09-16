import { errorEl, listingEl, qsa } from '../core/dom.js';
import { state, suppressHistoryNavigation, setSuppressHistoryNavigation } from '../core/state.js';
import { api } from '../data/api.js';
import { buildBreadcrumb } from '../navigation/breadcrumb.js';
import { renderListing, updateStatus } from './render.js';
import { setBusy } from '../core/utils.js';
import { pushHistory } from '../navigation/history.js';
import { handleSelection } from './selection.js';

// Clear selection when clicking on empty space within the listing
if (listingEl) {
  listingEl.addEventListener('click', (e) => {
    const isRow = e.target && e.target.closest && e.target.closest('.row');
    if (!isRow) {
      state.selected.clear();
      qsa('.row').forEach((r) => r.classList.remove('selected'));
      updateStatus();
    }
  });
}

export async function openPath(path) {
  setBusy(true);
  if (errorEl) { errorEl.hidden = true; errorEl.textContent = ''; }
  try {
    const data = await api.listdir(path);
    state.cwd = data.path;
    // Notify parent to update tab title to the current folder name
    try {
      const isWindows = state.cwd.includes('\\');
      let name = '';
      if (isWindows) {
        const trimmed = state.cwd.replace(/[\\/]+$/, '');
        const parts = trimmed.split('\\').filter(Boolean);
        name = parts.length ? parts[parts.length - 1] : trimmed;
      } else {
        const trimmed = state.cwd.replace(/[\\/]+$/, '/');
        const parts = trimmed.split('/').filter(Boolean);
        name = parts.length ? parts[parts.length - 1] : '/';
      }
      if (name) { window.top && window.top.postMessage({ __thalis__: true, type: 'update-tab-title', title: name }, '*'); }
    } catch {}

    // Update the iframe URL to reflect the current path for drag & drop preservation
    try {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('path', state.cwd);
      window.history.replaceState(null, '', newUrl.toString());

      
      // Also update the exposed state for drag & drop preservation
      if (window.localState) {
        window.localState.cwd = state.cwd;

      }
    } catch (urlError) {
      console.warn('Could not update URL for path preservation:', urlError);
    }

    if (suppressHistoryNavigation) {
      setSuppressHistoryNavigation(false);
    } else {
      pushHistory(state.cwd);
    }
    buildBreadcrumb(state.cwd, openPath);
    state.currentEntries = data.entries || [];
    renderListing(data.entries || [], listingEl, handleSelection, openPath);
    state.selected.clear();
  } catch (err) {
    if (errorEl) {
      errorEl.hidden = false;
      const msg = String(err.message || err);
      errorEl.textContent = msg;
    }
  } finally {
    setBusy(false);
  }
}


