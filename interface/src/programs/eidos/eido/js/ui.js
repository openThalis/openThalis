export function showToast(message, type = 'info') {
  const existing = document.querySelectorAll('.toast');
  existing.forEach((el) => el.remove());

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
  }, 3000);
}

export function showSuccess(message) { showToast(message, 'success'); }
export function showError(message) { showToast(message, 'error'); }


