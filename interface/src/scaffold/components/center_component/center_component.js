import { initTabComponent } from '/src/scaffold/shared/tab/js/tabComponent.js';

export async function initializeCenterComponent() {
    try {
        const tabManager = await initTabComponent({
            rootId: 'center-component',
            componentKey: 'center'
        });
        
        window.centerTabsManager = tabManager;
        
    } catch (error) {
        console.error('Error initializing center component:', error);
    }
}
