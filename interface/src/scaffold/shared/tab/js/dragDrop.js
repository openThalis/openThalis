import { sharedState } from './state.js';

export class DragDropManager {
    constructor({ state, container, component, tabManager }) {
        this.state = state;
        this.container = container;
        this.component = component;
        this.tabManager = tabManager;
        this.setupDragDrop();
    }

    setupDragDrop() {
        this.container.addEventListener('dragstart', (e) => this.handleDragStart(e));
        this.container.addEventListener('dragend', (e) => this.handleDragEnd(e));
        this.container.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.container.addEventListener('drop', (e) => this.handleDrop(e));
    }

    handleDragStart(e) {
        const tabElement = e.target.closest('.tab-button');
        if (!tabElement) return;

        const tabId = tabElement.getAttribute('data-tab-id');
        const tabName = tabElement.getAttribute('data-tab-name');
        
        e.dataTransfer.setData('text/plain', JSON.stringify({
            tabId,
            tabName,
            sourceComponent: this.component
        }));
        
        e.target.classList.add('dragging');
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        this.clearDropIndicators();
    }

    handleDragOver(e) {
        e.preventDefault();
        
        try {
            const draggedElement = document.querySelector('.tab-button.dragging');
            if (draggedElement) {
                const draggedTabName = draggedElement.getAttribute('data-tab-name');
                
                if (draggedTabName) {
                    this.showDropIndicator(e);
                }
            }
        } catch (error) {
        }
    }

    async handleDrop(e) {
        e.preventDefault();
        this.clearDropIndicators();
        
        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));

            if (data.sourceComponent === this.component) {
                this.handleSameComponentReorder(e, data);
                return;
            }

            const sourceManager = data.sourceComponent === 'center' ?
                window.centerTabsManager : window.rightTabsManager;

            const sourceTab = sourceManager.state.tabs.find(tab => tab.name === data.tabName);
            if (!sourceTab) return;

            let localTabUrl = null;
            let localIframe = null;
            let chatsInstanceId = null;
            let savedScrollPosition = null;
            const contentElement = sourceTab.contentElement;
            if (contentElement) {
                localIframe = contentElement.querySelector('iframe[src*="local.html"]') ||
                              contentElement.querySelector('iframe[src*="local.local.html"]') ||
                              contentElement.querySelector('iframe[src*="/local.html"]');
                if (localIframe) {
                    localTabUrl = localIframe.src;

                    try {
                        const urlObj = new URL(localIframe.src);
                        const pathParam = urlObj.searchParams.get('path');
                    } catch (e) {
                    }
                }

                const chatsRoot = contentElement.querySelector('.chats-component');
                if (chatsRoot) {
                    chatsInstanceId = chatsRoot.dataset.chatsInstanceId;

                    const messagesContainer = chatsRoot.querySelector('.messages-container');
                    if (messagesContainer) {
                        savedScrollPosition = messagesContainer.scrollTop;
                    }

                    if (chatsInstanceId) {
                        try {
                            const chatsModule = await import('/src/programs/eidos/chats/chats.js');
                            chatsModule.markInstanceAsBeingMoved(chatsInstanceId);
                        } catch (err) {
                            console.warn('Could not mark Chats instance as being moved:', err);
                        }
                    }
                }

                if (!localIframe) {
                    contentElement.remove();
                }
            }

            sharedState.usedTabNames.delete(data.tabName);

            let finalContent = sourceTab.content;
            let finalContentElement = contentElement;

            if (localTabUrl) {
                let currentPath = null;
                try {
                    const iframeWindow = localIframe.contentWindow;
                    if (iframeWindow && iframeWindow.localState && iframeWindow.localState.cwd) {
                        currentPath = iframeWindow.localState.cwd;
                    } else {
                        const urlObj = new URL(localIframe.src);
                        currentPath = urlObj.searchParams.get('path');
                    }
                } catch (e) {
                    try {
                        const urlObj = new URL(localIframe.src);
                        currentPath = urlObj.searchParams.get('path');
                    } catch (urlError) {
                    }
                }

            const baseUrl = '/src/programs/envs/local/local.html';
            const newUrl = currentPath ? `${baseUrl}?path=${encodeURIComponent(currentPath)}` : baseUrl;

            const iframeHtml = `
                <div class="program-iframe-wrapper" style="width:100%;height:100%;">
                  <iframe
                  src="${newUrl}"
                  style="width:100%;height:100%;border:0;display:block;"
                  ></iframe>
                </div>
            `;

            finalContent = iframeHtml;
            finalContentElement = null;
            }

            const destinationActiveTab = this.tabManager.state.activeTab;
            const sourceActiveTab = sourceManager.state.activeTab;
            const isMovingActiveTab = data.tabName === sourceActiveTab;
            
            const dropPosition = this.calculateDropIndex(e);
            const newTab = await this.tabManager.addTab(data.tabName, finalContent, finalContentElement, true, dropPosition, false); // autoActivate = false

            sourceManager.removeTab(data.tabName, true);
            
            if (destinationActiveTab && this.tabManager.state.tabs.find(tab => tab.name === destinationActiveTab)) {
                await this.tabManager.setActiveTab(destinationActiveTab);
            }

            if (contentElement) {
                try {
                    contentElement.remove();
                } catch (e) {
                    console.warn('Could not remove content element:', e);
                }
            }

            // Don't automatically switch to the moved tab - preserve existing active states

            if (chatsInstanceId) {
                try {
                    const chatsModule = await import('/src/programs/eidos/chats/chats.js');
                    chatsModule.unmarkInstanceAsBeingMoved(chatsInstanceId);

                    if (savedScrollPosition !== null && newTab && newTab.contentElement) {
                        const chatsRoot = newTab.contentElement.querySelector('.chats-component');
                        if (chatsRoot) {
                            const messagesContainer = chatsRoot.querySelector('.messages-container');
                            if (messagesContainer) {
                                requestAnimationFrame(() => {
                                    messagesContainer.scrollTop = savedScrollPosition;
                                });
                            }
                        }
                    }
                } catch (err) {
                    console.warn('Could not unmark Chats instance as being moved:', err);
                }
            }

        } catch (error) {
            console.error('Error during tab drop:', error);
        }
    }

    handleSameComponentReorder(e, data) {
        const draggedTabName = data.tabName;
        const tabs = this.state.tabs;
        const draggedTabIndex = tabs.findIndex(tab => tab.name === draggedTabName);
        
        if (draggedTabIndex === -1) return;

        const dropIndex = this.calculateDropIndex(e);
        
        if (dropIndex === draggedTabIndex || dropIndex === draggedTabIndex + 1) {
            return;
        }

        const draggedTab = tabs.splice(draggedTabIndex, 1)[0];
        
        const adjustedDropIndex = dropIndex > draggedTabIndex ? dropIndex - 1 : dropIndex;
        tabs.splice(adjustedDropIndex, 0, draggedTab);

        this.tabManager.updateTabs();
        
        if (this.state.activeTab === draggedTabName) {
            this.tabManager.setActiveTab(draggedTabName);
        }
    }

    calculateDropIndex(e) {
        const tabButtons = Array.from(this.container.querySelectorAll('.tab-button'));
        const mouseX = e.clientX;
        
        for (let i = 0; i < tabButtons.length; i++) {
            const button = tabButtons[i];
            const rect = button.getBoundingClientRect();
            const buttonCenter = rect.left + rect.width / 2;
            
            if (mouseX < buttonCenter) {
                return i;
            }
        }
        
        return tabButtons.length;
    }

    showDropIndicator(e) {
        this.clearDropIndicators();
        
        const tabButtons = Array.from(this.container.querySelectorAll('.tab-button'));
        const draggedElement = document.querySelector('.tab-button.dragging');
        const mouseX = e.clientX;
        
        let insertIndex = 0;
        
        for (let i = 0; i < tabButtons.length; i++) {
            const button = tabButtons[i];
            const rect = button.getBoundingClientRect();
            const buttonCenter = rect.left + rect.width / 2;
            
            if (mouseX < buttonCenter) {
                insertIndex = i;
                break;
            } else {
                insertIndex = i + 1;
            }
        }
        
        const draggedIndex = tabButtons.indexOf(draggedElement);
        const isSameComponent = draggedIndex !== -1;
        
        if (isSameComponent && (insertIndex === draggedIndex || insertIndex === draggedIndex + 1)) {
            return;
        }
        
        const indicator = document.createElement('div');
        indicator.className = 'tab-drop-indicator';
        
        if (insertIndex === 0) {
            if (tabButtons.length > 0) {
                this.container.insertBefore(indicator, tabButtons[0]);
            } else {
                this.container.appendChild(indicator);
            }
        } else if (insertIndex >= tabButtons.length) {
            this.container.appendChild(indicator);
        } else {
            this.container.insertBefore(indicator, tabButtons[insertIndex]);
        }
    }

    clearDropIndicators() {
        const indicators = this.container.querySelectorAll('.tab-drop-indicator');
        indicators.forEach(indicator => indicator.remove());
    }
}
