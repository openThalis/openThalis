import {MENU_SECTIONS } from '/src/scaffold/components/left_component/js/constants.js';

export function initializeMenu() {

    try {
        initializeMenuSection('system-menu-section', MENU_SECTIONS.system);

        initializeMenuSection('eidos-menu-section', MENU_SECTIONS.eidos);

        initializeMenuSection('envs-menu-section', MENU_SECTIONS.envs);

        initializeMenuSection('public-menu-section', MENU_SECTIONS.public);
    } catch (error) {
        console.error('Error in initializeMenu:', error);
        throw error;
    }
}



function initializeMenuSection(sectionId, items) {
    
    const section = document.getElementById(sectionId);
    if (!section) {
        console.error(`Section element not found: ${sectionId}`);
        return;
    }

    if (!items || !Array.isArray(items)) {
        console.error(`Invalid items for section ${sectionId}:`, items);
        return;
    }

    items.forEach((item, index) => {
        const button = document.createElement('button');
        button.className = 'menu-item';
        button.dataset.action = item.action;

        if (item.icon) {
            const iconSpan = document.createElement('span');
            iconSpan.className = 'icon';
            iconSpan.textContent = item.icon;
            button.appendChild(iconSpan);
        }

        const textContent = `${item.prefix || ''}${item.name}`;
        if (item.icon) {
            button.appendChild(document.createTextNode(' ' + textContent));
        } else {
            button.textContent = textContent;
        }

        section.appendChild(button);
    });
    
}
