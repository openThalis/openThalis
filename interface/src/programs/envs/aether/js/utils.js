export function sanitizeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

export function formatDateTime(dateString) {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Invalid Date';
    
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

export function truncateText(text, maxLength = 100) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
}

export function validateProgramName(name) {
    if (!name) return 'Program name is required';
    if (name.length < 1) return 'Program name must be at least 1 character';
    if (name.length > 255) return 'Program name must be less than 255 characters';
    return null;
}

export function validateProgramDescription(description) {
    if (!description) return 'Program description is required';
    if (description.length < 1) return 'Program description must be at least 1 character';
    if (description.length > 10000) return 'Program description must be less than 10000 characters';
    return null;
}
