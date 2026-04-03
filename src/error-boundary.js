/**
 * Global error handler - catches unhandled errors and shows recovery UI
 */

import { toast } from './ui/toast.js';

const ERROR_MESSAGES = {
  WORKER_CRASH: 'The image processor crashed. This usually happens with very large images.',
  OUT_OF_MEMORY: 'Not enough memory to process this image. Try a smaller file.',
  UNKNOWN: 'Something went wrong. Please try refreshing the page.'
};

let errorOverlayShown = false;

export function initErrorHandling() {
  // Catch synchronous errors
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    // Check for specific error types
    const message = event.error?.message || '';
    if (message.includes('memory') || message.includes('Memory')) {
      showErrorRecoveryUI(ERROR_MESSAGES.OUT_OF_MEMORY);
    } else if (!errorOverlayShown) {
      showErrorRecoveryUI(ERROR_MESSAGES.UNKNOWN);
    }
    
    return false;
  });

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled rejection:', event.reason);
    
    const reason = event.reason?.message || String(event.reason);
    if (reason.includes('memory') || reason.includes('Memory')) {
      showErrorRecoveryUI(ERROR_MESSAGES.OUT_OF_MEMORY);
    } else if (!errorOverlayShown) {
      showErrorRecoveryUI(ERROR_MESSAGES.UNKNOWN);
    }
  });
}

function showErrorRecoveryUI(message) {
  // Prevent multiple error UIs
  if (errorOverlayShown) return;
  errorOverlayShown = true;

  // Remove any existing overlay first
  const existing = document.getElementById('error-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'error-overlay';
  overlay.className = 'fixed inset-0 bg-bg/95 z-[100] flex items-center justify-center';

  const card = document.createElement('div');
  card.className = 'bg-surface border border-error/30 rounded-2xl p-8 max-w-md text-center';

  const iconWrap = document.createElement('div');
  iconWrap.className = 'w-16 h-16 mx-auto mb-4 rounded-full bg-error/10 flex items-center justify-center text-error text-2xl';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '32');
  svg.setAttribute('height', '32');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  [
    ['path', 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z'],
    ['path', 'M12 9v4'],
    ['path', 'M12 17h.01'],
  ].forEach(([tag, d]) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    el.setAttribute('d', d);
    svg.appendChild(el);
  });
  iconWrap.appendChild(svg);

  const heading = document.createElement('h2');
  heading.className = 'text-xl font-bold text-text-primary mb-2';
  heading.textContent = 'Oops!';

  const para = document.createElement('p');
  para.className = 'text-text-secondary mb-6';
  para.textContent = message;

  const actions = document.createElement('div');
  actions.className = 'flex gap-3 justify-center';

  const reloadBtn = document.createElement('button');
  reloadBtn.id = 'error-reload-btn';
  reloadBtn.className = 'px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-light transition-colors cursor-pointer';
  reloadBtn.textContent = 'Reload Page';

  const startOverLink = document.createElement('a');
  startOverLink.href = '/';
  startOverLink.id = 'error-startover-btn';
  startOverLink.className = 'px-4 py-2 bg-surface-variant text-text-primary rounded-lg font-medium hover:bg-border transition-colors cursor-pointer inline-flex items-center';
  startOverLink.textContent = 'Start Over';

  actions.appendChild(reloadBtn);
  actions.appendChild(startOverLink);
  card.appendChild(iconWrap);
  card.appendChild(heading);
  card.appendChild(para);
  card.appendChild(actions);
  overlay.appendChild(card);

  document.body.appendChild(overlay);

  // Add event listeners
  document.getElementById('error-reload-btn')?.addEventListener('click', () => {
    location.reload();
  });

  document.getElementById('error-startover-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    // Clear any app state from sessionStorage
    sessionStorage.clear();
    location.href = import.meta.env.BASE_URL;
  });
}

/**
 * Check if we're in a memory-constrained environment
 */
export function checkMemoryConstraints(fileSizeMB, width, height) {
  const pixelCount = width * height;
  const estimatedMemoryMB = (pixelCount * 4 * 3) / (1024 * 1024); // RGBA * 3 buffers
  
  // Warn if estimated memory usage is high
  if (estimatedMemoryMB > 500) {
    toast.warning(`Large image may use ${Math.round(estimatedMemoryMB)}MB of memory. Processing may be slow.`);
    return { allowed: true, warning: true };
  }
  
  // Hard limit at 2GB estimated
  if (estimatedMemoryMB > 2000) {
    return { 
      allowed: false, 
      error: `Image too large (would need ~${Math.round(estimatedMemoryMB)}MB). Maximum supported is ~2000MB.` 
    };
  }
  
  return { allowed: true, warning: false };
}
