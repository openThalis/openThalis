import { formatDateTime, sanitizeHTML } from '../utils.js';

export class TaskRenderer {
    constructor(taskUI) {
        this.taskUI = taskUI;
    }

    renderTasks() {
        const tasks = this.taskUI.taskManager.getAllTasks();

        if (tasks.length === 0) {
            this.taskUI.elements.taskList.innerHTML = `
                <div class="empty-state">
                    No tasks yet. Add your first task above!
                </div>
            `;
            return;
        }

        this.taskUI.elements.taskList.innerHTML = tasks.map(task => this.renderTask(task)).join('');
        this.bindTaskEvents();
    }

    renderTask(task) {
        const lastRunText = formatDateTime(task.last_run || task.lastRun);
        const isRunning = task.running_status;
        const runIcon = isRunning ? '⏹️' : '🔄';
        const runTitle = isRunning ? 'Stop' : 'Run';
        const agentText = task.assigned_agent ? ` • Agent: ${task.assigned_agent}` : '';

        return `
            <div class="task-item" data-task-id="${task.id}">
                <div class="task-content">
                    <div class="task-header">
                        <h3 class="task-title">${sanitizeHTML(task.title)}</h3>
                        <div class="task-schedule">
                            <span class="schedule-text">${sanitizeHTML(task.schedule_summary || '')}${agentText}</span>
                        </div>
                    </div>
                    <div class="task-status">
                        <div class="status-info">
                            <div class="schedule-icon">
                                <span class="icon-btn run-btn" title="${runTitle}">${runIcon}</span>
                                <span class="icon-btn edit-btn" title="Edit">⚙️</span>
                            </div>
                            <span class="last-run">${lastRunText}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    bindTaskEvents() {
        this.taskUI.scope.querySelectorAll('.run-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const taskId = e.target.closest('.task-item').dataset.taskId;
                if (this.taskUI && this.taskUI.handleTaskClick) {
                    await this.taskUI.handleTaskClick(taskId, 'run');
                }
            });
        });

        this.taskUI.scope.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const taskId = e.target.closest('.task-item').dataset.taskId;
                if (this.taskUI && this.taskUI.handleTaskClick) {
                    await this.taskUI.handleTaskClick(taskId, 'edit');
                }
            });
        });

        this.taskUI.scope.querySelectorAll('.task-item').forEach(item => {
            item.addEventListener('click', async (e) => {
                if (!e.target.classList.contains('icon-btn')) {
                    const taskId = item.dataset.taskId;
                    if (this.taskUI && this.taskUI.handleShowTaskDetails) {
                        await this.taskUI.handleShowTaskDetails(taskId);
                    }
                }
            });
        });
    }
}
