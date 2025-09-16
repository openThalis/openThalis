import { contextMenu, bgContextMenu } from '../core/dom.js';
import { state } from '../core/state.js';
import { qsa } from '../core/dom.js';
import { formatBytes } from '../core/utils.js';
import { updateStatus } from '../listing/render.js';

// Clipboard utility functions
async function copyToClipboard(text) {
  try {
    // Try the modern clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback for older browsers or non-secure contexts
    return copyToClipboardFallback(text);
  } catch {
    // If clipboard API fails, use fallback
    return copyToClipboardFallback(text);
  }
}

function copyToClipboardFallback(text) {
  try {
    // Create a temporary textarea element
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    
    // Select and copy the text
    textarea.focus();
    textarea.select();
    const success = document.execCommand('copy');
    
    // Clean up
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}


function getBackendBaseUrl() {
  if (typeof window !== 'undefined' && window.__BACKEND_URL__) {
    return String(window.__BACKEND_URL__).replace(/\/$/, '');
  }
  throw new Error('Backend URL is not configured');
}

export function attachContextMenuHandlers({ copyBtn, cutBtn, pasteBtn, commandRenameBtn, commandDeleteBtn, showAlert, fetchProperties, showToast }) {
  document.addEventListener('click', (e) => {
    if (contextMenu) contextMenu.hidden = true;
    if (bgContextMenu) bgContextMenu.hidden = true;
    // Do not hide dropdowns if the click occurred within the sort/view/new menu groups
    if (e.target && e.target.closest && e.target.closest('.menu-group')) return;
    document.querySelectorAll('.dropdown').forEach(d => d.hidden = true);
  });

  // Global contextmenu handler: decide which menu to show
  document.addEventListener('contextmenu', (e) => {
    const row = e.target.closest && e.target.closest('.row');
    if (row) return; // item menu is handled by row listener in render.js that calls openContextMenuAt
    // background context menu
    e.preventDefault();
    if (!bgContextMenu) return;
    // if clicked inside dropdowns or menus, ignore
    if (e.target && e.target.closest && (e.target.closest('.dropdown') || e.target.closest('.context-menu'))) return;
    state.selected.clear();
    qsa('.row').forEach(r => r.classList.remove('selected'));
    updateStatus();
    if (contextMenu) contextMenu.hidden = true;
    positionContextMenu(bgContextMenu, e.pageX, e.pageY);
  });

  if (!contextMenu && !bgContextMenu) return;
  contextMenu.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const cmd = b.getAttribute('data-cmd');
    contextMenu.hidden = true;
    if (cmd === 'open-new-tab') {
      const p = Array.from(state.selected)[0]; 
      if (!p) return;
      
      // Find the entry object from current entries
      const entry = state.currentEntries.find(e => e.path === p);
      if (!entry || !entry.isDir) return; // Only allow for folders
      
      try {
        const detail = { kind: 'folder', title: entry.name, src: `/src/programs/envs/local/local.html?path=${encodeURIComponent(p)}` };
        window.top && window.top.postMessage({ __thalis__: true, type: 'open-tab', detail }, '*');
      } catch {}
      return;
    }
    if (cmd === 'copy') copyBtn?.click();
    if (cmd === 'cut') cutBtn?.click();
    if (cmd === 'paste') pasteBtn?.click();
    if (cmd === 'copy-path') {
      const p = Array.from(state.selected)[0]; 
      if (!p) return;
      
      copyToClipboard(p).then(success => {
        if (success) {
          showToast('Path copied to clipboard', 'success');
        } else {
          showToast('Failed to copy path to clipboard', 'error');
        }
      }).catch(() => {
        showToast('Failed to copy path to clipboard', 'error');
      });
      return;
    }
    if (cmd === 'rename') commandRenameBtn?.click();
    if (cmd === 'delete') commandDeleteBtn?.click();
    if (cmd === 'properties') {
      const p = Array.from(state.selected)[0]; if (!p) return;
      try {
        const base = getBackendBaseUrl();
        const res = await fetch(`${base}/api/properties?path=${encodeURIComponent(p)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to get properties');
        await showAlert('Properties', `${data.name}\n${data.path}\nModified: ${data.modifiedIso}\nCreated: ${data.createdIso}\nType: ${data.isDir ? 'Folder' : (data.mimeType || 'File')}\nSize: ${data.sizeBytes != null ? formatBytes(data.sizeBytes) : ''}`);
      } catch (err) { showToast(String(err.message || err), 'error'); }
    }
  });

  if (bgContextMenu) bgContextMenu.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const cmd = b.getAttribute('data-cmd');
    bgContextMenu.hidden = true;
    if (cmd === 'bg-refresh') { if (state.cwd) location.href = location.href; }
    if (cmd === 'bg-paste') pasteBtn?.click();
    if (cmd === 'bg-copy-path') {
      const currentPath = state.cwd;
      if (!currentPath) return;
      
      copyToClipboard(currentPath).then(success => {
        if (success) {
          showToast('Current directory path copied to clipboard', 'success');
        } else {
          showToast('Failed to copy path to clipboard', 'error');
        }
      }).catch(() => {
        showToast('Failed to copy path to clipboard', 'error');
      });
      return;
    }
    if (cmd === 'bg-open-new-tab') {
      try {
        const title = (state.cwd || 'Folder').split(/\\|\//).pop() || 'Folder';
        const detail = { kind: 'folder', title, src: `/src/programs/envs/local/local.html?path=${encodeURIComponent(state.cwd || '')}` };
        window.top && window.top.postMessage({ __thalis__: true, type: 'open-tab', detail }, '*');
      } catch {}
    }
    if (cmd === 'bg-new-folder') {
      // use a custom event for new folder to be handled by index.js
      document.dispatchEvent(new CustomEvent('app:new', { detail: { type: 'folder' } }));
    }
    if (cmd === 'bg-new-file') {
      document.dispatchEvent(new CustomEvent('app:new', { detail: { type: 'file' } }));
    }
  });
}

// Helper function to position context menu within viewport bounds
function positionContextMenu(menu, x, y) {
  if (!menu) return;
  
  // Temporarily show menu to get its dimensions
  menu.style.visibility = 'hidden';
  menu.hidden = false;
  
  const rect = menu.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const padding = 8; // Minimum distance from viewport edge
  
  let finalX = x;
  let finalY = y;
  
  // Check horizontal overflow
  if (x + rect.width + padding > viewportWidth) {
    finalX = Math.max(padding, x - rect.width); // Position to the left of cursor
  }
  
  // Check vertical overflow  
  if (y + rect.height + padding > viewportHeight) {
    finalY = Math.max(padding, y - rect.height); // Position above cursor
  }
  
  // Ensure menu doesn't go off the left or top edge (with padding)
  finalX = Math.max(padding, finalX);
  finalY = Math.max(padding, finalY);
  
  // Final check: if menu is still too wide/tall for viewport, constrain it
  if (finalX + rect.width + padding > viewportWidth) {
    finalX = Math.max(padding, viewportWidth - rect.width - padding);
  }
  if (finalY + rect.height + padding > viewportHeight) {
    finalY = Math.max(padding, viewportHeight - rect.height - padding);
  }
  
  menu.style.left = finalX + 'px';
  menu.style.top = finalY + 'px';
  menu.style.visibility = 'visible';
  menu.hidden = false;
}

export function openContextMenuAt(x, y, path) {
  if (!contextMenu) return;
  if (path && !state.selected.has(path)) { 
    state.selected.clear(); 
    state.selected.add(path); 
    qsa('.row').forEach(r => r.classList.toggle('selected', state.selected.has(r.dataset.path))); 
  }
  
  // Show/hide "Open in new tab" button based on whether selected item is a folder
  const openNewTabBtn = contextMenu.querySelector('button[data-cmd="open-new-tab"]');
  if (openNewTabBtn && path) {
    const entry = state.currentEntries.find(e => e.path === path);
    openNewTabBtn.hidden = !entry || !entry.isDir;
  }
  
  positionContextMenu(contextMenu, x, y);
}


