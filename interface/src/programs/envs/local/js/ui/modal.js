import { appModal, modalForm, modalOk, modalCancel, appModalClose, modalInput, modalTitle, modalMessage, modalLabel } from '../core/dom.js';
import { showToast } from './toast.js';

export const RESERVED_WIN_NAMES = new Set(['CON','PRN','AUX','NUL', 'COM1','COM2','COM3','COM4','COM5','COM6','COM7','COM8','COM9', 'LPT1','LPT2','LPT3','LPT4','LPT5','LPT6','LPT7','LPT8','LPT9']);

export function validateWindowsName(name) {
  if (!name || !name.trim()) return 'Name cannot be empty';
  if (/[<>:"/\\|?*]/.test(name)) return 'Name contains invalid characters <>:"/\\|?*';
  if (name.endsWith('.') || name.endsWith(' ')) return 'Name cannot end with a period or space';
  const base = name.split(/[.]/)[0].toUpperCase();
  if (RESERVED_WIN_NAMES.has(base)) return 'Name is reserved';
  return null;
}

let modalState = { mode: 'alert', resolver: null, validator: null };

export function openModal({ title, message = '', showInput = false, label = '', value = '', okText = 'OK', cancelText = 'Cancel', validator = null }) {
  return new Promise((resolve) => {
    modalState = { mode: showInput ? 'prompt' : (cancelText ? 'confirm' : 'alert'), resolver: resolve, validator };
    modalTitle.textContent = title || '';
    modalMessage.textContent = message || '';
    modalLabel.textContent = label || '';
    modalInput.hidden = !showInput;
    if (showInput) {
      modalInput.value = value || '';
      setTimeout(() => { modalInput.focus(); modalInput.select(); }, 0);
    } else {
      setTimeout(() => { modalOk.focus(); }, 0);
    }
    modalOk.textContent = okText || 'OK';
    modalCancel.textContent = cancelText || 'Cancel';
    modalCancel.hidden = !cancelText;
    // Mark alert mode to allow CSS to hide actions
    if (!cancelText) appModal.classList.add('is-alert'); else appModal.classList.remove('is-alert');
    appModal.showModal();
  });
}

function handleModalOk() {
  if (!modalState.resolver) return;
  if (modalState.mode === 'prompt') {
    const v = (modalInput.value || '').trim();
    if (typeof modalState.validator === 'function') {
      const msg = modalState.validator(v);
      if (msg) { showToast(msg, 'error'); return; }
    }
    modalState.resolver(v);
  } else {
    modalState.resolver(true);
  }
  appModal.close();
  appModal.classList.remove('is-alert');
}

function handleModalCancel() {
  if (!modalState.resolver) { appModal.close(); return; }
  modalState.resolver(modalState.mode === 'prompt' ? null : false);
  appModal.close();
  appModal.classList.remove('is-alert');
}

if (modalForm) modalForm.addEventListener('submit', (e) => { e.preventDefault(); handleModalOk(); });
if (modalOk) modalOk.addEventListener('click', (e) => { e.preventDefault(); handleModalOk(); });
if (modalCancel) modalCancel.addEventListener('click', (e) => { e.preventDefault(); handleModalCancel(); });
if (appModalClose) appModalClose.addEventListener('click', (e) => { e.preventDefault(); handleModalCancel(); });
if (appModal) appModal.addEventListener('cancel', (e) => { e.preventDefault(); handleModalCancel(); });
if (appModal) appModal.addEventListener('click', (e) => { if (e.target === appModal) handleModalCancel(); });

export function showAlert(title, message) { return openModal({ title, message, showInput: false, cancelText: '' }); }
export function showConfirm(title, message) { return openModal({ title, message, showInput: false, cancelText: 'Cancel' }); }
export function showPrompt(title, label, value = '', validator = null) { return openModal({ title, message: '', showInput: true, label, value, cancelText: 'Cancel', okText: 'OK', validator }); }


