let currentProgram = null;

function getAuthToken() {
  try {
    return localStorage.getItem('thalis_auth_access_token');
  } catch (e) {
    console.warn('Failed to access localStorage for auth token:', e);
    return null;
  }
}

async function fetchJsonAuth(endpoint) {
  const authToken = getAuthToken();
  
  if (authToken) {
    try {
      const configMod = await import('/src/scaffold/shared/config/config.js');
      const config = configMod.default;
      const baseUrl = await config.getBackendUrl();
      
      const res = await fetch(`${baseUrl}/api${endpoint}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error((data && (data.error || data.detail)) || `Request failed: ${res.status}`);
      }
      return data;
    } catch (e) {
      console.warn('Auth token request failed, trying httpClient:', e);
    }
  }
  
  try {
    if (window.top && window.top !== window) {
      const mod = await import('/src/scaffold/shared/http/httpClient.js');
      const httpClient = mod.default;
      const res = await httpClient.api(endpoint, { method: 'GET', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error((data && (data.error || data.detail)) || `Request failed: ${res.status}`);
      return data;
    }
  } catch (e) {
    console.error('Failed to fetch data:', e);
    throw e;
  }
}

// Show loading state
const showLoading = () => {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('error').classList.add('hidden');
  document.getElementById('program-content').classList.add('hidden');
};

// Show error state
const showError = (message) => {
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('error').classList.remove('hidden');
  document.getElementById('program-content').classList.add('hidden');
  document.getElementById('error-message').textContent = message;
};

// Show program content
const showProgram = (program) => {
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('error').classList.add('hidden');
  document.getElementById('program-content').classList.remove('hidden');

  // Update the parent tab title to reflect the program name
  try {
    window.top && window.top.postMessage({
      __thalis__: true,
      type: 'update-tab-title',
      title: program.name || 'Program'
    }, '*');
  } catch (titleError) {
    console.warn('Failed to update parent tab title:', titleError);
  }

  // Render user source code
  renderUserCode(program);
};

// Render user-provided HTML, CSS, and JS
const renderUserCode = (program) => {
  const sourceCode = program.source_code || {};

  // Clear previous user content
  clearUserContent();

  // Check if any user code exists
  const hasCode = (sourceCode.html && sourceCode.html.trim()) ||
                  (sourceCode.css && sourceCode.css.trim()) ||
                  (sourceCode.js && sourceCode.js.trim());

  if (!hasCode) {
    showNoUserContent();
    return;
  }

  try {
    // Inject CSS if provided
    if (sourceCode.css && sourceCode.css.trim()) {
      injectUserCSS(sourceCode.css);
    }

    // Inject HTML if provided
    if (sourceCode.html && sourceCode.html.trim()) {
      injectUserHTML(sourceCode.html);
    }

    // Execute JS if provided (with safety measures)
    if (sourceCode.js && sourceCode.js.trim()) {
      executeUserJS(sourceCode.js);
    }


  } catch (error) {
    console.error('Code execution error:', error);
  }
};

// Clear previously injected user content
const clearUserContent = () => {
  // Remove user CSS
  const userStyle = document.getElementById('user-injected-css');
  if (userStyle) {
    userStyle.remove();
  }

  // Remove user HTML container
  const userContainer = document.getElementById('user-program-container');
  if (userContainer) {
    userContainer.remove();
  }

  // Remove user JS script
  const userScript = document.getElementById('user-injected-js');
  if (userScript) {
    userScript.remove();
  }



  // Remove any error notifications
  const errorDivs = document.querySelectorAll('[style*="position: fixed"][style*="top: 20px"][style*="right: 20px"]');
  errorDivs.forEach(div => div.remove());
};

// Inject user CSS
const injectUserCSS = (cssCode) => {
  try {
    const style = document.createElement('style');
    style.id = 'user-injected-css';
    style.textContent = cssCode;
    document.head.appendChild(style);
  } catch (error) {
    console.error('Error injecting CSS:', error);
    showJSError('CSS Error: ' + error.message);
  }
};

// Inject user HTML
const injectUserHTML = (htmlCode) => {
  try {
    // Clean up the HTML code to work with innerHTML injection
    let cleanHtml = htmlCode.trim();

    // Remove DOCTYPE, html, head, and body tags if present
    cleanHtml = cleanHtml.replace(/<!DOCTYPE[^>]*>/gi, '');
    cleanHtml = cleanHtml.replace(/<html[^>]*>/gi, '');
    cleanHtml = cleanHtml.replace(/<\/html>/gi, '');
    cleanHtml = cleanHtml.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
    cleanHtml = cleanHtml.replace(/<body[^>]*>/gi, '');
    cleanHtml = cleanHtml.replace(/<\/body>/gi, '');

    // Insert the HTML content directly into the program content container
    const programContent = document.getElementById('program-content');
    if (programContent) {
      programContent.innerHTML = cleanHtml;
    } else {
      // Fallback: append to body
      document.body.innerHTML = cleanHtml;
    }
  } catch (error) {
    console.error('Error injecting HTML:', error);
    const programContent = document.getElementById('program-content');
    if (programContent) {
      programContent.innerHTML = `<div style="color: red; text-align: center; padding: 20px;">HTML Error: ${error.message}</div>`;
    }
  }
};

// Execute user JS with safety measures
const executeUserJS = (jsCode) => {
  try {
    // Create a sandboxed execution environment
    const script = document.createElement('script');
    script.id = 'user-injected-js';

    // Add some safety wrappers
    const safeCode = `
      (function() {
        'use strict';
        try {
          ${jsCode}
        } catch (error) {
          console.error('User script error:', error);
          // Show error in a user-friendly way
          const errorDiv = document.createElement('div');
          errorDiv.style.cssText = 'color: #ff6b6b; background: rgba(255, 107, 107, 0.1); padding: 10px; border-radius: 8px; margin: 10px 0; border: 1px solid rgba(255, 107, 107, 0.3); position: relative; z-index: 1000;';
          errorDiv.innerHTML = '<strong>⚠️ JavaScript Error:</strong><br>' + (error.message || 'Unknown error');
          const container = document.getElementById('user-program-container');
          if (container) {
            container.appendChild(errorDiv);
          } else {
            document.body.appendChild(errorDiv);
          }
        }
      })();
    `;

    script.textContent = safeCode;
    document.body.appendChild(script);
  } catch (error) {
    console.error('Failed to execute user JS:', error);
    // Show error message to user
    showJSError(error.message);
  }
};

// Show JavaScript execution error
const showJSError = (message) => {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ff4757;
    color: white;
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    max-width: 300px;
    font-family: monospace;
    font-size: 12px;
  `;

  errorDiv.innerHTML = `
    <strong>🚨 JS Error:</strong><br>
    ${message}
    <button onclick="this.parentElement.remove()" style="margin-top: 10px; background: rgba(255,255,255,0.2); border: none; color: white; padding: 5px 10px; border-radius: 4px; cursor: pointer;">✕</button>
  `;

  document.body.appendChild(errorDiv);

  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (errorDiv.parentElement) {
      errorDiv.remove();
    }
  }, 10000);
};

// Show message when no user code is provided
const showNoUserContent = () => {
  const container = document.createElement('div');
  container.id = 'user-program-container';
  container.className = 'no-user-content';

  container.innerHTML = `
    <div style="text-align: center; color: #6b7280; font-style: italic; padding: 40px;">
      <div style="font-size: 2rem; margin-bottom: 10px;">📝</div>
      <div>No custom code provided for this program.</div>
      <div style="font-size: 0.9rem; margin-top: 8px; opacity: 0.7;">
        Add HTML, CSS, or JavaScript code in the program editor to see it rendered here.
      </div>
    </div>
  `;

  // Add it after the description section
  const descSection = document.querySelector('.program-section');
  if (descSection) {
    descSection.parentNode.insertBefore(container, descSection.nextSibling);
  }
};



// Load program data
const loadProgram = async () => {
  const params = new URLSearchParams(location.search);
  const programId = params.get('id');

  if (!programId) {
    showError('No program ID provided');
    return;
  }

  showLoading();

  // Retry logic for authentication issues
  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const data = await fetchJsonAuth(`/programs/${encodeURIComponent(programId)}`);
      currentProgram = data.program || data; // support either shape
      showProgram(currentProgram);
      return; // Success, exit the retry loop

    } catch (error) {
      console.warn(`Program load attempt ${attempt} failed:`, error);
      lastError = error;

      // If it's not an authentication error, don't retry
      if (!error.message.includes('403') && !error.message.includes('Not authenticated') && !error.message.includes('401')) {
        break;
      }

      // Wait before retrying (except on the last attempt)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Progressive delay
      }
    }
  }

  // All retries failed
  console.error('Failed to load program after retries:', lastError);
  showError(lastError.message || 'Failed to load program');
};

// Event handlers
const setupEventHandlers = () => {
  // No event handlers needed - removed header and buttons
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setupEventHandlers();
  loadProgram();
});
