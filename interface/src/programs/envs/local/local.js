import { api } from '/src/programs/envs/local/js/data/api.js';
import { loadNav } from '/src/programs/envs/local/js/navigation/navigation.js';
import { openPath } from '/src/programs/envs/local/js/listing/listing.js';
import { attachNavControls } from '/src/programs/envs/local/js/navigation/navControls.js';
import { attachMenus, updateDetailsHeaderVisibility, updateSortMenuActive, updateViewMenuActive } from '/src/programs/envs/local/js/ui/menus.js';
import { attachSearch } from '/src/programs/envs/local/js/search/search.js';
import { attachNewAndUploadHandlers } from '/src/programs/envs/local/js/transfer/newUpload.js';
import { attachCommandBar } from '/src/programs/envs/local/js/actions/commands.js';
import { attachKeyboardShortcuts } from '/src/programs/envs/local/js/actions/keyboard.js';
import { attachContextMenuHandlers } from '/src/programs/envs/local/js/ui/contextMenu.js';
import { showAlert, showConfirm, showPrompt, validateWindowsName } from '/src/programs/envs/local/js/ui/modal.js';
import { state, setSuppressHistoryNavigation } from '/src/programs/envs/local/js/core/state.js';
import { showToast } from '/src/programs/envs/local/js/ui/toast.js';
import { commandDeleteBtn, commandRenameBtn, copyBtn, cutBtn, pasteBtn } from '/src/programs/envs/local/js/core/dom.js';
import { attachDropHandlers } from '/src/programs/envs/local/js/transfer/drops.js';

export async function initApp() {
  // Start critical operations immediately
  const criticalInit = async () => {
    // Attach essential event handlers first
    attachNavControls(openPath);
    attachMenus(openPath);
    attachSearch(openPath);
    attachDropHandlers(openPath);
    
    // Command bar, keyboard and context menu
    attachCommandBar(openPath, showConfirm, showPrompt, validateWindowsName);
    attachKeyboardShortcuts({ commandDeleteBtn, commandRenameBtn, copyBtn, cutBtn, pasteBtn });
    attachContextMenuHandlers({ copyBtn, cutBtn, pasteBtn, commandRenameBtn, commandDeleteBtn, showAlert, showToast });

  };

  // Load navigation and initial path in parallel for faster startup
  const loadInitialData = async () => {
    try {
      // Parallel API calls for faster loading
      const [homeData, navData] = await Promise.all([
        api.home(),
        loadNav(openPath).catch(() => ({})) // Don't block on nav loading
      ]);

      const { homePath } = homeData;
      
      // Support starting in a specific folder via query param ?path=
      let initialPath = null;
      try {
        const params = new URLSearchParams(location.search);
        const p = params.get('path');
        if (p && typeof p === 'string' && p.trim()) initialPath = p;
      } catch {}
      
      // Load initial path immediately
      await openPath(initialPath || homePath);
      
      // Expose the Local application state to the parent window for drag & drop preservation
      try {
        window.localState = { cwd: initialPath || homePath };
      } catch (e) {
        console.warn('Could not expose Local app state:', e);
      }
      
      // Update UI state
      updateDetailsHeaderVisibility();
      updateSortMenuActive();
      updateViewMenuActive();
      
      return { homePath, initialPath };
    } catch (e) {
      const errorEl = document.querySelector('#error');
      if (errorEl) {
        errorEl.hidden = false;
        errorEl.textContent = String(e.message || e);
      }
      throw e;
    }
  };

  // Defer non-critical operations
  const loadNonCriticalFeatures = async () => {
    try {
      // Load upload handlers (not critical for initial display)
      attachNewAndUploadHandlers(openPath, showPrompt, validateWindowsName);
      
      // Help button in nav-pane: show brief instructions
      const helpBtn = document.getElementById('help-btn');
      if (helpBtn) {
        helpBtn.addEventListener('click', () => {
          showAlert('Local – Help', (
            'Local is a file manager that allows you to manage your files and folders.\n\n' +
            'The default path is the Desktop unless you change it in the settings; Which will be the same path for the eido(s) as well\n\n' +
            'Basics\n' +
            '- Double-click folders to open; files to preview.\n' +
            '- Right-click items for item actions; right-click background for New/Paste/Refresh.\n' +
            '- Drag items within the app to move; hold Ctrl while dragging to copy.\n' +
            '- Drag from your OS to upload (folders supported in Chromium-based browsers).\n\n' +
            'Navigation\n' +
            '- Use Back, Forward, and Up buttons, breadcrumb links, or Quick access/Drives.\n\n' +
            'Selection\n' +
            '- Click to select; Ctrl+Click to multi-select; Shift+Click for ranges; click empty space to clear.\n\n' +
            'Shortcuts\n' +
            '- Delete, F2 (rename), Ctrl+C / Ctrl+X / Ctrl+V (copy/cut/paste).\n\n' +
            'View & Sort\n' +
            '- View ▾: Details or Large icons. Sort ▾: Name, Date modified, Type, Size (Asc/Desc).\n' +
            '- In Details view, click column headers to sort and toggle direction.\n\n' +
            'Search\n' +
            '- Use the Search box to filter items within the current location.\n\n' +
            'Editing & Clipboard\n' +
            '- Use the command bar to Rename, Delete, Copy, Cut, and Paste.\n' +
            '- Paste into the current view or onto a folder via its context menu.\n\n' +
            'Preview & Download\n' +
            '- Built-in preview for images, videos, audio, PDFs, text, HTML/SVG; otherwise use Download.\n\n' +
            'Properties\n' +
            '- Right-click an item → Properties for details (size, type, dates, path).\n\n' +
            'Status\n' +
            '- The status bar shows total items and how many are selected.'
          ));
        });
      }
    } catch (e) {
      console.warn('Non-critical features failed to load:', e);
    }
  };

  // Start live polling only after user interaction (performance optimization)
  const startLivePollingOnInteraction = () => {
    let hasInteracted = false;
    const interactionEvents = ['click', 'keydown', 'mousemove', 'scroll'];
    
    const enablePolling = () => {
      if (hasInteracted) return;
      hasInteracted = true;
      try { 
        startLivePolling(); 
        // Remove listeners after enabling polling
        interactionEvents.forEach(event => {
          document.removeEventListener(event, enablePolling, { passive: true });
        });
      } catch {}
    };

    // Add passive listeners for better performance
    interactionEvents.forEach(event => {
      document.addEventListener(event, enablePolling, { passive: true });
    });

    // Enable polling after 5 seconds regardless of interaction
    setTimeout(enablePolling, 5000);
  };

  try {
    // Execute critical initialization immediately
    await criticalInit();
    
    // Load initial data in parallel
    await loadInitialData();
    
    // Defer non-critical features to next tick
    requestIdleCallback ? 
      requestIdleCallback(() => loadNonCriticalFeatures()) : 
      setTimeout(loadNonCriticalFeatures, 0);
    
    // Start live polling only after user interaction
    startLivePollingOnInteraction();
    
  } catch (e) {
    const errorEl = document.querySelector('#error');
    if (errorEl) {
      errorEl.hidden = false;
      errorEl.textContent = String(e.message || e);
    }
  }
}

// Initialize the app when the module loads
try { initApp(); } catch {}

// --- Live polling ----------------------------------------------------
let __livePollTimer = null;
let __lastListingSignature = '';

function computeListingSignature(entries) {
  if (!Array.isArray(entries)) return '';
  // Build a compact signature from stable fields to detect changes
  try {
    return entries
      .map(e => `${e.name}|${e.isDir ? 'd' : 'f'}|${e.sizeBytes ?? ''}|${e.modifiedIso ?? ''}`)
      .join('\n');
  } catch { return String(Math.random()); }
}

function startLivePolling(intervalMs = 3000) { // Increased from 2000ms for better performance
  if (__livePollTimer) clearInterval(__livePollTimer);
  const tick = async () => {
    try {
      // Be gentle when tab not visible
      if (document.hidden) return;
      if (!state.cwd) return;
      // Respect ongoing busy state if any
      const listing = document.getElementById('listing');
      if (listing && listing.getAttribute('aria-busy') === 'true') return;

      const data = await api.listdir(state.cwd);
      const sig = computeListingSignature(data.entries || []);
      if (sig !== __lastListingSignature) {
        __lastListingSignature = sig;
        // Prevent history pollution during automatic refresh
        setSuppressHistoryNavigation(true);
        await openPath(state.cwd);
      }
    } catch {
      // Ignore transient errors during polling
    }
  };
  // Initialize signature immediately to avoid double-refresh
  (async () => {
    try {
      if (state.cwd) {
        const data = await api.listdir(state.cwd);
        __lastListingSignature = computeListingSignature(data.entries || []);
      }
    } catch {}
  })();
  __livePollTimer = setInterval(tick, intervalMs);
  window.addEventListener('beforeunload', () => { if (__livePollTimer) clearInterval(__livePollTimer); });
}
