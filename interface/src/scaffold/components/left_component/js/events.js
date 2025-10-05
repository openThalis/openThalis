import { sharedState } from '/src/scaffold/shared/tab/js/state.js';
import globalAuth from '/src/scaffold/shared/instance/js/globalAuth.js';

export function setupEventListeners() {
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', handleMenuItemClick);
    });

    setupDropdownMenu();

    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    const hideNameButton = document.getElementById('hide-name-button');
    if (hideNameButton) {
        hideNameButton.addEventListener('click', handleHideName);
    }

    updateHideNameMenuLabel();
}

function setupDropdownMenu() {
    const userMenuButton = document.getElementById('user-menu-button');
    const dropdownContent = document.getElementById('dropdown-content');

    if (!userMenuButton || !dropdownContent) {
        console.error('Dropdown menu elements not found');
        return;
    }

    userMenuButton.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleDropdown();
    });

    document.addEventListener('click', (event) => {
        if (!userMenuButton.contains(event.target) && !dropdownContent.contains(event.target)) {
            closeDropdown();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeDropdown();
        }
    });
}

function toggleDropdown() {
    const userMenuButton = document.getElementById('user-menu-button');
    const dropdownContent = document.getElementById('dropdown-content');

    if (!userMenuButton || !dropdownContent) return;

    const isOpen = dropdownContent.classList.contains('show');

    if (isOpen) {
        closeDropdown();
    } else {
        openDropdown();
    }
}

function openDropdown() {
    const userMenuButton = document.getElementById('user-menu-button');
    const dropdownContent = document.getElementById('dropdown-content');

    if (!userMenuButton || !dropdownContent) return;

    userMenuButton.classList.add('active');
    dropdownContent.classList.add('show');

    updateHideNameMenuLabel();
}

function closeDropdown() {
    const userMenuButton = document.getElementById('user-menu-button');
    const dropdownContent = document.getElementById('dropdown-content');

    if (!userMenuButton || !dropdownContent) return;

    userMenuButton.classList.remove('active');
    dropdownContent.classList.remove('show');
}

function handleHideName() {
    closeDropdown();

    const instanceTitle = document.getElementById('instance_title');
    if (instanceTitle) {
        const isHidden = instanceTitle.classList.toggle('hidden');
        try {
            const email = globalAuth.getEmail();
            if (email) {
                const key = `topbar:nameHidden:${encodeURIComponent(email)}`;
                localStorage.setItem(key, String(isHidden));
            }
        } catch (e) {
        }
        updateHideNameMenuLabel();
    } else {
        console.warn('Instance title element not found');
    }
}

function updateHideNameMenuLabel() {
    try {
        const hideBtn = document.getElementById('hide-name-button');
        if (!hideBtn) return;
        const label = hideBtn.querySelector('.item-label') || hideBtn;
        const instanceTitle = document.getElementById('instance_title');

        let isHidden = false;
        if (instanceTitle) {
            isHidden = instanceTitle.classList.contains('hidden');
        } else {
            const email = globalAuth.getEmail();
            if (email) {
                const key = `topbar:nameHidden:${encodeURIComponent(email)}`;
                isHidden = localStorage.getItem(key) === 'true';
            }
        }
        label.textContent = isHidden ? 'Show name' : 'Hide name';
    } catch (e) {
    }
}

async function handleLogout() {
    closeDropdown();

    try {
        // Clear session immediately and synchronously
        globalAuth.clearSession();

        // Force page reload to ensure clean state and prevent auto-login
        setTimeout(() => {
            window.location.reload();
        }, 100);
    } catch (error) {
        console.error('Logout failed:', error);
        // Even on error, clear session and reload
        globalAuth.clearSession();
        setTimeout(() => {
            window.location.reload();
        }, 100);
    }
}


async function handleMenuItemClick(event) {
    const menuItem = event.target.closest('.menu-item');
    if (!menuItem) return;
    
    const action = menuItem.getAttribute('data-action');
    
    // Always create new tabs in center component if right sidebar is hidden
    const rightSidebar = document.getElementById('right-sidebar');
    const isRightSidebarHidden = rightSidebar.classList.contains('hidden');
    
    if (action === 'temp_action') {
        window.open('https://x.com/AyoubNika', '_blank');
    }

    /////////////////////// SYSTEM

    else if (action === 'home') {
        try {
            const response = await fetch('/src/programs/system/home/home.html');
            const content = await response.text();
            
            // Create a new tab in the appropriate component and capture the created tab
            let newTab;
            if (!isRightSidebarHidden && sharedState.lastSelectedComponent === 'right') {
                newTab = await window.rightTabsManager.addTab('Home', content);
            } else {
                newTab = await window.centerTabsManager.addTab('Home', content);
            }

            // Dynamically load and initialize the Home module for THIS tab only
            setTimeout(async () => {
                try {
                    const module = await import('/src/programs/system/home/home.js');

                    // Root inside the newly created tab's content element
                    const homeRoot = newTab && newTab.contentElement
                        ? newTab.contentElement.querySelector('.search-container')
                        : null;

                    if (module.initializeHome) {
                        module.initializeHome(homeRoot || (newTab ? newTab.contentElement : null));
                    }
                } catch (error) {
                    console.error('Error initializing home:', error);
                }
            }, 0);
        } catch (error) {
            console.error('Error loading home:', error);
        }
    } 
    
    else if (action === 'settings') {
        try {
            // Check if Settings tab already exists in either tab manager
            const centerTabs = window.centerTabsManager?.getTabs() || [];
            const rightTabs = window.rightTabsManager?.getTabs() || [];
            
            const existingSettingsTab = centerTabs.find(tab => tab.name === 'Settings') || 
                                       rightTabs.find(tab => tab.name === 'Settings');
            
            if (existingSettingsTab) {
                // Focus existing Settings tab instead of creating new one
                if (centerTabs.find(tab => tab.name === 'Settings')) {
                    await window.centerTabsManager.setActiveTab('Settings');
                } else {
                    await window.rightTabsManager.setActiveTab('Settings');
                }
                return;
            }

            const response = await fetch('/src/programs/system/settings/settings.html');
            const content = await response.text();
            
            // Create a new tab in the appropriate component and capture the created tab
            let newTab;
            if (!isRightSidebarHidden && sharedState.lastSelectedComponent === 'right') {
                newTab = await window.rightTabsManager.addTab('Settings', content);
            } else {
                newTab = await window.centerTabsManager.addTab('Settings', content);
            }

            // Dynamically load and initialize the Settings module
            setTimeout(() => {
                import('/src/programs/system/settings/settings.js')
                    .then(module => {
                        // Use the specific tab's content element as the container
                        const tabContentElement = newTab && newTab.contentElement ? newTab.contentElement : null;
                        
                        // Find the settings container within this specific tab
                        const settingsContainer = tabContentElement ? tabContentElement.querySelector('.settings-container') : null;
                        
                        // Create a new settings manager instance scoped to THIS tab's content element
                        const settingsManager = new module.default(settingsContainer || tabContentElement);
                        
                        // Store reference for potential cleanup
                        if (settingsContainer) {
                            settingsContainer.settingsManager = settingsManager;
                        } else if (tabContentElement) {
                            tabContentElement.settingsManager = settingsManager;
                        }
                    })
                    .catch(error => console.error('Error initializing settings:', error));
            }, 100); // Slightly longer delay to ensure tab content is rendered
        } 
        
        catch (error) {
            console.error('Error loading settings:', error);
        }
    }
    
    /////////////////////// EIDOS

    else if (action === 'eido') {
        try {
            // Check if Eido tab already exists in either tab manager
            const centerTabs = window.centerTabsManager?.getTabs() || [];
            const rightTabs = window.rightTabsManager?.getTabs() || [];
            
            const existingEidoTab = centerTabs.find(tab => tab.name === 'Eido') || 
                                   rightTabs.find(tab => tab.name === 'Eido');
            
            if (existingEidoTab) {
                // Focus existing Eido tab instead of creating new one
                if (centerTabs.find(tab => tab.name === 'Eido')) {
                    await window.centerTabsManager.setActiveTab('Eido');
                } else {
                    await window.rightTabsManager.setActiveTab('Eido');
                }
                return;
            }

            const response = await fetch('/src/programs/eidos/eido/eido.html');
            const content = await response.text();

            // Create a new tab in the appropriate component and capture the created tab
            let newTab;
            if (!isRightSidebarHidden && sharedState.lastSelectedComponent === 'right') {
                newTab = await window.rightTabsManager.addTab('Eido', content);
            } else {
                newTab = await window.centerTabsManager.addTab('Eido', content);
            }

            // Dynamically load and initialize the Eido module
            setTimeout(() => {
                import('/src/programs/eidos/eido/eido.js')
                    .then(module => {
                        // Use the specific tab's content element as the container
                        const tabContentElement = newTab && newTab.contentElement ? newTab.contentElement : null;

                        // Find the eido container within this specific tab
                        const eidoContainer = tabContentElement ? tabContentElement.querySelector('.config-form') : null;

                        // Create a new Eido manager instance scoped to THIS tab's content element
                        if (module.default) {
                            const eidoManager = new module.default(eidoContainer || tabContentElement);

                            // Store reference for potential cleanup
                            if (eidoContainer) {
                                eidoContainer.eidoManager = eidoManager;
                            } else if (tabContentElement) {
                                tabContentElement.eidoManager = eidoManager;
                            }
                        } else if (module.initializeEido) {
                            module.initializeEido(eidoContainer || tabContentElement);
                        }
                    })
                    .catch(error => console.error('Error initializing eido:', error));
            }, 100); // Slight delay to ensure tab content is rendered
        } catch (error) {
            console.error('Error loading eido:', error);
        }
    }

    else if (action === 'chats') {
        try {
            const response = await fetch('/src/programs/eidos/chats/chats.html');
            const content = await response.text();
            
            // Create a new tab in the appropriate component and capture the created tab
            let newTab;
            if (!isRightSidebarHidden && sharedState.lastSelectedComponent === 'right') {
                newTab = await window.rightTabsManager.addTab('Chats', content);
            } else {
                newTab = await window.centerTabsManager.addTab('Chats', content);
            }

            // Dynamically load and initialize the Chats module using the specific tab's content element
            const module = await import('/src/programs/eidos/chats/chats.js');
            if (module.initializeChats) {
                const chatsRoot = (newTab && newTab.contentElement) 
                    ? newTab.contentElement.querySelector('.chats-component') 
                    : null;
                module.initializeChats(chatsRoot || (newTab ? newTab.contentElement : null));
            }
        } catch (error) {
            console.error('Error loading chats:', error);
        }
    }

    else if (action === 'tasks') {
        try {
            const response = await fetch('/src/programs/eidos/tasks/tasks.html');
            const content = await response.text();
            
            // Create a new tab in the appropriate component and capture the created tab
            let newTab;
            if (!isRightSidebarHidden && sharedState.lastSelectedComponent === 'right') {
                newTab = await window.rightTabsManager.addTab('Tasks', content);
            } else {
                newTab = await window.centerTabsManager.addTab('Tasks', content);
            }

            // Dynamically load and initialize the Tasks module scoped to THIS tab's content element
            try {
                const module = await import('/src/programs/eidos/tasks/tasks.js');
                if (module.initializeTasks) {
                    const scopeElement = newTab && newTab.contentElement ? newTab.contentElement : null;
                    const tasksInstance = module.initializeTasks(scopeElement);

                    // Store reference for potential cleanup
                    if (scopeElement) {
                        scopeElement.tasksInstance = tasksInstance;
                    }
                }
            } catch (error) {
                console.error('Error initializing tasks:', error);
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
        }
    }

    /////////////////////// ENVIRONMENTS


    else if (action === 'spaces') {
        try {
            const response = await fetch('/src/programs/envs/spaces/spaces.html');
            const content = await response.text();
            
            // Create a new tab in the appropriate component
            if (!isRightSidebarHidden && sharedState.lastSelectedComponent === 'right') {
                window.rightTabsManager.addTab('Spaces', content);
            } else {
                window.centerTabsManager.addTab('Spaces', content);
            }
        }
        catch (error) {
            console.error('Error loading spaces:', error);
        }
    }

    else if (action === 'local') {
        try {
            // Use an isolated iframe so each Local tab has its own document, DOM, and state
            const iframeHtml = `
                <div class="program-iframe-wrapper" style="width:100%;height:100%;">
                  <iframe 
                  src="/src/programs/envs/local/local.html" 
                  style="width:100%;height:100%;border:0;display:block;"
                  ></iframe>
                </div>
                `;

            // Create a new tab in the appropriate component
            if (!isRightSidebarHidden && sharedState.lastSelectedComponent === 'right') {
                window.rightTabsManager.addTab('Local', iframeHtml);
            } else {
                window.centerTabsManager.addTab('Local', iframeHtml);
            }
        } 
        catch (error) {
            console.error('Error loading local:', error);
        }
    }

    else if (action === 'aether') {
        try {
            const response = await fetch('/src/programs/envs/aether/aether.html');
            const content = await response.text();
            
            // Create a new tab in the appropriate component and capture the created tab
            let newTab;
            if (!isRightSidebarHidden && sharedState.lastSelectedComponent === 'right') {
                newTab = await window.rightTabsManager.addTab('Aether', content);
            } else {
                newTab = await window.centerTabsManager.addTab('Aether', content);
            }

            // Dynamically load and initialize the Aether module scoped to THIS tab's content element
            setTimeout(async () => {
                try {
                    const module = await import('/src/programs/envs/aether/aether.js');
                    if (module.initializeAetherApp) {
                        const scopeElement = newTab && newTab.contentElement ? newTab.contentElement : null;
                        const aetherInstance = module.initializeAetherApp(scopeElement);

                        // Store reference for potential cleanup
                        if (scopeElement) {
                            scopeElement.aetherInstance = aetherInstance;
                        }
                    }
                } catch (error) {
                    console.error('Error initializing aether:', error);
                }
            }, 100); // Slight delay to ensure tab content is rendered
        } catch (error) {
            console.error('Error loading aether:', error);
        }
    }

    /////////////////////// PUBBLIC

    else if (action === 'support') {
        window.open('https://openthalis.ai/support', '_blank');
    }

    else if (action === 'docs') {
        window.open('https://openthalis.ai/docs', '_blank');
    }
}