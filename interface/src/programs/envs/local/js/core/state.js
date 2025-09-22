// Global UI/application state

export const state = {
  cwd: '',
  searchQuery: '',
  viewMode: 'details',
  sortBy: 'name',
  sortDir: 'asc',
  selected: new Set(),
  lastSelectedIndex: -1,
  clipboard: { paths: [], cut: false },
  history: [],
  historyIndex: -1,
  currentEntries: [],
};

export let suppressHistoryNavigation = false;
export function setSuppressHistoryNavigation(v) {
  suppressHistoryNavigation = Boolean(v);
}


