import { createComponentState } from '/src/scaffold/components/shared/js/state.js';
import { TabManager } from '/src/scaffold/components/shared/js/tabs.js';
import { DragDropManager } from '/src/scaffold/components/shared/js/dragDrop.js';

export async function initTabComponent({
    rootId,                 // 'center-component' | 'right-sidebar'
    componentKey,           // 'center' | 'right'
    afterMount = () => {}   // optional hook (e.g. resize wiring)
}) {
    const host = document.getElementById(rootId);
    
    try {
        const html = `
            <div class="tab-host-content">
                <div class="tabs-wrapper">
                    <div class="tabs-container"></div>
                </div>
                <div class="tab-content"></div>
            </div>
        `;
        
        host.innerHTML = html;

        await new Promise(resolve => requestAnimationFrame(resolve));
        
        const tabsContainer = host.querySelector('.tabs-container');
        const tabContent = host.querySelector('.tab-content');
        
        if (!tabsContainer || !tabContent) {
            throw new Error('Required DOM elements not found');
        }

        const state = createComponentState({
            tabs: [],
            tabsContainer: tabsContainer,
            tabContent: tabContent
        });

        const tabManager = new TabManager({
            state: state.getState(),
            container: tabsContainer,
            contentContainer: tabContent,
            component: componentKey
        });

        new DragDropManager({
            state: state.getState(),
            container: tabsContainer,
            component: componentKey,
            tabManager
        });

        await tabManager.createDefaultTab();
        afterMount(host, tabManager);
        
        return tabManager;
        
    } catch (error) {
        console.error(`Error initializing ${componentKey} component:`, error);
        throw error;
    }
} 