import httpClient from '/src/scaffold/shared/http/httpClient.js';

export async function listPrograms() {
    const res = await httpClient.apiGet('/programs');
    if (!res.ok) throw new Error('Failed to load programs');
    const data = await res.json();
    return data.programs || [];
}

export async function createProgram(payload) {
    const res = await httpClient.apiPost('/programs', payload);
    if (!res.ok) throw new Error('Failed to create program');
    const data = await res.json();
    return data.program;
}

export async function getProgram(programId) {
    const res = await httpClient.apiGet(`/programs/${programId}`);
    if (!res.ok) throw new Error('Failed to get program');
    const data = await res.json();
    return data.program;
}

export async function updateProgram(programId, payload) {
    const res = await httpClient.apiPut(`/programs/${programId}`, payload);
    if (!res.ok) throw new Error('Failed to update program');
    const data = await res.json();
    return data.program;
}

export async function deleteProgram(programId) {
    const res = await httpClient.apiDelete(`/programs/${programId}`);
    if (!res.ok) throw new Error('Failed to delete program');
    return true;
}
