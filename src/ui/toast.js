const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 4000;

let container = null;
const queue = [];

function getContainer() {
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-4 right-4 flex flex-col gap-2 z-50 pointer-events-none';
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', 'Notifications');
    document.body.appendChild(container);
  }
  return container;
}

function removeToast(el) {
  el.style.opacity = '0';
  el.style.transform = 'translateY(8px)';
  setTimeout(() => {
    if (el.parentNode) el.parentNode.removeChild(el);
    const idx = queue.indexOf(el);
    if (idx !== -1) queue.splice(idx, 1);
  }, 200);
}

function showToast(message, type = 'info') {
  const c = getContainer();

  // Dismiss oldest if at capacity
  if (queue.length >= MAX_TOASTS) {
    removeToast(queue[0]);
  }

  const colorMap = {
    error:   { bg: 'bg-[#FF3B30]/10', border: 'border-[#FF3B30]/30', text: 'text-[#FF6B6B]', role: 'alert', icon: '⚠️' },
    warning: { bg: 'bg-[#FF9500]/10', border: 'border-[#FF9500]/30', text: 'text-[#FFB347]', role: 'status', icon: '⚡' },
    info:    { bg: 'bg-primary/10',    border: 'border-primary/30',    text: 'text-primary', role: 'status', icon: 'ℹ️' },
    success: { bg: 'bg-[#34C759]/10',  border: 'border-[#34C759]/30',  text: 'text-[#30D158]', role: 'status', icon: '✓' },
  };

  const config = colorMap[type] || colorMap.info;

  const el = document.createElement('div');
  el.className = [
    'pointer-events-auto',
    'bg-surface border rounded-xl',
    config.border,
    'px-4 py-3',
    'text-sm font-medium',
    config.text,
    'cursor-pointer select-none',
    'shadow-lg shadow-black/20',
    'transition-all duration-200 ease-out',
    'flex items-center gap-2',
  ].join(' ');
  el.innerHTML = `<span aria-hidden="true">${config.icon}</span><span>${message}</span>`;
  
  // Accessibility: role="alert" for errors (interruptive), role="status" for info/warnings
  el.setAttribute('role', config.role);
  el.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');

  el.style.opacity = '0';
  el.style.transform = 'translateY(8px)';

  el.addEventListener('click', () => removeToast(el));

  c.appendChild(el);
  queue.push(el);

  // Fade in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
  });

  // Don't auto-dismiss error toasts - they require user action (WCAG 3.3.1)
  if (type !== 'error') {
    setTimeout(() => removeToast(el), AUTO_DISMISS_MS);
  }
}

export const toast = {
  error:   (msg) => showToast(msg, 'error'),
  warning: (msg) => showToast(msg, 'warning'),
  info:    (msg) => showToast(msg, 'info'),
  success: (msg) => showToast(msg, 'success'),
};
