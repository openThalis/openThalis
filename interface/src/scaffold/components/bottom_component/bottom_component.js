export const altarState = {
    isVisible: true,
    isMinimized: true,
};

import { setupEventListeners } from '/src/scaffold/components/bottom_component/js/events.js';
import { AltarTerminal } from '/src/scaffold/components/bottom_component/js/altar.js';

export function initializeBottomComponent() {
    return new Promise((resolve, reject) => {
        try {
            const bottomComponent = document.getElementById('bottom-component');
            if (!bottomComponent) {
                throw new Error('Bottom component element not found');
            }

            fetch('/src/scaffold/components/bottom_component/bottom_component.html')
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.text();
                })
                .then(html => {
                    bottomComponent.innerHTML = html;

                    requestAnimationFrame(() => {
                        const altarBar = bottomComponent.querySelector('.altar-bar');
                        
                        if (altarBar) {
                            altarBar.classList.add('minimized');
                            bottomComponent.style.height = '30px';
                        }

                        setupEventListeners();

                        const altarTerminal = new AltarTerminal();
                        altarTerminal.initialize().catch(error => {
                            console.error('Failed to initialize AltarTerminal:', error);
                        });
                        
                        resolve();
                    });
                })
                .catch(error => {
                    console.error('Error loading bottom component:', error);
                    reject(error);
                });
        } catch (error) {
            console.error('Error initializing bottom component:', error);
            reject(error);
        }
    });
}
