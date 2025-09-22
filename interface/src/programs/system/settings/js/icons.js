export function getEyeIconSvg(isVisible) {
  if (isVisible) {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5c-3.86 0-6.77 1.99-8.82 4.08C1.19 10.29 0 12 0 12s3 7 12 7c2.03 0 3.83-.38 5.39-1.01l2.23 2.23 1.41-1.41-18-18-1.41 1.41 3.12 3.12C3.2 6.95 5.4 5 12 5zm1.73 3.59l5.18 5.18C20.76 12.68 22 12 22 12s-3-7-10-7c-1.25 0-2.38.16-3.39.45l2.12 2.14A5 5 0 0 1 13.73 8.6zM3.27 7.55L6.7 11c-.13.32-.2.66-.2 1a5.5 5.5 0 0 0 5.5 5.5c.34 0 .68-.07 1-.2l2.66 2.66C14.65 20.63 13.38 21 12 21 3 21 0 14 0 14s1.25-1.9 3.27-3.45zM12 9a3 3 0 0 0-3 3c0 .34.06.66.18.96l3.78 3.78c.3.12.62.18.96.18a3 3 0 1 0 0-6z"/>
      </svg>
    `;
  }
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 .001 6.001A3 3 0 0 0 12 9z"/>
    </svg>
  `;
}

export function getTrashIconSvg() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 3h6l1 1h5v2H3V4h5l1-1zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z"/>
    </svg>
  `;
}

export function getRenameIconSvg() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l8.06-8.06.92.92L5.92 19.58zM20.71 7.04a1.003 1.003 0 0 0 0-1.42L18.37 3.29c-.39-.39-1.03-.39-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.83z"/>
    </svg>
  `;
}


