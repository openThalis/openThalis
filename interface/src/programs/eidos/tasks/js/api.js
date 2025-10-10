import httpClient from '/src/scaffold/shared/http/httpClient.js';

export async function listTasks() {
    const res = await httpClient.apiGet('/tasks');
    if (!res.ok) throw new Error('Failed to load tasks');
    const data = await res.json();
    return data.tasks || [];
}

export async function createTask(payload) {
    const res = await httpClient.apiPost('/tasks', payload);
    if (!res.ok) throw new Error('Failed to create task');
    const data = await res.json();
    return data.task;
}

export async function updateTask(taskId, payload) {
    const res = await httpClient.apiPut(`/tasks/${taskId}`, payload);
    if (!res.ok) throw new Error('Failed to update task');
    const data = await res.json();
    return data.task;
}

export async function deleteTask(taskId) {
    const res = await httpClient.apiDelete(`/tasks/${taskId}`);
    if (!res.ok) throw new Error('Failed to delete task');
    return true;
}

export async function getAvailableAgents() {
    const res = await httpClient.apiGet('/tasks/agents');
    if (!res.ok) throw new Error('Failed to fetch available agents');
    const data = await res.json();
    return {
        agents: data.agents || {},
        defaultAgent: data.default_agent || ''
    };
}

export async function deleteTaskResponse(taskId, responseIndex) {
    const res = await httpClient.apiDelete(`/tasks/${taskId}/responses/${responseIndex}`);
    if (!res.ok) throw new Error('Failed to delete response');
    const data = await res.json();
    return data.task;
}

export async function getTask(taskId) {
    const res = await httpClient.apiGet(`/tasks/${taskId}`);
    if (!res.ok) throw new Error('Failed to get task');
    const data = await res.json();
    return data.task;
}


