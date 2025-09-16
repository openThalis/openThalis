import { breadcrumbEl } from '../core/dom.js';

export function buildBreadcrumb(path, onNavigate) {
  breadcrumbEl.innerHTML = '';
  if (!path) return;
  const isWindows = path.includes('\\');

  const addCrumb = (label, fullPath) => {
    const link = document.createElement('a');
    link.href = '#';
    link.textContent = label;
    link.addEventListener('click', (e) => { e.preventDefault(); onNavigate(fullPath); });
    return link;
  };
  
  const addSep = (text) => {
    const sep = document.createElement('span');
    sep.textContent = ` ${text} `;
    return sep;
  };

  // Use DocumentFragment for better performance
  const fragment = document.createDocumentFragment();

  if (isWindows) {
    const isUNC = path.startsWith('\\\\');
    if (isUNC) {
      const parts = path.split('\\').filter(Boolean);
      if (parts.length >= 2) {
        const root = `\\\\${parts[0]}\\${parts[1]}`;
        fragment.appendChild(addCrumb(root, root));
        let current = root;
        for (let i = 2; i < parts.length; i++) {
          current += `\\${parts[i]}`;
          fragment.appendChild(addSep('\\'));
          fragment.appendChild(addCrumb(parts[i], current));
        }
      } else {
        fragment.appendChild(addCrumb(path, path));
      }
    } else {
      const parts = path.split('\\').filter(p => p.length > 0);
      if (parts.length > 0) {
        const drive = parts[0];
        let current = `${drive}\\`;
        fragment.appendChild(addCrumb(drive, current));
        for (let i = 1; i < parts.length; i++) {
          current += (current.endsWith('\\') ? '' : '\\') + parts[i];
          fragment.appendChild(addSep('\\'));
          fragment.appendChild(addCrumb(parts[i], current));
        }
      } else {
        fragment.appendChild(addCrumb(path, path));
      }
    }
  } else {
    const parts = path.split('/').filter(Boolean);
    let current = '/';
    fragment.appendChild(addCrumb('/', current));
    for (let i = 0; i < parts.length; i++) {
      current += (current.endsWith('/') ? '' : '/') + parts[i];
      fragment.appendChild(addSep('/'));
      fragment.appendChild(addCrumb(parts[i], current));
    }
  }
  
  breadcrumbEl.appendChild(fragment);
}


