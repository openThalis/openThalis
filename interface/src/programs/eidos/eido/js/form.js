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

  // Handle custom provider name population
  const providerSelect = getElementById('providerName');
  const customProviderInput = getElementById('customProviderName');
  const customProviderField = getElementById('custom-provider-field');

  if (providerSelect && settings) {
    const providerName = settings[keyMapping['providerName']];

    // Check if the provider name matches any of the predefined options
    const predefinedOptions = ['ollama', 'xai', 'openai'];
    if (providerName && !predefinedOptions.includes(providerName)) {
      // This is a custom provider name, so select "other" and populate the custom input
      providerSelect.value = 'other';
      if (customProviderField) {
        customProviderField.style.display = 'block';
      }
      if (customProviderInput) {
        customProviderInput.value = providerName;
      }
    } else if (providerName) {
      // This is a predefined provider, just select it
      providerSelect.value = providerName;
    }
  }

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

  // Handle custom provider name when "other" is selected
  const providerSelect = getElementById('providerName');
  const customProviderInput = getElementById('customProviderName');

  if (providerSelect && providerSelect.value === 'other' && customProviderInput) {
    const customProviderName = (customProviderInput.value || '').toString().trim();
    if (customProviderName) {
      settings[keyMapping['providerName']] = customProviderName;
    }
  }

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


