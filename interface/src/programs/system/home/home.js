export function initializeHome(rootElement) {
    if (!rootElement || rootElement.dataset.homeInitialized === 'true') {
        return;
    }
    rootElement.dataset.homeInitialized = 'true';

    const homeInput = rootElement.querySelector('.home-input');
    const settingsBtn = rootElement.querySelector('.settings-btn');
    const dropdownContent = rootElement.querySelector('.dropdown-content');
    const dropdownItems = rootElement.querySelectorAll('.dropdown-item');
    const sendBtn = rootElement.querySelector('.home-send-btn');

    async function submithome() {
        if (!homeInput) return;
        const value = homeInput.value.trim();
        if (!value) return;

        // Optimistic UI: disable interactions to prevent duplicate sends
        if (sendBtn) sendBtn.disabled = true;
        homeInput.disabled = true;

        try {
            await openChatsAndSend(value);
            homeInput.value = '';
        } catch (err) {
            console.error('Failed to open chats and send message:', err);
        } finally {
            if (sendBtn) sendBtn.disabled = false;
            homeInput.disabled = false;
            homeInput.focus();
        }
    }

    async function openChatsAndSend(message) {
        // Find which tab manager contains this Home root
        const centerContainer = document.querySelector('#center-component .tab-content');
        const rightContainer = document.querySelector('#right-sidebar .tab-content');
        let manager = null;
        if (centerContainer && centerContainer.contains(rootElement) && window.centerTabsManager) {
            manager = window.centerTabsManager;
        } else if (rightContainer && rightContainer.contains(rootElement) && window.rightTabsManager) {
            manager = window.rightTabsManager;
        } else {
            manager = window.centerTabsManager || window.rightTabsManager;
        }
        if (!manager) throw new Error('Tab manager not available');

        // Load Chats HTML
        const resp = await fetch('/src/programs/eidos/chats/chats.html');
        if (!resp.ok) throw new Error('Failed to load Chats UI');
        const content = await resp.text();

        // Replace current tab's content with Chats, and rename the tab to Chats
        const tabs = manager.getTabs();
        const currentName = manager.state.activeTab;
        const activeTab = tabs.find(t => t.name === currentName) || tabs[tabs.length - 1];
        if (!activeTab) throw new Error('Active tab not found');

        // Update content element in-place
        if (!activeTab.contentElement) {
            activeTab.contentElement = document.createElement('div');
        }
        activeTab.content = content;
        activeTab.contentElement.innerHTML = content;

        // Compute unique title 'Chats'
        let newTitle = 'Chats';
        let counter = 2;
        while (tabs.some(x => x !== activeTab && x.name === newTitle)) {
            newTitle = `Chats (${counter++})`;
        }
        try {
            const stateMod = await import('/src/scaffold/shared/tab/js/state.js');
            try { stateMod.sharedState.usedTabNames.delete(activeTab.name); } catch {}
            activeTab.name = newTitle;
            try { stateMod.sharedState.usedTabNames.add(newTitle); } catch {}
        } catch {
            activeTab.name = newTitle;
        }

        manager.updateTabs();
        await manager.setActiveTab(newTitle);

        // Initialize Chats module in-place and capture instance id
        const chatsModule = await import('/src/programs/eidos/chats/chats.js');
        const chatsRoot = activeTab.contentElement ? activeTab.contentElement.querySelector('.chats-component') : null;
        const instanceId = chatsModule.initializeChats(chatsRoot || activeTab.contentElement);

        // Ensure WebSocket is ready before sending
        try {
            const wsMod = await import('/src/programs/eidos/chats/js/websocket.js');
            await wsMod.waitForSocketReady(instanceId, 6000);
        } catch {}

        // Create a new conversation, then send the message
        const { startNewChat } = await import('/src/programs/eidos/chats/components/left_bar/left_bar.js');
        const convoRoot = chatsRoot || activeTab.contentElement;
        await startNewChat(convoRoot, instanceId);

        const convoMod = await import('/src/programs/eidos/chats/components/conversation/conversation.js');
        await convoMod.sendMessage(convoRoot, instanceId, message);
    }

    if (homeInput) {
        homeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submithome();
            }
        });

        homeInput.addEventListener('focus', () => {
            const box = rootElement.querySelector('.home-box-container');
            if (box) box.style.transform = 'translateY(-2px)';
        });

        homeInput.addEventListener('blur', () => {
            const box = rootElement.querySelector('.home-box-container');
            if (box) box.style.transform = 'translateY(0)';
        });
    }

    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            submithome();
        });
    }

    if (settingsBtn && dropdownContent) {
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownContent.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            const target = e.target;
            if (!settingsBtn.contains(target) && !dropdownContent.contains(target)) {
                dropdownContent.classList.remove('show');
            }
        });
    }

    dropdownItems.forEach((item) => {
        item.addEventListener('click', () => {
            if (item.classList.contains('disabled')) {
                return;
            }

            dropdownItems.forEach((dropdownItem) => {
                dropdownItem.classList.remove('selected');
                const checkmark = dropdownItem.querySelector('.checkmark');
                if (checkmark) {
                    checkmark.style.display = 'none';
                }
            });

            item.classList.add('selected');
            let checkmark = item.querySelector('.checkmark');
            if (!checkmark) {
                checkmark = document.createElement('span');
                checkmark.className = 'checkmark';
                checkmark.textContent = '✓';
                item.appendChild(checkmark);
            }
            checkmark.style.display = 'inline';

            if (dropdownContent) dropdownContent.classList.remove('show');
        });
    });
}

