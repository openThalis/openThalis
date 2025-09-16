export function attachKeyboardShortcuts({ commandDeleteBtn, commandRenameBtn, copyBtn, cutBtn, pasteBtn }) {
  document.addEventListener('keydown', async (e) => {
    if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return;
    const key = e.key.toLowerCase();
    if (key === 'delete') { e.preventDefault(); commandDeleteBtn?.click(); }
    if (key === 'f2') { e.preventDefault(); commandRenameBtn?.click(); }
    if (e.ctrlKey && key === 'c') { e.preventDefault(); copyBtn?.click(); }
    if (e.ctrlKey && key === 'x') { e.preventDefault(); cutBtn?.click(); }
    if (e.ctrlKey && key === 'v') { e.preventDefault(); pasteBtn?.click(); }
  });
}


