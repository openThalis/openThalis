

export function formatDateTime(date) {
    if (!date) return 'Never';
    
    const dateObj = new Date(date);
    if (Number.isNaN(dateObj.getTime())) return 'Never';
    
    return dateObj.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

export function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

