export class AgentManager {
    constructor(taskSettings) {
        this.taskSettings = taskSettings;
    }

    async loadAvailableAgents() {
        try {
            // Import the API function here to avoid circular dependencies
            const { getAvailableAgents } = await import('../api.js');
            const { agents, defaultAgent } = await getAvailableAgents();

            const agentSelect = this.taskSettings.elements.agentSelect;
            if (!agentSelect) return;

            const currentValue = agentSelect.value; // Preserve current selection

            // Clear existing options
            agentSelect.innerHTML = '';

            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Select an agent';
            agentSelect.appendChild(defaultOption);

            // Add agent options
            Object.entries(agents).forEach(([agentName, agentDescription]) => {
                const option = document.createElement('option');
                option.value = agentName;
                option.textContent = agentName;
                option.title = agentDescription; // Show description as tooltip
                agentSelect.appendChild(option);
            });

            // Restore previous selection or set default
            if (currentValue && agents[currentValue]) {
                agentSelect.value = currentValue;
            } else if (!currentValue && defaultAgent && agents[defaultAgent]) {
                agentSelect.value = defaultAgent;
            }

        } catch (e) {
            console.warn('Failed to load available agents in task settings:', e);
            // Set a fallback message in the dropdown
            if (this.taskSettings.elements.agentSelect) {
                this.taskSettings.elements.agentSelect.innerHTML = '<option value="">No agents available</option>';
            }
        }
    }
}
