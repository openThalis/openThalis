import { appendDynamicItem as appendDynamicItemDom } from './dom.js';

export function clearStaticInputs(settingsMapping, getElementById) {
  Object.keys(settingsMapping).forEach((inputId) => {
    const input = getElementById(inputId);
    if (!input) return;
    if (input.type === 'checkbox') {
      input.checked = false;
    } else {
      input.value = '';
    }
  });
}

export function removeExistingDynamicItems(container, dynamicItemClass) {
  const form = container.getElementById ? container.getElementById('api-keys-form') : document.getElementById('api-keys-form');
  if (form) {
    form.querySelectorAll(`.${dynamicItemClass}`).forEach((el) => el.remove());
  }
}

export function populateForm({ settingsMapping, getElementById, dynamicItemClass, ensureActionButtons, clearModifiedState }, settings) {
  clearStaticInputs(settingsMapping, getElementById);

  const form = getElementById('api-keys-form');
  if (form) {
    form.querySelectorAll(`.${dynamicItemClass}`).forEach((el) => el.remove());
  }

  Object.entries(settingsMapping).forEach(([inputId, keyName]) => {
    const input = getElementById(inputId);
    if (!input) return;
    const value = settings[keyName];
    if (input.type === 'checkbox') {
      input.checked = value === 'true' || value === '1' || value === true;
    } else if (typeof value === 'string') {
      input.value = value;
    }
    const parent = input.closest('.api-key-item') || input.parentElement;
    if (parent) ensureActionButtons(parent, input);
  });

  const reserved = new Set(Object.values(settingsMapping));
  reserved.add('LOCAL_PATH');
  if (form) {
    Object.entries(settings || {}).forEach(([keyName, keyValue]) => {
      if (reserved.has(keyName)) return;
      appendDynamicItemDom({
        form,
        keyName,
        value: keyValue || '',
        dynamicItemClass,
        ensureButtons: (itemEl, inputEl) => ensureActionButtons(itemEl, inputEl),
        markAsModified: () => {},
      });
    });
  }

  clearModifiedState();
}

export function getFormData({ settingsMapping, getElementById, dynamicItemClass }) {
  const settings = {};
  Object.entries(settingsMapping).forEach(([inputId, keyName]) => {
    const input = getElementById(inputId);
    if (!input) return;
    if (input.type === 'checkbox') {
      settings[keyName] = input.checked ? 'true' : 'false';
    } else {
      const value = (input.value || '').trim();
      settings[keyName] = value;
    }
  });

  const form = getElementById('api-keys-form');
  if (form) {
    form.querySelectorAll(`.api-key-item[data-key-name]`).forEach((item) => {
      const keyName = item.dataset.keyName;
      if (!keyName || Object.values(settingsMapping).includes(keyName) || keyName === 'LOCAL_PATH') return;
      const input = item.querySelector('input.api-key-input');
      if (input) settings[keyName] = (input.value || '').trim();
    });
  }
  return settings;
}


