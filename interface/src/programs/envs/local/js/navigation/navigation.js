import { navQuick, navDrives } from '../core/dom.js';
import { api } from '../data/api.js';

export async function loadNav(openPath) {
  try {
    const [known, drives] = await Promise.all([api.known(), api.drives()]);
    
    const attachDropHandlers = (el, targetPath) => {
      el.addEventListener('dragover', (e) => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move'; });
      el.addEventListener('drop', (e) => {
        e.preventDefault();
        const dt = e.dataTransfer;
        if (!dt) return;
        const text = dt.getData('text/paths');
        if (text) {
          try {
            const sources = JSON.parse(text);
            document.dispatchEvent(new CustomEvent('app:internal-drop', { detail: { destination: targetPath, sources, copy: e.ctrlKey } }));
            return;
          } catch {}
        }
        if (dt.files && dt.files.length) {
          document.dispatchEvent(new CustomEvent('app:upload-drop', { detail: { files: dt.files, path: targetPath } }));
        }
      });
    };

    const attachContextMenu = (el, targetPath, itemName) => {
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        // Create a custom context menu for navigation items
        const contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu';
        contextMenu.style.position = 'fixed';
        contextMenu.style.zIndex = '1000';
        
        // Position with overflow protection
        const positionMenu = () => {
          // Temporarily show menu to get its dimensions
          contextMenu.style.visibility = 'hidden';
          
          const rect = contextMenu.getBoundingClientRect();
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          const padding = 8; // Minimum distance from viewport edge
          
          let finalX = e.pageX;
          let finalY = e.pageY;
          
          // Check horizontal overflow
          if (e.pageX + rect.width + padding > viewportWidth) {
            finalX = Math.max(padding, e.pageX - rect.width);
          }
          
          // Check vertical overflow
          if (e.pageY + rect.height + padding > viewportHeight) {
            finalY = Math.max(padding, e.pageY - rect.height);
          }
          
          // Ensure menu doesn't go off edges (with padding)
          finalX = Math.max(padding, finalX);
          finalY = Math.max(padding, finalY);
          
          // Final check: constrain if still overflowing
          if (finalX + rect.width + padding > viewportWidth) {
            finalX = Math.max(padding, viewportWidth - rect.width - padding);
          }
          if (finalY + rect.height + padding > viewportHeight) {
            finalY = Math.max(padding, viewportHeight - rect.height - padding);
          }
          
          contextMenu.style.left = finalX + 'px';
          contextMenu.style.top = finalY + 'px';
          contextMenu.style.visibility = 'visible';
        };
        
        const openBtn = document.createElement('button');
        openBtn.textContent = 'Open';
        openBtn.addEventListener('click', () => {
          openPath(targetPath);
          contextMenu.remove();
        });
        
        const openNewTabBtn = document.createElement('button');
        openNewTabBtn.textContent = 'Open in new tab';
        openNewTabBtn.addEventListener('click', () => {
          try {
            const detail = { kind: 'folder', title: itemName, src: `/src/programs/envs/local/local.html?path=${encodeURIComponent(targetPath)}` };
            window.top && window.top.postMessage({ __thalis__: true, type: 'open-tab', detail }, '*');
          } catch {}
          contextMenu.remove();
        });
        
        contextMenu.appendChild(openBtn);
        contextMenu.appendChild(openNewTabBtn);
        document.body.appendChild(contextMenu);
        
        // Position menu after adding to DOM
        positionMenu();
        
        // Hide context menu when clicking elsewhere
        const hideMenu = () => {
          contextMenu.remove();
          document.removeEventListener('click', hideMenu);
        };
        setTimeout(() => document.addEventListener('click', hideMenu), 0);
      });
    };

    // Optimize Quick Access navigation
    if (navQuick) {
      navQuick.innerHTML = '';
      const quickFragment = document.createDocumentFragment();
      
      for (const item of known.items || []) {
        const el = document.createElement('div'); 
        el.className = 'nav-item';
        const ic = document.createElement('div'); 
        ic.className = 'icon'; 
        ic.textContent = '📁';
        const label = document.createElement('div'); 
        label.textContent = item.name;
        el.appendChild(ic); 
        el.appendChild(label);
        el.addEventListener('click', () => openPath(item.path));
        attachDropHandlers(el, item.path);
        attachContextMenu(el, item.path, item.name);
        quickFragment.appendChild(el);
      }
      
      navQuick.appendChild(quickFragment);
    }
    
    // Optimize Drives navigation
    if (navDrives) {
      navDrives.innerHTML = '';
      const drivesFragment = document.createDocumentFragment();
      
      for (const d of drives.drives || []) {
        const el = document.createElement('div'); 
        el.className = 'nav-item';
        const ic = document.createElement('div'); 
        ic.className = 'icon'; 
        ic.textContent = '💽';
        const label = document.createElement('div'); 
        label.textContent = d;
        el.appendChild(ic); 
        el.appendChild(label);
        el.addEventListener('click', () => openPath(d));
        attachDropHandlers(el, d);
        attachContextMenu(el, d, d);
        drivesFragment.appendChild(el);
      }
      
      navDrives.appendChild(drivesFragment);
    }
  } catch {}
}


