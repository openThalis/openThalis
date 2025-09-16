import { qsa } from '../core/dom.js';
import { state } from '../core/state.js';
import { updateStatus } from './render.js';

export function handleSelection(ev, idx, path) {
  const isCtrl = ev.ctrlKey || ev.metaKey;
  const isShift = ev.shiftKey;
  if (isShift && state.lastSelectedIndex >= 0) {
    const rows = qsa('.row');
    const [a, b] = [state.lastSelectedIndex, idx].sort((x,y) => x-y);
    state.selected.clear();
    for (let i = a; i <= b; i++) { const p = rows[i]?.dataset.path; if (p) state.selected.add(p); }
  } else if (isCtrl) {
    if (state.selected.has(path)) state.selected.delete(path); else state.selected.add(path);
    state.lastSelectedIndex = idx;
  } else {
    state.selected.clear(); state.selected.add(path); state.lastSelectedIndex = idx;
  }
  qsa('.row').forEach(r => r.classList.toggle('selected', state.selected.has(r.dataset.path)));
  updateStatus();
}


