import { formatDateTime, sanitizeHTML } from './utils.js';
import { ResponseManager } from './components/responseManager.js';
import { LiveUpdates } from './components/liveUpdates.js';
import { DeleteManager } from './components/deleteManager.js';

export class TaskDetailsPopup {
    constructor(uiInstance) {
        this.ui = uiInstance;
        this.elements = {};
        this.currentTask = null;
        this.responses = [];
        this.hasNewResponses = false;

        // Initialize component managers
        this.responseManager = new ResponseManager(this);
        this.liveUpdates = new LiveUpdates(this);
        this.deleteManager = new DeleteManager(this);

        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.elements = {
            panel: this.ui.getElementById('taskDetailsPopup'),
            sidebar: this.ui.getElementById('tasksSidebar'),
            closeBtn: this.ui.getElementById('closeTaskDetailsPopup'),
            titleEl: this.ui.getElementById('taskDetailsTitle'),
            agentEl: this.ui.getElementById('taskDetailsAgent'),
            descriptionEl: this.ui.getElementById('taskDetailsDescription'),
            scheduleEl: this.ui.getElementById('taskDetailsSchedule'),
            lastRunEl: this.ui.getElementById('taskDetailsLastRun'),
            editBtn: this.ui.getElementById('taskDetailsEditBtn'),
            chatBtn: this.ui.getElementById('taskDetailsChatBtn'),
            responseEl: this.ui.getElementById('taskDetailsResponse'),
            responseDateTimeEl: this.ui.getElementById('responseDateTime'),
            responseNavigation: this.ui.getElementById('responseNavigation'),
            prevResponseBtn: this.ui.getElementById('prevResponseBtn'),
            nextResponseBtn: this.ui.getElementById('nextResponseBtn'),
            latestResponseBtn: this.ui.getElementById('latestResponseBtn'),
            deleteResponseBtn: this.ui.getElementById('deleteResponseBtn'),
            responseCounter: this.ui.getElementById('responseCounter')
        };
    }

    bindEvents() {
        // Close panel events
        this.elements.closeBtn && this.elements.closeBtn.addEventListener('click', () => this.close());

        // Edit button event
        this.elements.editBtn && this.elements.editBtn.addEventListener('click', () => {
            this.handleEdit();
        });

        // Chat button event
        this.elements.chatBtn && this.elements.chatBtn.addEventListener('click', () => {
            this.handleChat();
        });

        // Bind component events
        this.responseManager.bindResponseNavigationEvents();
        this.deleteManager.bindDeleteEvents();

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.elements.panel?.classList.contains('hidden')) {
                this.close();
            }
        });
    }

    async open(task) {
        // Hide task settings panel if it's open
        const taskSettingsPanel = this.ui.getElementById('taskSettings');
        if (taskSettingsPanel) {
            taskSettingsPanel.classList.add('hidden');
        }

        this.hideNewResponseIndicator();
        this.hasNewResponses = false;

        // Show sidebar and task details panel first with loading state
        this.elements.sidebar?.classList.remove('hidden');
        this.elements.panel?.classList.remove('hidden');
        
        // Set initial task data (for immediate display)
        this.currentTask = task;
        this.populateTaskDetails(task);

        // IMMEDIATELY fetch fresh data from server
        try {
            const { getTask } = await import('./api.js');
            if (typeof getTask === 'function') {
                const freshTask = await getTask(task.id);
                
                if (freshTask && freshTask.id === task.id) {
                    // Update both popup and task manager with fresh data
                    this.currentTask = freshTask;
                    
                    // Update task manager too
                    const taskInManager = this.ui.taskManager.getTask(freshTask.id);
                    if (taskInManager) {
                        Object.assign(taskInManager, freshTask);
                    }
                    
                    // Re-populate with fresh data
                    this.populateTaskDetails(freshTask);
                }
            }
        } catch (error) {
            console.warn('Failed to fetch fresh task data on open:', error);
            // Continue with existing data if fetch fails
        }

        // Start live updates for future changes
        this.liveUpdates.startLiveUpdates();
    }

    close() {
        // Cancel any pending delete confirmation when closing
        this.deleteManager.exitDeleteConfirmation();

        // Stop live updates
        this.liveUpdates.stopLiveUpdates();

        this.elements.panel?.classList.add('hidden');
        this.elements.sidebar?.classList.add('hidden');
        this.currentTask = null;
    }

    populateTaskDetails(task, isLiveUpdate = false, preserveIndex = null) {
        // Set title
        if (this.elements.titleEl) {
            this.elements.titleEl.textContent = task.title || 'Untitled Task';
        }

        // Set assigned agent
        if (this.elements.agentEl) {
            this.elements.agentEl.textContent = task.assigned_agent || 'No agent assigned';
        }

        // Set description
        if (this.elements.descriptionEl) {
            const description = task.description || 'No description provided.';
            this.elements.descriptionEl.innerHTML = sanitizeHTML(description).replace(/\n/g, '<br>');
        }

        // Set schedule
        if (this.elements.scheduleEl) {
            this.elements.scheduleEl.textContent = task.schedule_summary || 'No schedule set';
        }

        // Set last run
        if (this.elements.lastRunEl) {
            const lastRunText = formatDateTime(task.last_run || task.lastRun);
            this.elements.lastRunEl.textContent = lastRunText;
        }

        // Handle responses
        this.responses = task.responses || [];

        if (isLiveUpdate && preserveIndex !== null) {
            // During live updates, preserve the user's current position
            // But ensure it's within bounds in case responses were deleted
            if (this.responses.length === 0) {
                this.responseManager.currentResponseIndex = 0;
            } else {
                this.responseManager.currentResponseIndex = Math.min(preserveIndex, this.responses.length - 1);
            }
        } else {
            // Initial load: go to latest response
            this.responseManager.currentResponseIndex = this.responses.length > 0 ? this.responses.length - 1 : 0;
        }

        this.responseManager.updateResponseDisplay();
    }

    handleEdit() {
        if (this.currentTask) {
            // Store the task ID before clearing currentTask
            const taskId = this.currentTask.id;

            // Just hide this panel, don't close the entire sidebar
            this.elements.panel?.classList.add('hidden');
            this.currentTask = null;

            // Dispatch edit event - taskSettings will handle showing itself
            const event = new CustomEvent('taskEditFromDetails', {
                detail: { taskId: taskId }
            });
            this.ui.scope.dispatchEvent(event);
        }
    }

    async handleChat() {
        try {
            if (!this.currentTask) {
                alert('No task selected for chat');
                return;
            }

            const taskTitle = this.currentTask.title || 'Untitled Task';
            const taskDescription = this.currentTask.description || '';

            // Build user message: title + blank line + description (if any)
            const userMessage = taskDescription
                ? `${taskTitle}\n\n${taskDescription}`
                : `${taskTitle}`;

            // Build conversation title: "task title + date & hour"
            const formattedNow = (() => {
                const d = new Date();
                const pad = (n) => String(n).padStart(2, '0');
                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
            })();
            const conversationTitle = `${taskTitle} - ${formattedNow}`;

            // Determine current visible response text
            let assistantMessage = "This task hasn't been run yet.";
            const idx = this.responseManager?.currentResponseIndex ?? -1;
            if (Array.isArray(this.responses) && this.responses.length > 0 && idx >= 0 && idx < this.responses.length) {
                assistantMessage = this.responses[idx]?.response || assistantMessage;
            }

            // Find which tab manager contains this Tasks root
            const rootElement = this.ui.scope && this.ui.scope !== document ? this.ui.scope : document;
            const centerContainer = document.querySelector('#center-component .tab-content');
            const rightContainer = document.querySelector('#right-sidebar .tab-content');
            let manager = null;
            if (centerContainer && rootElement && centerContainer.contains(rootElement) && window.centerTabsManager) {
                manager = window.centerTabsManager;
            } else if (rightContainer && rootElement && rightContainer.contains(rootElement) && window.rightTabsManager) {
                manager = window.rightTabsManager;
            } else {
                manager = window.centerTabsManager || window.rightTabsManager;
            }
            if (!manager) {
                alert('Unable to open Chats: tab manager not available');
                return;
            }

            // Load Chats HTML
            const htmlResp = await fetch('/src/programs/eidos/chats/chats.html');
            if (!htmlResp.ok) throw new Error('Failed to load Chats UI');
            const chatsHtml = await htmlResp.text();

            // Replace current tab's content with Chats, and rename the tab to Chats
            const tabs = manager.getTabs();
            const currentName = manager.state.activeTab;
            const activeTab = tabs.find(t => t.name === currentName) || tabs[tabs.length - 1];
            if (!activeTab) throw new Error('Active tab not found');

            if (!activeTab.contentElement) {
                activeTab.contentElement = document.createElement('div');
            }
            activeTab.content = chatsHtml;
            activeTab.contentElement.innerHTML = chatsHtml;

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

            // Initialize Chats module and get instance id
            const chatsModule = await import('/src/programs/eidos/chats/chats.js');
            const chatsRoot = activeTab.contentElement ? activeTab.contentElement.querySelector('.chats-component') : null;
            const instanceId = chatsModule.initializeChats(chatsRoot || activeTab.contentElement);

            // Create a new conversation and seed with two messages
            const { default: httpClient } = await import('/src/scaffold/shared/http/httpClient.js');
            const createResp = await httpClient.apiPost('/conversations');
            if (!createResp.ok) throw new Error('Failed to create conversation');
            const createData = await createResp.json();
            const conversationId = createData.conversation_id;

            // Set conversation title to the task title
            await httpClient.apiPut(`/conversations/${conversationId}/title`, { title: conversationTitle });

            // Add user and assistant messages directly
            await httpClient.apiPost(`/conversations/${conversationId}/messages/add`, { content: userMessage, role: 'user' });
            await httpClient.apiPost(`/conversations/${conversationId}/messages/add`, { content: assistantMessage, role: 'assistant' });

            // Load conversations and open the created one
            const { loadConversations, loadConversation } = await import('/src/programs/eidos/chats/components/left_bar/left_bar.js');
            const convoRoot = chatsRoot || activeTab.contentElement;
            await loadConversations(convoRoot, instanceId);
            await loadConversation(convoRoot, instanceId, conversationId);

        } catch (err) {
            console.error('Failed to open chat for task:', err);
            alert('Failed to open chat for this task. Please try again.');
        }
    }

    // Proxy methods for live updates
    hasTaskChanged(updatedTask) {
        return this.liveUpdates.hasTaskChanged(updatedTask);
    }

    updateTaskDetails(updatedTask) {
        return this.liveUpdates.updateTaskDetails(updatedTask);
    }

    showNewResponseIndicator() {
        return this.liveUpdates.showNewResponseIndicator();
    }

    hideNewResponseIndicator() {
        return this.liveUpdates.hideNewResponseIndicator();
    }
}
