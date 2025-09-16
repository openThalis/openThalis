import { upBtn, backBtn, forwardBtn, refreshBtn } from '../core/dom.js';
import { state, setSuppressHistoryNavigation } from '../core/state.js';
import { getParentPath } from './history.js';

export function attachNavControls(openPath) {
  if (upBtn)
    upBtn.addEventListener('click', () => {
      if (!state.cwd) return;
      const parent = getParentPath(state.cwd);
      if (parent) openPath(parent);
    });
  if (backBtn)
    backBtn.addEventListener('click', () => {
      if (state.historyIndex > 0) {
        state.historyIndex -= 1;
        setSuppressHistoryNavigation(true);
        openPath(state.history[state.historyIndex]);
      }
    });
  if (forwardBtn)
    forwardBtn.addEventListener('click', () => {
      if (state.historyIndex < state.history.length - 1) {
        state.historyIndex += 1;
        setSuppressHistoryNavigation(true);
        openPath(state.history[state.historyIndex]);
      }
    });
  if (refreshBtn) refreshBtn.addEventListener('click', () => { if (state.cwd) openPath(state.cwd); });
}


