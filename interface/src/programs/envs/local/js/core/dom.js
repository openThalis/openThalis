// DOM helpers and element references

export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// Buttons
export const upBtn = qs('#up-btn');
export const backBtn = qs('#back-btn');
export const forwardBtn = qs('#forward-btn');
export const refreshBtn = qs('#refresh-btn');

// Listing/UI containers
export const listingEl = qs('#listing');
export const breadcrumbEl = qs('#breadcrumb');
export const emptyEl = qs('#empty');
export const errorEl = qs('#error');
export const statusbar = qs('#statusbar');

// Search
export const searchInput = qs('#search-input');

// Command bar
export const newBtn = qs('#new-btn');
export const uploadBtn = qs('#upload-btn');
export const commandRenameBtn = qs('#rename-btn');
export const commandDeleteBtn = qs('#delete-btn');
export const cutBtn = qs('#cut-btn');
export const copyBtn = qs('#copy-btn');
export const pasteBtn = qs('#paste-btn');

// Menus
export const sortBtn = qs('#sort-btn');
export const sortMenu = qs('#sort-menu');
export const viewBtn = qs('#view-btn');
export const viewMenu = qs('#view-menu');
export const newMenu = qs('#new-menu');
export const detailsHeader = qs('#details-header');

// Nav panes
export const navQuick = qs('#nav-quick');
export const navDrives = qs('#nav-drives');

// Context menu
export const contextMenu = qs('#context-menu');
export const bgContextMenu = qs('#bg-context-menu');

// Modal
export const appModal = qs('#app-modal');
export const modalForm = qs('#app-modal-form');
export const modalTitle = qs('#app-modal-title');
export const modalMessage = qs('#app-modal-message');
export const modalLabel = qs('#app-modal-label');
export const modalInput = qs('#app-modal-input');
export const modalOk = qs('#app-modal-ok');
export const modalCancel = qs('#app-modal-cancel');
export const appModalClose = qs('#app-modal-close');

// Toasts
export const toastContainer = qs('#toasts');
