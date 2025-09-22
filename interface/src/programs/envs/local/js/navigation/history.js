import { state } from '../core/state.js';

export function pushHistory(p) {
  if (state.historyIndex >= 0 && state.history[state.historyIndex] === p) return;
  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push(p);
  state.historyIndex = state.history.length - 1;
}

export function getParentPath(path) {
  if (!path) return '';
  const isWindows = path.includes('\\');
  const trimmed = path.replace(/[\\/]+$/, '');
  if (isWindows) {
    if (trimmed.startsWith('\\\\')) {
      const parts = trimmed.split('\\').filter(Boolean);
      if (parts.length <= 2) {
        return '\\' + '\\' + parts.join('\\');
      }
      return '\\' + '\\' + parts.slice(0, parts.length - 1).join('\\');
    }
    if (/^[A-Za-z]:\\?$/.test(trimmed)) {
      return trimmed.endsWith('\\') ? trimmed : trimmed + '\\';
    }
    const idx = trimmed.lastIndexOf('\\');
    if (idx <= 2) {
      const base = trimmed.slice(0, Math.max(idx, 3));
      return base.endsWith('\\') ? base : base + '\\';
    }
    return trimmed.slice(0, idx);
  }
  if (trimmed === '/') return '/';
  const idx = trimmed.lastIndexOf('/');
  return idx <= 0 ? '/' : trimmed.slice(0, idx);
}


