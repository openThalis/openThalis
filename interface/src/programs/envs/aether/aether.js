import { ProgramManager } from './js/programManager.js';
import { ProgramUI } from './js/ui.js';

function initializeAether(containerElement = null) {
    const scope = containerElement || document;
    
    const programManager = new ProgramManager();
    const programUI = new ProgramUI(programManager, scope);

    // Store instances for URL parameter handling
    window.aetherApp = {
        programManager,
        programUI
    };

    // Initialize the application
    const initPromise = programUI.initialize();
    if (initPromise && typeof initPromise.then === 'function') {
        initPromise.then(() => {
            // Handle URL parameters after initialization
            handleUrlParameters(programManager, programUI);
        });
    } else {
        // Handle URL parameters with a small delay if no promise
        setTimeout(() => handleUrlParameters(programManager, programUI), 200);
    }

    // Update tab title to "Aether" when loading the main interface
    try {
        window.top && window.top.postMessage({ 
            __thalis__: true, 
            type: 'update-tab-title', 
            title: 'Aether' 
        }, '*');
    } catch (titleError) {
        console.warn('Failed to update tab title:', titleError);
    }

    return { programManager, programUI };
}

// Export function for manual initialization by the scaffold system
export function initializeAetherApp(containerElement = null) {
    return initializeAether(containerElement);
}

// Handle URL parameters for edit mode
function handleUrlParameters(programManager, programUI) {
    const params = new URLSearchParams(window.location.search);
    const editProgramId = params.get('edit');
    
    if (editProgramId && programManager && programUI) {
        // Try to find and open the program with retries
        const attemptOpen = (attempt = 1, maxAttempts = 5) => {
            const program = programManager.getProgram(editProgramId);
            
            if (program) {
                programUI.programSettings.openForEdit(program);
                // Clean up the URL parameter
                const newUrl = window.location.pathname;
                window.history.replaceState({}, document.title, newUrl);
            } else if (attempt < maxAttempts) {
                setTimeout(() => attemptOpen(attempt + 1, maxAttempts), 200);
            } else {
                console.warn('Program not found for edit parameter:', editProgramId);
            }
        };
        
        // Start attempting after a short delay
        setTimeout(() => attemptOpen(), 100);
    }
}
