import { sharedState } from '/src/scaffold/components/shared/js/state.js';

export function createTabContextMenu(tab, component) {
    const menu = document.createElement('div');
    menu.className = 'context-menu';

    const menuItems = [
        { label: 'Clone', action: () => cloneTab(tab, component) },
        null,
        { label: 'Close All', action: () => closeAllTabs(component) },
        { label: 'Close Others', action: () => closeOtherTabs(tab, component) },
        null,
        { label: tab.pinned ? 'Unpin' : 'Pin', action: () => togglePinTab(tab, component) },
        { label: 'Close Unpinned', action: () => closeUnpinnedTabs(component) }
    ];

    menuItems.forEach(item => {
        if (item === null) {
            const separator = document.createElement('div');
            separator.className = 'context-menu-separator';
            menu.appendChild(separator);
        } else {
            const menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item';
            menuItem.textContent = item.label;
            menuItem.addEventListener('click', (e) => {
                e.stopPropagation();
                item.action();
                menu.remove();
            });
            menu.appendChild(menuItem);
        }
    });

    return menu;
}

function cloneTab(tab, component) {
    const tabManager = component === 'center' ? window.centerTabsManager : window.rightTabsManager;
    tabManager.addTab(`${tab.name} (Copy)`, tab.content);
}

function closeAllTabs(component) {
    const tabManager = component === 'center' ? window.centerTabsManager : window.rightTabsManager;
    const tabs = tabManager.getTabs();
    [...tabs].forEach(tab => {
        if (!tab.pinned) {
            tabManager.removeTab(tab.name);
        }
    });
}

function closeOtherTabs(currentTab, component) {
    const tabManager = component === 'center' ? window.centerTabsManager : window.rightTabsManager;
    const tabs = tabManager.getTabs();
    [...tabs].forEach(tab => {
        if (tab.name !== currentTab.name && !tab.pinned) {
            tabManager.removeTab(tab.name);
        }
    });
}

function togglePinTab(tab, component) {
    const tabManager = component === 'center' ? window.centerTabsManager : window.rightTabsManager;
    const tabs = tabManager.getTabs();
    const tabIndex = tabs.findIndex(t => t.name === tab.name);
    
    if (tabIndex !== -1) {
        tabs[tabIndex].pinned = !tabs[tabIndex].pinned;
        tabManager.updateTabs();
    }
}

function closeUnpinnedTabs(component) {
    const tabManager = component === 'center' ? window.centerTabsManager : window.rightTabsManager;
    const tabs = tabManager.getTabs();
    [...tabs].forEach(tab => {
        if (!tab.pinned) {
            tabManager.removeTab(tab.name);
        }
    });
}

document.addEventListener('click', () => {
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
});
