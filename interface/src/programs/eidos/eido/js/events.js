export function setupEventListeners({ getElementById, markAsModified, openAddAgentModal, onSave, onReset }) {
  const form = getElementById('configForm');
  const resetButton = getElementById('resetBtn');
  const addAgentBtn = getElementById('addAgentBtn');

  if (form && !form._eidoSubmitBound) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await onSave?.();
    });
    try { form.setAttribute('novalidate', 'true'); } catch {}
    form._eidoSubmitBound = true;
  }

  if (resetButton && !resetButton._eidoResetBound) {
    resetButton.addEventListener('click', async (e) => {
      e.preventDefault();
      await onReset?.();
    });
    resetButton._eidoResetBound = true;
  }

  if (addAgentBtn && !addAgentBtn._eidoAddAgentBound) {
    addAgentBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openAddAgentModal?.();
    });
    addAgentBtn._eidoAddAgentBound = true;
  }

  const inputs = document.querySelectorAll('input, textarea, select');
  inputs.forEach((el) => {
    if (!el._eidoTracked) {
      el.addEventListener('input', () => markAsModified?.());
      el.addEventListener('change', () => markAsModified?.());
      el._eidoTracked = true;
    }
  });
}


