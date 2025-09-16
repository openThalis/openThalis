import { toastContainer } from '../core/dom.js';

export function showToast(message, type = 'info', timeout = 4000) {
  if (!toastContainer) return;
  const el = document.createElement('div');
  el.className = `toast ${type === 'error' ? 'error' : type === 'success' ? 'success' : ''}`;
  const msg = document.createElement('div');
  msg.className = 'toast-msg';
  msg.textContent = message;
  const close = document.createElement('button');
  close.className = 'toast-close';
  close.textContent = '✕';
  close.addEventListener('click', () => el.remove());
  el.appendChild(msg);
  el.appendChild(close);
  toastContainer.appendChild(el);
  if (timeout > 0) setTimeout(() => el.remove(), timeout);
}
