export function iconFor(entry) {
  if (entry.isDir) return '📁';
  const mt = (entry.mimeType || '').toLowerCase();
  if (mt.startsWith('image/')) return '🖼️';
  if (mt.startsWith('video/')) return '🎞️';
  if (mt.startsWith('audio/')) return '🎵';
  if (mt.includes('pdf')) return '📄';
  if (mt.includes('zip') || mt.includes('tar')) return '🗂️';
  if (mt.includes('json') || mt.includes('xml')) return '🧾';
  if (mt.startsWith('text/')) return '📄';
  return '📦';
}

export function computeType(entry) {
  if (entry.isDir) return 'Folder';
  const mt = (entry.mimeType || '').toLowerCase();
  if (!mt) return 'File';
  if (mt.startsWith('image/')) return 'Image';
  if (mt.startsWith('video/')) return 'Video';
  if (mt.startsWith('audio/')) return 'Audio';
  if (mt.includes('pdf')) return 'PDF';
  if (mt.includes('zip') || mt.includes('tar')) return 'Archive';
  if (mt.includes('json') || mt.includes('xml')) return 'Document';
  if (mt.startsWith('text/')) return 'Text';
  return 'File';
}


