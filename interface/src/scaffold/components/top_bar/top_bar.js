import globalAuth from '/src/scaffold/shared/instance/js/globalAuth.js';

export function initializeTopComponent() {
    const topComponent = document.getElementById('top-component');

    if (!topComponent) {
        console.error('Top component element not found');
        return Promise.reject(new Error('Top component element not found'));
    }

    return fetch('/src/scaffold/components/top_bar/top_bar.html')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load top bar HTML: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            topComponent.innerHTML = html;
            return initializeInstanceName();
        })
        .then(() => {
            setupEventListeners();
        })
        .catch(error => {
            console.error('Error initializing top component:', error);
            throw error;
        });
}

async function initializeInstanceName() {
    const instanceTitle = document.getElementById('instance_title');

    if (!instanceTitle) {
        console.warn('Instance title element not found');
        return;
    }

    try {
        // Wait for auth to initialize if needed
        await globalAuth.initialize();

        // Get the actual instance name (email)
        const instanceName = globalAuth.getEmail();

        if (instanceName) {
            instanceTitle.textContent = instanceName;
            // Apply saved visibility state for this instance
            applyNameVisibility(instanceName);
        } else {
            // Fallback to placeholder if no instance name is available
            instanceTitle.textContent = 'No instance selected';
        }
    } catch (error) {
        console.error('Failed to get instance name:', error);
        instanceTitle.textContent = 'Error loading instance';
    }
}

function applyNameVisibility(email) {
    try {
        const key = `topbar:nameHidden:${encodeURIComponent(email)}`;
        const isHidden = localStorage.getItem(key) === 'true';
        const instanceTitle = document.getElementById('instance_title');
        
        if (instanceTitle) {
            if (isHidden) {
                instanceTitle.classList.add('hidden');
            } else {
                instanceTitle.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error('Failed to apply name visibility:', error);
    }
}

function setupEventListeners() {
    const leftSidebarToggle = document.getElementById('left-sidebar-toggle');
    const rightSidebarToggle = document.getElementById('right-sidebar-toggle');
    const leftSidebar = document.getElementById('left-sidebar');
    const rightSidebar = document.getElementById('right-sidebar');

    if (!leftSidebarToggle || !rightSidebarToggle || !leftSidebar || !rightSidebar) {
        console.error('Required sidebar elements not found for top bar event listeners');
        return;
    }

    leftSidebarToggle.addEventListener('click', () => {
        leftSidebar.classList.toggle('hidden');
    });

    rightSidebarToggle.addEventListener('click', () => {
        rightSidebar.classList.toggle('hidden');
    });
}
