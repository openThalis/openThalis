import { getTrashIconSvg } from './icons.js';

export function appendAgentItem({ listEl, keyName, value, dynamicItemClass, onDelete, markAsModified }) {
  const item = document.createElement('div');
  item.className = dynamicItemClass;
  item.dataset.keyName = keyName;
  item.innerHTML = `
    <div class="agent-actions">
      <button type="button" class="icon-button delete-agent">${getTrashIconSvg()}</button>
    </div>
    <input type="text" class="agent-name-input" placeholder="Agent name" value="${keyName}" />
    <textarea class="agent-textarea" placeholder="Enter agent system prompt"></textarea>
  `;

  const nameInput = item.querySelector('input.agent-name-input');
  const textarea = item.querySelector('textarea.agent-textarea');
  
  textarea.value = value || '';
  
  nameInput.addEventListener('input', () => markAsModified?.());
  textarea.addEventListener('input', () => markAsModified?.());

  item.querySelector('.delete-agent')?.addEventListener('click', () => onDelete?.(item));

  listEl.appendChild(item);
  return item;
}


