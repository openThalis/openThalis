import { listingEl } from './dom.js';

export function setBusy(isBusy) {
  listingEl.setAttribute('aria-busy', String(isBusy));
}

export function formatBytes(bytes) {
  if (bytes == null) return '';
  const units = ['B','KB','MB','GB','TB'];
  let i = 0; let val = bytes;
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
  return `${val.toFixed(val < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

// Recursively collect files from a DataTransferItemList, preserving relative paths
export async function collectFilesFromItems(items) {
  const files = [];

  const pushFile = (file, relPath) => {
    try { Object.defineProperty(file, 'relativePath', { value: relPath, configurable: true }); } catch {}
    files.push(file);
  };

  // Chrome/WebKit path: use webkitGetAsEntry if available
  const hasWebkit = typeof DataTransferItem !== 'undefined' && items && typeof items[0]?.webkitGetAsEntry === 'function';

  if (hasWebkit) {
    const readAllDirectoryEntries = (dirReader) => new Promise((resolve) => {
      const entries = [];
      const readBatch = () => {
        dirReader.readEntries((batch) => {
          if (!batch.length) { resolve(entries); return; }
          entries.push(...batch);
          readBatch();
        });
      };
      readBatch();
    });

    const traverseEntry = async (entry, pathPrefix) => {
      if (entry.isFile) {
        await new Promise((res, rej) => {
          entry.file((file) => { pushFile(file, (pathPrefix ? pathPrefix + '/' : '') + file.name); res(); }, rej);
        });
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        const entries = await readAllDirectoryEntries(reader);
        for (const child of entries) {
          await traverseEntry(child, (pathPrefix ? pathPrefix + '/' : '') + entry.name);
        }
      }
    };

    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry && items[i].webkitGetAsEntry();
      if (!entry) continue;
      await traverseEntry(entry, '');
    }
    return files;
  }

  // Fall-back: use getAsFile (folders not supported here)
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.kind === 'file') {
      const f = it.getAsFile();
      if (f) pushFile(f, f.name);
    }
  }
  return files;
}


