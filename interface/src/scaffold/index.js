// Import modules
import { initializeTopComponent } from '/src/scaffold/components/top_bar/top_bar.js';
import { initializeCenterComponent } from '/src/scaffold/components/center_component/center_component.js';
import { initializeLeftSidebar } from '/src/scaffold/components/left_component/left_component.js';
import { initializeRightSidebar } from '/src/scaffold/components/right_component/right_component.js';
import { initializeBottomComponent } from '/src/scaffold/components/bottom_component/bottom_component.js';
import { sharedState } from '/src/scaffold/components/shared/js/state.js';
import globalAuth from '/src/scaffold/components/shared/js/globalAuth.js';
import UserSelection from '/src/scaffold/components/shared/js/userSelection.js';

// Global authentication and initialization
let isScaffoldInitialized = false;

// Initialize global user selection system
let userSelection;

function initializeGlobalLogin() {
    userSelection = new UserSelection();

    // Make instance globally available for logout modal
    window.userSelectionInstance = userSelection;

    // Set up callback for successful login
    userSelection.setOnLoginSuccess(async () => {
        // Initialize scaffold if not already done
        if (!isScaffoldInitialized) {
            await initializeScaffold();
        }
    });
}

// Initialize scaffold components
async function initializeScaffold() {
    if (isScaffoldInitialized) return;
    
    try {
        // Set initial state
        sharedState.lastSelectedComponent = 'center';
        sharedState.usedTabNames = new Set();
        sharedState.tabNameCounters = new Map();

        // Initialize components
        await initializeTopComponent();
        await initializeCenterComponent();

        // Initialize remaining components
        await Promise.all([
            initializeBottomComponent(),
            initializeRightSidebar(),
            initializeLeftSidebar()
        ]);

        isScaffoldInitialized = true;
    } catch (error) {
        console.error('Error initializing scaffold components:', error);
        throw error;
    }
}

// Main application initialization
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize global user selection system
        initializeGlobalLogin();

        // Check authentication status
        const authStatus = await globalAuth.checkAuthStatus();

        if (authStatus.authenticated) {
            // User is already logged in, initialize scaffold
            await initializeScaffold();
        } else {
            // Show user selection overlay
            userSelection.show();
        }
    } catch (error) {
        console.error('Error during application initialization:', error);

        // Show user selection overlay on error
        userSelection.show();
    }
});

// Handle open-tab requests from embedded programs (e.g., Local)
window.addEventListener('message', async (event) => {
    try {
        const data = event.data;
        if (!data || data.__thalis__ !== true) return;
        if (data.type === 'open-tab') {
            const detail = data.detail || {};
            const title = detail.title || 'Tab';
            const src = detail.src;
            if (!src) return;

            const iframeHtml = `
                    <div class="program-iframe-wrapper" style="width:100%;height:100%;">
                      <iframe 
                      src="${src}"
                      style="width:100%;height:100%;border:0;display:block;"
                      ></iframe>
                    </div>
                    `;

            // Prefer right if it's the last selected and visible; otherwise open in center
            const rightSidebar = document.getElementById('right-sidebar');
            const isRightHidden = rightSidebar && rightSidebar.classList.contains('hidden');
            if (!isRightHidden && window.rightTabsManager && (sharedState.lastSelectedComponent === 'right')) {
                await window.rightTabsManager.addTab(title, iframeHtml);
            } else if (window.centerTabsManager) {
                await window.centerTabsManager.addTab(title, iframeHtml);
            }
        } else if (data.type === 'update-tab-title') {
            const title = data.title;
            if (!title) return;
            // Find the iframe that sent the message
            let senderIframe = null;
            try {
                const iframes = Array.from(document.querySelectorAll('iframe'));
                senderIframe = iframes.find(f => {
                    try { return f.contentWindow === event.source; } catch { return false; }
                }) || null;
            } catch {}
            // Decide which tab to rename by locating the tab whose content contains the sender iframe
            const tryUpdate = (mgr) => {
                if (!mgr) return false;
                const tabs = mgr.getTabs();
                for (const t of tabs) {
                    if (t.contentElement && senderIframe && t.contentElement.contains(senderIframe)) {
                        const wasActive = mgr.state.activeTab === t.name;
                        // Compute unique title within this manager
                        let newTitle = title;
                        let counter = 2;
                        while (tabs.some(x => x !== t && x.name === newTitle)) {
                            newTitle = `${title} (${counter++})`;
                        }
                        try { sharedState.usedTabNames.delete(t.name); } catch {}
                        t.name = newTitle;
                        try { sharedState.usedTabNames.add(newTitle); } catch {}
                        if (wasActive) mgr.state.activeTab = newTitle;
                        mgr.updateTabs();
                        return true;
                    }
                }
                return false;
            };
            if (senderIframe) {
                if (!tryUpdate(window.centerTabsManager)) {
                    tryUpdate(window.rightTabsManager);
                }
            } else {
                const mgr = (sharedState.lastSelectedComponent === 'right' && window.rightTabsManager) ? window.rightTabsManager : window.centerTabsManager;
                if (!mgr) return;
                const tabs = mgr.getTabs();
                const active = tabs.find(t => t.name === mgr.state.activeTab) || tabs[tabs.length - 1];
                if (!active) return;
                // Compute unique title
                let newTitle = title;
                let counter = 2;
                while (tabs.some(x => x !== active && x.name === newTitle)) {
                    newTitle = `${title} (${counter++})`;
                }
                const wasActive = true;
                try { sharedState.usedTabNames.delete(active.name); } catch {}
                active.name = newTitle;
                try { sharedState.usedTabNames.add(newTitle); } catch {}
                if (wasActive) mgr.state.activeTab = newTitle;
                mgr.updateTabs();
            }
        }
    } catch (err) {
        console.error('Failed to open tab from message:', err);
    }
});

