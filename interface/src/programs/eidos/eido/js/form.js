function clearStaticInputs(keyMapping, getElementById) {
  Object.keys(keyMapping).forEach((inputId) => {
    const input = getElementById(inputId);
    if (!input) return;
    if (input.type === 'checkbox') {
      input.checked = false;
    } else {
      input.value = '';
    }
  });
}

export function populateForm({ keyMapping, getElementById, dynamicAgentItemClass, appendAgentItem, clearModifiedState }, settings) {
  clearStaticInputs(keyMapping, getElementById);

  // Populate mapped inputs
  Object.entries(keyMapping).forEach(([inputId, keyName]) => {
    const input = getElementById(inputId);
    if (!input) return;
    const value = settings?.[keyName];
    if (input.type === 'checkbox') {
      input.checked = value === 'true' || value === '1' || value === true;
    } else if (input.type === 'number') {
      input.value = value !== undefined && value !== null && value !== '' ? value : '';
    } else {
      input.value = value || '';
    }
  });

  // Render dynamic agents
  const list = getElementById('agentsList');
  if (list) {
    list.querySelectorAll(`.${dynamicAgentItemClass}`).forEach((el) => el.remove());
    const agents = (settings && settings['agents'] && typeof settings['agents'] === 'object') ? settings['agents'] : {};
    Object.entries(agents).forEach(([keyName, keyValue]) => {
      appendAgentItem({ listEl: list, keyName, value: (keyValue || ''), dynamicItemClass: dynamicAgentItemClass, onDelete: () => {}, markAsModified: () => {} });
    });
  }

  clearModifiedState();
}

export function getFormData({ keyMapping, getElementById, dynamicAgentItemClass }) {
  const settings = {};
  Object.entries(keyMapping).forEach(([inputId, keyName]) => {
    const input = getElementById(inputId);
    if (!input) return;
    if (input.type === 'checkbox') {
      settings[keyName] = input.checked ? 'true' : 'false';
    } else {
      const value = (input.value || '').toString().trim();
      settings[keyName] = value;
    }
  });

  const list = getElementById('agentsList');
  const agents = {};
  if (list) {
    list.querySelectorAll(`.${dynamicAgentItemClass}`).forEach((item) => {
      const nameInput = item.querySelector('input.agent-name-input');
      const textarea = item.querySelector('textarea.agent-textarea');
      const keyName = (nameInput?.value || '').toString().trim();
      if (!keyName) return;
      agents[keyName] = (textarea?.value || '').toString().trim();
    });
  }
  settings['agents'] = agents;

  return settings;
}


