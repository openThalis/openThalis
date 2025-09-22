import { setupEventListeners } from '/src/scaffold/components/left_component/js/events.js';
import { initializeMenu } from '/src/scaffold/components/left_component/js/menu.js';

export function initializeLeftSidebar() {
    const leftSidebar = document.getElementById('left-sidebar');
    
    if (!leftSidebar) {
        console.error('Left sidebar element not found');
        return;
    }

    return fetch('/src/scaffold/components/left_component/left_component.html')
        .then(response => response.text())
        .then(html => {
            leftSidebar.innerHTML = html;
            
            initializeMenu();
            setupEventListeners();
        })
        .catch(error => {
            console.error('Error initializing left sidebar:', error);
        });
}
