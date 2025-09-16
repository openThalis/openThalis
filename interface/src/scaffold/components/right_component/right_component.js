import { initTabComponent } from '/src/scaffold/components/shared/js/tabComponent.js';

function setupResizing(rightSidebar) {
    const resizeHandle = rightSidebar.querySelector('.resize-handle');
    let isResizing = false;
    let startX;
    let startWidth;

    resizeHandle.addEventListener('mousedown', startResize);

    function startResize(e) {
        isResizing = true;
        startX = e.clientX;
        startWidth = parseInt(document.defaultView.getComputedStyle(rightSidebar).width, 10);
        
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
        rightSidebar.classList.add('resizing');
        
        e.preventDefault();
    }

    function resize(e) {
        if (!isResizing) return;
        
        const dx = e.clientX - startX;
        const newWidth = Math.max(0, startWidth - dx);

        rightSidebar.style.width = `${newWidth}px`;
        rightSidebar.style.flexBasis = `${newWidth}px`;
        if (newWidth <= 50) {
            if (!rightSidebar.classList.contains('hidden')) {
                rightSidebar.classList.add('hidden');
            }
        } else {
            rightSidebar.classList.remove('hidden');
        }
    }

    function stopResize() {
        isResizing = false;
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);
        rightSidebar.classList.remove('resizing');

        const currentWidth = parseInt(rightSidebar.style.width, 10);
        if (currentWidth <= 50) {
            rightSidebar.classList.add('hidden');
            rightSidebar.style.width = '0';
        }
    }
}

export async function initializeRightSidebar() {
    try {
        const tabManager = await initTabComponent({
            rootId: 'right-sidebar',
            componentKey: 'right',
            afterMount: (host) => {
                const tabHostContent = host.querySelector('.tab-host-content');
                const resizeHandle = document.createElement('div');
                resizeHandle.className = 'resize-handle';
                tabHostContent.insertBefore(resizeHandle, tabHostContent.firstChild);
                
                setupResizing(host);
            }
        });
        
        window.rightTabsManager = tabManager;
        
    } catch (error) {
        console.error('Error initializing right sidebar:', error);
    }
}
