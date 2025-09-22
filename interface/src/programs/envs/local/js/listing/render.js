import { qsa } from '../core/dom.js';
import { computeType, iconFor } from './types.js';
import { formatBytes } from '../core/utils.js';
import { state } from '../core/state.js';
import { openContextMenuAt } from '../ui/contextMenu.js';

export function clearListing(listingEl) { listingEl.innerHTML = ''; }

// Event delegation for better performance
function attachEventDelegation(container, handleSelection, openPath) {
  // Use event delegation for better performance
  container.addEventListener('click', (ev) => {
    const row = ev.target.closest('.row');
    if (!row) return;
    
    const idx = parseInt(row.dataset.index) || 0;
    const path = row.dataset.path;
    if (path) {
      handleSelection(ev, idx, path);
    }
  });

  container.addEventListener('dblclick', (ev) => {
    const row = ev.target.closest('.row');
    if (!row) return;
    
    const path = row.dataset.path;
    const isDir = row.dataset.isDir === 'true';
    if (path) {
      if (isDir) {
        openPath(path);
      } else {
        // Find the entry object for opening
        const entry = state.currentEntries.find(e => e.path === path);
        if (entry) openByType(entry);
      }
    }
  });

  container.addEventListener('auxclick', (ev) => {
    if (ev.button === 1) {
      const row = ev.target.closest('.row');
      if (!row) return;
      
      const path = row.dataset.path;
      const isDir = row.dataset.isDir === 'true';
      if (path && isDir) {
        ev.preventDefault();
        const entry = state.currentEntries.find(e => e.path === path);
        if (entry) openFolderInNewTab(entry);
      }
    }
  });

  container.addEventListener('contextmenu', (ev) => {
    const row = ev.target.closest('.row');
    if (!row) return;
    
    ev.preventDefault();
    const path = row.dataset.path;
    if (path) {
      openContextMenuAt(ev.pageX, ev.pageY, path);
    }
  });

  // Drag and drop with event delegation
  container.addEventListener('dragstart', (ev) => {
    const row = ev.target.closest('.row');
    if (!row) return;
    
    const path = row.dataset.path;
    if (path) {
      const paths = state.selected.has(path) && state.selected.size > 0 ? Array.from(state.selected) : [path];
      ev.dataTransfer?.setData('text/paths', JSON.stringify(paths));
      ev.dataTransfer?.setData('text/plain', paths.join('\n'));
      if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'copyMove';
    }
  });

  container.addEventListener('dragover', (ev) => {
    const row = ev.target.closest('.row');
    if (row && row.dataset.isDir === 'true') {
      ev.preventDefault();
      if (ev.dataTransfer) ev.dataTransfer.dropEffect = ev.ctrlKey ? 'copy' : 'move';
    }
  });

  container.addEventListener('drop', (ev) => {
    const row = ev.target.closest('.row');
    if (!row || row.dataset.isDir !== 'true') return;
    
    ev.preventDefault();
    const text = ev.dataTransfer?.getData('text/paths');
    if (!text) return;
    
    try {
      const paths = JSON.parse(text);
      document.dispatchEvent(new CustomEvent('app:internal-drop', { 
        detail: { destination: row.dataset.path, sources: paths, copy: ev.ctrlKey } 
      }));
    } catch {}
  });
}

export function renderDetails(entries, listingEl, handleSelection, openPath) {
  clearListing(listingEl);
  const emptyEl = document.querySelector('#empty');
  if (emptyEl) emptyEl.hidden = entries.length !== 0;
  
  // Virtual scrolling for large directories (performance optimization)
  if (entries.length > 1000) {
    renderVirtualList(entries, listingEl, handleSelection, openPath);
    return;
  }
  
  const container = document.createElement('div');
  container.className = 'rows';
  
  // Drag & drop upload/move support: allow dropping into empty area for upload
  container.addEventListener('dragover', (e) => {
    e.preventDefault();
  });
  container.addEventListener('drop', (e) => {
    e.preventDefault();
    const dt = e.dataTransfer;
    if (!dt) return;
    // If files from OS are dropped, dispatch an event to index.js to upload
    if (dt.files && dt.files.length) {
      document.dispatchEvent(new CustomEvent('app:upload-drop', { detail: { files: dt.files } }));
    }
  });

  // Use DocumentFragment for better performance
  const fragment = document.createDocumentFragment();
  
  entries.forEach((e, idx) => {
    const row = document.createElement('div');
    row.className = 'row';
    row.dataset.path = e.path;
    row.dataset.isDir = e.isDir ? 'true' : 'false';
    row.dataset.index = idx.toString();
    row.setAttribute('draggable', 'true');
    if (state.selected.has(e.path)) row.classList.add('selected');

    const nameCell = document.createElement('div');
    nameCell.className = 'cell name';
    const icon = document.createElement('span');
    icon.className = 'file-icon';
    icon.textContent = iconFor(e);
    const nameText = document.createElement('span');
    nameText.textContent = e.name;
    nameCell.appendChild(icon); 
    nameCell.appendChild(nameText);

    const modCell = document.createElement('div');
    modCell.className = 'cell';
    modCell.textContent = (e.modifiedIso || '').replace('T', ' ');

    const typeCell = document.createElement('div');
    typeCell.className = 'cell';
    typeCell.textContent = computeType(e);

    const sizeCell = document.createElement('div');
    sizeCell.className = 'cell';
    sizeCell.textContent = e.isDir ? '' : formatBytes(e.sizeBytes);

    row.appendChild(nameCell);
    row.appendChild(modCell);
    row.appendChild(typeCell);
    row.appendChild(sizeCell);

    fragment.appendChild(row);
  });
  
  container.appendChild(fragment);
  listingEl.appendChild(container);
  
  // Attach event delegation for better performance
  attachEventDelegation(container, handleSelection, openPath);
}

// Virtual scrolling for large directories
function renderVirtualList(entries, listingEl, handleSelection, openPath) {
  const container = document.createElement('div');
  container.className = 'rows virtual-list';
  container.style.height = `${entries.length * 40}px`; // Approximate height
  
  // Create a viewport container
  const viewport = document.createElement('div');
  viewport.style.position = 'relative';
  viewport.style.height = '100%';
  viewport.style.overflow = 'auto';
  
  // Drag & drop support
  viewport.addEventListener('dragover', (e) => e.preventDefault());
  viewport.addEventListener('drop', (e) => {
    e.preventDefault();
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length) {
      document.dispatchEvent(new CustomEvent('app:upload-drop', { detail: { files: dt.files } }));
    }
  });
  
  // Virtual scrolling implementation
  const itemHeight = 40; // Approximate row height
  const visibleItems = Math.ceil(listingEl.clientHeight / itemHeight) + 10; // Buffer
  
  let startIndex = 0;
  let endIndex = Math.min(visibleItems, entries.length);
  
  function renderVisibleItems() {
    const fragment = document.createDocumentFragment();
    
    for (let i = startIndex; i < endIndex; i++) {
      const e = entries[i];
      const row = document.createElement('div');
      row.className = 'row';
      row.dataset.path = e.path;
      row.dataset.isDir = e.isDir ? 'true' : 'false';
      row.dataset.index = i.toString();
      row.setAttribute('draggable', 'true');
      row.style.position = 'absolute';
      row.style.top = `${i * itemHeight}px`;
      row.style.width = '100%';
      
      if (state.selected.has(e.path)) row.classList.add('selected');

      const nameCell = document.createElement('div');
      nameCell.className = 'cell name';
      const icon = document.createElement('span');
      icon.className = 'file-icon';
      icon.textContent = iconFor(e);
      const nameText = document.createElement('span');
      nameText.textContent = e.name;
      nameCell.appendChild(icon); 
      nameCell.appendChild(nameText);

      const modCell = document.createElement('div');
      modCell.className = 'cell';
      modCell.textContent = (e.modifiedIso || '').replace('T', ' ');

      const typeCell = document.createElement('div');
      typeCell.className = 'cell';
      typeCell.textContent = computeType(e);

      const sizeCell = document.createElement('div');
      sizeCell.className = 'cell';
      sizeCell.textContent = e.isDir ? '' : formatBytes(e.sizeBytes);

      row.appendChild(nameCell);
      row.appendChild(modCell);
      row.appendChild(typeCell);
      row.appendChild(sizeCell);

      fragment.appendChild(row);
    }
    
    viewport.innerHTML = '';
    viewport.appendChild(fragment);
  }
  
  // Scroll handler for virtual scrolling
  let scrollTimeout;
  viewport.addEventListener('scroll', () => {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const scrollTop = viewport.scrollTop;
      startIndex = Math.floor(scrollTop / itemHeight);
      endIndex = Math.min(startIndex + visibleItems, entries.length);
      renderVisibleItems();
    }, 16); // ~60fps
  });
  
  // Initial render
  renderVisibleItems();
  
  container.appendChild(viewport);
  listingEl.appendChild(container);
  
  // Attach event delegation for better performance
  attachEventDelegation(container, handleSelection, openPath);
}

export function renderIcons(entries, listingEl, handleSelection, openPath) {
  clearListing(listingEl);
  const emptyEl = document.querySelector('#empty');
  if (emptyEl) emptyEl.hidden = entries.length !== 0;
  
  const grid = document.createElement('div');
  grid.className = 'rows icons';
  
  grid.addEventListener('dragover', (e) => { e.preventDefault(); });
  grid.addEventListener('drop', (e) => {
    e.preventDefault();
    const dt = e.dataTransfer;
    if (!dt) return;
    if (dt.files && dt.files.length) {
      document.dispatchEvent(new CustomEvent('app:upload-drop', { detail: { files: dt.files } }));
    }
  });

  // Use DocumentFragment for better performance
  const fragment = document.createDocumentFragment();
  
  entries.forEach((e, idx) => {
    const row = document.createElement('div');
    row.className = 'row';
    row.dataset.path = e.path;
    row.dataset.isDir = e.isDir ? 'true' : 'false';
    row.dataset.index = idx.toString();
    row.setAttribute('draggable', 'true');
    if (state.selected.has(e.path)) row.classList.add('selected');
    
    const icon = document.createElement('div'); 
    icon.className = 'icon'; 
    icon.textContent = iconFor(e);
    
    const name = document.createElement('div'); 
    name.className = 'name'; 
    name.textContent = e.name; 
    name.title = e.name;
    
    row.appendChild(icon); 
    row.appendChild(name);
    
    fragment.appendChild(row);
  });
  
  grid.appendChild(fragment);
  listingEl.appendChild(grid);
  
  // Attach event delegation for better performance
  attachEventDelegation(grid, handleSelection, openPath);
}

export function renderListing(entries, listingEl, handleSelection, openPath) {
  const sorted = sortEntries(entries);
  if (state.viewMode === 'icons') renderIcons(sorted, listingEl, handleSelection, openPath);
  else renderDetails(sorted, listingEl, handleSelection, openPath);
  updateStatus(entries);
}

export function sortEntries(entries) {
  const { sortBy, sortDir } = state;
  const dirMul = sortDir === 'asc' ? 1 : -1;
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  const get = (e) => {
    if (sortBy === 'name') return e.name;
    if (sortBy === 'modified') return e.modifiedIso || '';
    if (sortBy === 'type') return computeType(e);
    if (sortBy === 'size') return e.sizeBytes ?? -1;
    return e.name;
  };
  const entriesCopy = entries.slice();
  entriesCopy.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    const av = get(a), bv = get(b);
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dirMul;
    return collator.compare(String(av), String(bv)) * dirMul;
  });
  return entriesCopy;
}

export function updateStatus(entries) {
  const statusbar = document.querySelector('#statusbar');
  if (!statusbar) return;
  const total = entries ? entries.length : qsa('.row').length;
  const sel = state.selected.size;
  statusbar.textContent = `${total} item(s)${sel ? `, ${sel} selected` : ''}`;
}

// Context menu open function (used within renderers)
export function openContextMenu(x, y, path) {
  const contextMenu = document.querySelector('#context-menu');
  if (!contextMenu) return;
  if (path && !state.selected.has(path)) {
    state.selected.clear();
    state.selected.add(path);
    qsa('.row').forEach(r => r.classList.toggle('selected', state.selected.has(r.dataset.path)));
  }
  contextMenu.style.left = x + 'px';
  contextMenu.style.top = y + 'px';
  contextMenu.hidden = false;
}

// --- Helpers to open new tabs in scaffold ---
function postOpenTabMessage(detail) {
  try { window.top && window.top.postMessage({ __thalis__: true, type: 'open-tab', detail }, '*'); } catch {}
}

function isTextLike(entry) {
  const mt = (entry.mimeType || '').toLowerCase();
  if (mt.startsWith('text/')) return true;
  if (mt.includes('json') || mt.includes('xml') || mt.includes('javascript') || mt.includes('svg')) return true;
  const name = (entry.name || '').toLowerCase();
  return /\.(txt|md|json|xml|csv|log|ini|cfg|yaml|yml|js|ts|tsx|jsx|css|scss|html|htm|svg|py|rs|go|java|c|cpp|h|hpp|sh|bat)$/i.test(name);
}

function openFolderInNewTab(entry) {
  postOpenTabMessage({ kind: 'folder', title: entry.name || 'Folder', src: `/src/programs/envs/local/local.html?path=${encodeURIComponent(entry.path)}` });
}

function openEditorTab(entry) {
  postOpenTabMessage({ kind: 'text', title: entry.name || 'Editor', src: `/src/programs/envs/local/renderers/text/text.html?path=${encodeURIComponent(entry.path)}` });
}

function openByType(entry) {
  const mt = (entry.mimeType || '').toLowerCase();
  if (entry.isDir) { openFolderInNewTab(entry); return; }
  if (isTextLike(entry)) { openEditorTab(entry); return; }
  if (mt.startsWith('image/')) { postOpenTabMessage({ kind: 'image', title: entry.name, src: `/src/programs/envs/local/renderers/image/image.html?path=${encodeURIComponent(entry.path)}` }); return; }
  if (mt.startsWith('video/')) { postOpenTabMessage({ kind: 'video', title: entry.name, src: `/src/programs/envs/local/renderers/video/video.html?path=${encodeURIComponent(entry.path)}` }); return; }
  if (mt.startsWith('audio/')) { postOpenTabMessage({ kind: 'audio', title: entry.name, src: `/src/programs/envs/local/renderers/audio/audio.html?path=${encodeURIComponent(entry.path)}` }); return; }
  if (mt === 'application/pdf') { postOpenTabMessage({ kind: 'pdf', title: entry.name, src: `/src/programs/envs/local/renderers/pdf/pdf.html?path=${encodeURIComponent(entry.path)}` }); return; }
  postOpenTabMessage({ kind: 'file', title: entry.name, src: `/src/programs/envs/local/renderers/unsupported/unsupported.html?path=${encodeURIComponent(entry.path)}` });
}

