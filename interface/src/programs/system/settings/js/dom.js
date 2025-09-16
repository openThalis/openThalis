import { getEyeIconSvg, getRenameIconSvg, getTrashIconSvg } from './icons.js';

export function ensureActionButtons(itemEl, inputEl, { onRename, onDelete }) {
  if (!itemEl || !inputEl || inputEl.type !== 'password') return;

  let actions = itemEl.querySelector('.api-key-actions');
  if (!actions) {
    actions = document.createElement('div');
    actions.className = 'api-key-actions';
    itemEl.appendChild(actions);
  } else {
    actions.innerHTML = '';
  }

  const eyeBtn = document.createElement('button');
  eyeBtn.type = 'button';
  eyeBtn.className = 'icon-button toggle-visibility';
  const updateEye = () => {
    const isVisible = inputEl.type === 'text';
    eyeBtn.innerHTML = getEyeIconSvg(isVisible);
    eyeBtn.title = isVisible ? 'Hide' : 'Show';
  };
  eyeBtn.addEventListener('click', () => {
    inputEl.type = inputEl.type === 'password' ? 'text' : 'password';
    updateEye();
  });
  updateEye();
  actions.appendChild(eyeBtn);

  const renameBtn = document.createElement('button');
  renameBtn.type = 'button';
  renameBtn.className = 'icon-button rename-key';
  renameBtn.innerHTML = getRenameIconSvg();
  renameBtn.addEventListener('click', () => onRename?.(itemEl));
  actions.appendChild(renameBtn);

  const trashBtn = document.createElement('button');
  trashBtn.type = 'button';
  trashBtn.className = 'icon-button delete-key';
  trashBtn.innerHTML = getTrashIconSvg();
  trashBtn.addEventListener('click', () => onDelete?.(itemEl));
  actions.appendChild(trashBtn);
}

export function appendDynamicItem({ form, keyName, value, dynamicItemClass, ensureButtons, markAsModified }) {
  const addBtn = form.querySelector('#add-api-key');
  const item = document.createElement('div');
  item.className = `api-key-item ${dynamicItemClass}`;
  item.dataset.keyName = keyName;
  
  const inputId = `api-key-${keyName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  const inputName = `api_key_${keyName}`;
  
  item.innerHTML = `
    <label class="api-key-label" for="${inputId}">${keyName}</label>
    <input type="password" id="${inputId}" name="${inputName}" class="api-key-input" placeholder="Enter value" />
  `;
  const input = item.querySelector('input');
  input.value = value || '';
  input.addEventListener('input', () => markAsModified?.());
  ensureButtons(item, input);
  if (addBtn && addBtn.parentElement === form) {
    form.insertBefore(item, addBtn);
  } else {
    form.appendChild(item);
  }
  return item;
}

