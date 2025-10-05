import { sharedState } from './state.js';
import { createTabContextMenu } from './contextMenu.js';

export class TabManager {
    constructor(config) {
        this.state = config.state;
        this.container = config.container;
        this.contentContainer = config.contentContainer;
        this.component = config.component;
        this.defaultTabName = config.defaultTabName || 'Home';
        this.defaultContent = config.defaultContent || '';
    }

    async addTab(tabName, content, contentElement = null, keepOriginalName = false, insertPosition = null, autoActivate = true) {
        try {
            let newTabName = tabName;
            
            if (!keepOriginalName) {
                let counter = (sharedState.tabNameCounters.get(tabName) || 0) + 1;
                
                while (sharedState.usedTabNames.has(newTabName)) {
                    newTabName = `${tabName} (${counter})`;
                    counter++;
                }
                
                sharedState.tabNameCounters.set(tabName, counter - 1);
            }
            
            sharedState.usedTabNames.add(newTabName);
            
            const newTab = {
                name: newTabName,
                content: content || `This is the content for ${newTabName}`,
                contentElement: contentElement,
                pinned: false
            };
            
            // Insert at specified position or at the end
            if (insertPosition !== null && insertPosition >= 0 && insertPosition <= this.state.tabs.length) {
                this.state.tabs.splice(insertPosition, 0, newTab);
            } else {
                this.state.tabs.push(newTab);
            }
            
            this.updateTabs();
            
            // Only activate the new tab if autoActivate is true
            if (autoActivate) {
                this.state.activeTab = newTabName;
                await this.setActiveTab(newTabName);
                sharedState.lastSelectedComponent = this.component;
            } else {
                // If not auto-activating, ensure the current active tab remains active
                if (this.state.activeTab) {
                    await this.setActiveTab(this.state.activeTab);
                }
            }
            return newTab;
        } catch (error) {
            console.error(`Error adding tab ${tabName}:`, error);
            throw error;
        }
    }

    findTab(tabName) {
        return this.container.querySelector(`.tab-button[data-tab-name="${tabName}"]`);
    }

    removeTab(tabName, keepNameReserved = false) {
        if (!keepNameReserved) {
            sharedState.usedTabNames.delete(tabName);
        }
        
        const index = this.state.tabs.findIndex(tab => tab.name === tabName);
        
        if (index !== -1) {
            const tabElement = this.findTab(tabName);
            const tab = this.state.tabs[index];
            
            this.state.tabs.splice(index, 1);
            
            // Tab element cleanup handled by DOM removal below

            try {
                if (tab && tab.contentElement && tab.contentElement.parentNode) {
                    tab.contentElement.remove();
                }
            } catch {}

            this.updateTabs();
            
            // Only change active tab if we removed the currently active tab
            if (this.state.activeTab === tabName) {
                if (this.state.tabs.length > 0) {
                    // Choose the next best tab to activate (prefer the tab that was after the removed one)
                    const nextIndex = Math.min(index, this.state.tabs.length - 1);
                    this.setActiveTab(this.state.tabs[nextIndex].name);
                } else {
                    this.contentContainer.innerHTML = '';
                    this.createDefaultTab();
                }
            } else {
                // If we didn't remove the active tab, ensure the active tab is still displayed
                if (this.state.activeTab && this.state.tabs.find(t => t.name === this.state.activeTab)) {
                    this.setActiveTab(this.state.activeTab);
                }
            }
        }
    }

    updateTabs() {
        if (!this.container) return;
        
        this.container.innerHTML = '';
        this.state.tabs.forEach(tab => {
            const button = this.createTabButton(tab);
            this.container.appendChild(button);
        });
    }

    async setActiveTab(tabName) {
        this.container.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });

        const activeButton = this.container.querySelector(
            `.tab-button[data-tab-name="${tabName}"]`
        );
        if (activeButton) {
            activeButton.classList.add('active');
        }

        const activeTab = this.state.tabs.find(tab => tab.name === tabName);
        if (activeTab && this.contentContainer) {
            if (!activeTab.contentElement) {
                const contentDiv = document.createElement('div');
                contentDiv.innerHTML = activeTab.content;
                activeTab.contentElement = contentDiv;
            }
            if (!this.contentContainer.contains(activeTab.contentElement)) {
                this.contentContainer.appendChild(activeTab.contentElement);
            }

            this.state.tabs.forEach(t => {
                if (t.contentElement) {
                    t.contentElement.style.display = (t.name === tabName) ? 'flex' : 'none';
                }
            });

            this.state.activeTab = tabName;
            sharedState.lastSelectedComponent = this.component;
        }
    }

    createTabButton(tab) {
        const button = document.createElement('button');
        button.className = 'tab-button';
        button.setAttribute('draggable', 'true');
        button.setAttribute('data-tab-name', tab.name);
        
        if (tab.name === this.state.activeTab) {
            button.classList.add('active');
        }

        const nameSpan = document.createElement('span');
        nameSpan.className = 'tab-name';
        if (tab.pinned) nameSpan.classList.add('pinned');
        nameSpan.textContent = tab.name;

        button.appendChild(nameSpan);

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.className = 'close-tab';
                    closeBtn.onclick = (e) => {
                e.stopPropagation();
                try {
                    const event = new CustomEvent('tabs:removed', {
                        detail: {
                            component: this.component,
                            tabName: tab.name,
                            contentElement: tab.contentElement
                        }
                    });
                    document.dispatchEvent(event);
                } catch {}
                this.removeTab(tab.name);
            };

        button.appendChild(closeBtn);

        button.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const existingMenu = document.querySelector('.context-menu');
            if (existingMenu) existingMenu.remove();
            
            const menu = createTabContextMenu(tab, this.component);
            document.body.appendChild(menu);
            
            menu.style.left = `${e.pageX}px`;
            menu.style.top = `${e.pageY}px`;
        });

        button.addEventListener('click', () => {
            this.setActiveTab(tab.name);
        });

        return button;
    }

    async createDefaultTab() {
        if (this.state.tabs.length === 0) {
            try {
                const response = await fetch('/src/programs/system/home/home.html');
                const content = await response.text();
                const newTab = await this.addTab(this.defaultTabName, content);
                try {
                    const module = await import('/src/programs/system/home/home.js');
                    const root = (newTab && newTab.contentElement)
                        ? newTab.contentElement.querySelector('.search-container')
                        : (this.contentContainer ? this.contentContainer.querySelector('.search-container') : null);
                    if (module.initializeHome) {
                        module.initializeHome(root || newTab.contentElement || this.contentContainer);
                    }
                } catch (e) {
                    console.error('Error initializing default Home:', e);
                }
            } catch (error) {
                console.error('Error loading home content:', error);
                await this.addTab(this.defaultTabName, 'Welcome to openThalis');
            }
        }
    }

    getTabs() {
        return this.state.tabs;
    }
}
