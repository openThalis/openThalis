import { TaskManager } from './js/taskManager.js';
import { TaskUI } from './js/TaskUI.js';
import { TaskSettings } from './js/TaskSettings.js';
import { DeletePopup } from './js/deletePopup.js';
import { TaskDetailsPopup } from './js/TaskDetailsPopup.js';
import { EventHandlers } from './js/components/eventHandlers.js';
import { GlobalTaskUpdater } from './js/components/globalTaskUpdater.js';


function initializeApp(containerElement = null) {

    const scope = containerElement || document;

    const taskManager = new TaskManager();
    const taskUI = new TaskUI(taskManager, scope);
    const eventHandlers = new EventHandlers(taskUI);

    // Initialize popup components
    const taskSettings = new TaskSettings(taskUI);
    const deletePopup = new DeletePopup(taskUI);
    const taskDetailsPopup = new TaskDetailsPopup(taskUI);

    // Initialize global task updater
    const globalTaskUpdater = new GlobalTaskUpdater(taskUI);

    // Set component references
    taskUI.setComponents(taskSettings, deletePopup, taskDetailsPopup);

    taskUI.initialize();
    eventHandlers.initialize();

    // Start global task updates
    globalTaskUpdater.startUpdates();


    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.tasksApp = {
            taskManager,
            taskUI,
            eventHandlers,
            taskSettings,
            deletePopup,
            taskDetailsPopup,
            globalTaskUpdater
        };
    }

    return { taskManager, taskUI, eventHandlers, taskSettings, deletePopup, taskDetailsPopup, globalTaskUpdater };
}


export function initializeTasks(containerElement = null) {
    return initializeApp(containerElement);
}


