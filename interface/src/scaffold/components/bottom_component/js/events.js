import { altarState } from '/src/scaffold/components/bottom_component/bottom_component.js';

let applyMinimizedStateFunction = null;

export function setupEventListeners() {
    const altarBar = document.querySelector('.altar-bar');
    const resizeHandle = document.querySelector('.altar-resize-handle');
    const altarHeader = document.querySelector('.altar-header');
    const bottomComponent = document.getElementById('bottom-component');

    if (!altarBar || !resizeHandle || !altarHeader || !bottomComponent) {
        console.warn('Required bottom component elements not found');
        return;
    }

    altarHeader.addEventListener('click', () => {
        toggleMinimizedState();
    });

    function toggleMinimizedState() {
        if (!altarState.isMinimized) {
            const currentHeight = bottomComponent.style.height;
            if (currentHeight && currentHeight !== '30px') {
                bottomComponent.dataset.previousHeight = currentHeight;
            }
        }

        altarState.isMinimized = !altarState.isMinimized;
        applyMinimizedState();
    }

    function applyMinimizedState() {
        if (altarState.isMinimized) {
            // Only store height if it's not already minimized (avoid storing 30px as previous height)
            const currentHeight = bottomComponent.style.height;
            if (currentHeight && currentHeight !== '30px') {
                bottomComponent.dataset.previousHeight = currentHeight;
            } else if (!bottomComponent.dataset.previousHeight) {
                bottomComponent.dataset.previousHeight = '50vh';
            }
            bottomComponent.style.height = '30px'; // Just header height when minimized
            altarBar.classList.add('minimized');
        } else {
            bottomComponent.style.height = bottomComponent.dataset.previousHeight || '50vh';
            altarBar.classList.remove('minimized');

            setTimeout(() => {
                const altarTerminal = window.altarTerminalInstance;
                if (altarTerminal && altarTerminal.handleAltarExpanded) {
                    altarTerminal.handleAltarExpanded();
                }
            }, 100); // Small delay to ensure DOM updates complete
        }
    }

    applyMinimizedStateFunction = applyMinimizedState;

    applyMinimizedState();

    let startY;
    let startHeight;
    let isResizing = false;

    resizeHandle.addEventListener('mousedown', initResize);

    function initResize(e) {
        if (altarBar.classList.contains('minimized')) return;
        
        isResizing = true;
        startY = e.clientY;
        startHeight = parseInt(getComputedStyle(bottomComponent).height, 10);
        
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
        altarBar.classList.add('resizing');
        
        e.preventDefault();
        e.stopPropagation();
    }

    function resize(e) {
        if (!isResizing) return;
        
        const deltaY = startY - e.clientY;
        const viewportHeight = window.innerHeight;
        const maxHeight = Math.floor(viewportHeight * 0.96); // 96% of viewport height
        const newHeight = Math.max(30, Math.min(maxHeight, startHeight + deltaY)); // Constrain between min and max
        bottomComponent.style.height = `${newHeight}px`;
        
    }

    function stopResize() {
        isResizing = false;
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);
        altarBar.classList.remove('resizing');
    }
}

export function syncBottomComponentState() {
    if (applyMinimizedStateFunction) {
        applyMinimizedStateFunction();
    }
}
