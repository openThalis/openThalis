import { searchInput } from '../core/dom.js';
import { state } from '../core/state.js';

export function attachSearch(openPath) {
  let searchTimer = null;
  let lastSearchQuery = '';
  
  if (searchInput) {
    // Add input event listener with better performance
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      
      // Don't search if query hasn't changed
      if (query === lastSearchQuery) return;
      
      state.searchQuery = query;
      lastSearchQuery = query;
      
      // Clear previous timer
      if (searchTimer) clearTimeout(searchTimer);
      
      // Debounce search with progressive delay
      const delay = query.length > 2 ? 150 : 300; // Faster for longer queries
      searchTimer = setTimeout(() => {
        if (state.cwd) openPath(state.cwd);
      }, delay);
    });
    
    // Add search button for immediate search
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (searchTimer) clearTimeout(searchTimer);
        if (state.cwd) openPath(state.cwd);
      }
    });
  }
}


