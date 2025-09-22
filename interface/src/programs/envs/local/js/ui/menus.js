import { qsa, detailsHeader, sortBtn, sortMenu, viewBtn, viewMenu, newBtn, newMenu } from '../core/dom.js';
import { state } from '../core/state.js';

function toggleMenu(btn, menu) {
  if (!menu) return;
  const visible = !menu.hidden;
  qsa('.dropdown').forEach((d) => (d.hidden = true));
  menu.hidden = visible;
  if (!visible) {
    menu.style.right = '0px';
    menu.hidden = false;
  }
}

export function updateSortMenuActive() {
  if (!sortMenu) return;
  const sortButtons = sortMenu.querySelectorAll('button[data-sort]');
  const dirButtons = sortMenu.querySelectorAll('button[data-dir]');
  sortButtons.forEach((btn) => btn.classList.toggle('active', btn.getAttribute('data-sort') === state.sortBy));
  dirButtons.forEach((btn) => btn.classList.toggle('active', btn.getAttribute('data-dir') === state.sortDir));
}

export function updateViewMenuActive() {
  if (!viewMenu) return;
  const viewButtons = viewMenu.querySelectorAll('button[data-view]');
  viewButtons.forEach((btn) => btn.classList.toggle('active', btn.getAttribute('data-view') === state.viewMode));
}

export function updateDetailsHeaderVisibility() {
  if (!detailsHeader) return;
  detailsHeader.hidden = state.viewMode !== 'details';
}

export function attachMenus(openPath) {
  // Sorting via header
  if (detailsHeader)
    detailsHeader.addEventListener('click', (e) => {
      const col = e.target.closest('[data-col]');
      if (!col) return;
      const key = col.getAttribute('data-col');
      if (!key) return;
      if (state.sortBy === key) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      else {
        state.sortBy = key;
        state.sortDir = 'asc';
      }
      if (state.cwd) openPath(state.cwd);
      updateSortMenuActive();
    });

  // Sort/View menus
  if (sortBtn) sortBtn.addEventListener('click', () => toggleMenu(sortBtn, sortMenu));
  if (viewBtn) viewBtn.addEventListener('click', () => toggleMenu(viewBtn, viewMenu));
  if (sortMenu)
    sortMenu.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const s = b.getAttribute('data-sort');
      const d = b.getAttribute('data-dir');
      if (s) state.sortBy = s;
      if (d) state.sortDir = d;
      document.querySelectorAll('.dropdown').forEach((dEl) => (dEl.hidden = true));
      if (state.cwd) openPath(state.cwd);
      updateSortMenuActive();
    });
  if (viewMenu)
    viewMenu.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const v = b.getAttribute('data-view');
      if (v === 'details') state.viewMode = 'details';
      if (v === 'icons') state.viewMode = 'icons';
      document.querySelectorAll('.dropdown').forEach((dEl) => (dEl.hidden = true));
      updateDetailsHeaderVisibility();
      if (state.cwd) openPath(state.cwd);
      updateViewMenuActive();
    });

  // New button + menu (just toggling menu visibility)
  if (newBtn) newBtn.addEventListener('click', () => toggleMenu(newBtn, newMenu));
  if (newMenu)
    newMenu.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const type = b.getAttribute('data-new');
      if (!type) return;
      document.querySelectorAll('.dropdown').forEach((dEl) => (dEl.hidden = true));
      document.dispatchEvent(new CustomEvent('app:new', { detail: { type } }));
    });
}


