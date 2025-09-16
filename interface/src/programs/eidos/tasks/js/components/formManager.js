export class FormManager {
    constructor(taskSettings) {
        this.taskSettings = taskSettings;
    }

    getFormData() {
        const title = this.taskSettings.elements.titleInput.value.trim();
        const description = this.taskSettings.elements.descriptionInput.value.trim();

        return {
            title,
            description: description || null,
            assigned_agent: this.taskSettings.elements.agentSelect.value || null,
            schedule_summary: this.taskSettings.frequencyManager.generateScheduleText(),
            running_status: this.taskSettings.currentTask ? this.taskSettings.currentTask.running_status : true
        };
    }

    validateForm() {
        const title = this.taskSettings.elements.titleInput.value.trim();
        const description = this.taskSettings.elements.descriptionInput.value.trim();

        if (!title) {
            return { valid: false, message: 'Task title is required' };
        }
        if (title.length > 255) {
            return { valid: false, message: 'Task title too long (max 255 characters)' };
        }
        
        // Check for duplicate task names
        const existingTasks = this.taskSettings.ui.taskManager.getAllTasks();
        const currentTaskId = this.taskSettings.isEditMode ? this.taskSettings.editingTaskId : null;
        
        const duplicateTask = existingTasks.find(task => 
            task.title.trim().toLowerCase() === title.toLowerCase() && 
            String(task.id) !== String(currentTaskId)
        );
        
        if (duplicateTask) {
            return { valid: false, message: 'A task with this name already exists' };
        }
        
        if (!description) {
            return { valid: false, message: 'Task description is required' };
        }
        return { valid: true };
    }

    populateForm(task) {
        this.taskSettings.elements.titleInput.value = task.title || '';
        this.taskSettings.elements.descriptionInput.value = task.description || '';
        this.taskSettings.elements.agentSelect.value = task.assigned_agent || '';

        // Parse the schedule summary to restore original settings
        const parsedSchedule = this.taskSettings.frequencyManager.parseScheduleText(task.schedule_summary);

        // Set the parsed values
        this.taskSettings.frequencyManager.isNow = parsedSchedule.isNow;
        this.taskSettings.elements.timeInput.value = parsedSchedule.time;
        this.taskSettings.elements.dateInput.value = parsedSchedule.date;
        this.taskSettings.elements.dayOfWeekSelect.value = parsedSchedule.dayOfWeek.toString();
        this.taskSettings.elements.dayOfMonthSelect.value = parsedSchedule.dayOfMonth.toString();

        // Set frequency (preserveIsNow=true to keep the parsed isNow state)
        this.taskSettings.frequencyManager.selectFrequency(parsedSchedule.frequency, true);
    }

    reset() {
        this.taskSettings.elements.titleInput.value = '';
        this.taskSettings.elements.descriptionInput.value = '';
        this.taskSettings.elements.agentSelect.value = '';
        this.taskSettings.elements.timeInput.value = '12:00';
        this.taskSettings.elements.dateInput.value = '';
        this.taskSettings.frequencyManager.isNow = true;  // Default to "now" for new tasks
        this.taskSettings.frequencyManager.selectFrequency('once');
        // Note: running_status is now set to true by default in getFormData()
        this.clearError();
    }

    showError(message) {
        const box = this.taskSettings.elements.errorBox;
        if (!box) return;
        box.textContent = message;
        box.classList.remove('hidden');
    }

    clearError() {
        const box = this.taskSettings.elements.errorBox;
        if (!box) return;
        box.textContent = '';
        box.classList.add('hidden');
    }

    bindFormEvents() {
        // Clear error on field changes
        ['input', 'change'].forEach(evt => {
            this.taskSettings.elements.titleInput && this.taskSettings.elements.titleInput.addEventListener(evt, () => this.clearError());
            this.taskSettings.elements.descriptionInput && this.taskSettings.elements.descriptionInput.addEventListener(evt, () => this.clearError());
            this.taskSettings.elements.agentSelect && this.taskSettings.elements.agentSelect.addEventListener(evt, () => this.clearError());
            this.taskSettings.elements.timeInput && this.taskSettings.elements.timeInput.addEventListener(evt, () => this.clearError());
            this.taskSettings.elements.dateInput && this.taskSettings.elements.dateInput.addEventListener(evt, () => this.clearError());
            this.taskSettings.elements.dayOfWeekSelect && this.taskSettings.elements.dayOfWeekSelect.addEventListener(evt, () => this.clearError());
            this.taskSettings.elements.dayOfMonthSelect && this.taskSettings.elements.dayOfMonthSelect.addEventListener(evt, () => this.clearError());
        });
    }
}
