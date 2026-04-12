/**
 * Modal component for displaying images
 */

let modal = null;
let modalImg = null;
let closeBtn = null;
let content = null;
let onCloseHandler = null;
let triggerElement = null;
let focusTrapHandler = null;

/**
 * Creates and initializes the modal element
 */
function createModal() {
  if (modal) return;

  // Modal backdrop
  modal = document.createElement('div');
  modal.id = 'image-modal';
  modal.className = [
    'fixed inset-0 z-50',
    'flex items-center justify-center',
    'bg-bg/90 backdrop-blur-sm',
    'opacity-0 pointer-events-none',
    'transition-opacity duration-200',
  ].join(' ');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Image preview');

  // Modal content container - wraps image and close button
  content = document.createElement('div');
  content.className = [
    'relative max-w-[90vw]',
    'transform scale-95',
    'transition-transform duration-200',
  ].join(' ');

  // Image container (for positioning close button inside)
  const imageContainer = document.createElement('div');
  imageContainer.className = 'relative';

  // Image element
  modalImg = document.createElement('img');
  modalImg.className = [
    'max-h-[480px] w-auto',
    'rounded-lg border border-border',
    'shadow-2xl',
  ].join(' ');
  modalImg.alt = '';

  // Close button - same styling as docs close button, positioned inside image
  closeBtn = document.createElement('button');
  closeBtn.className = [
    'absolute top-3 right-3 z-10',
    'w-10 h-10 flex items-center justify-center',
    'text-text-muted hover:text-text-primary',
    'transition-colors duration-150 cursor-pointer',
  ].join(' ');
  closeBtn.title = 'Close';
  closeBtn.setAttribute('aria-label', 'Close modal');
  closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg><span class="sr-only">Close</span>';
  closeBtn.addEventListener('click', closeModal);

  imageContainer.appendChild(modalImg);
  imageContainer.appendChild(closeBtn);
  content.appendChild(imageContainer);
  modal.appendChild(content);

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Close on escape key
  document.addEventListener('keydown', handleKeydown);

  document.body.appendChild(modal);
}

function handleKeydown(e) {
  if (!modal || modal.classList.contains('pointer-events-none')) return;
  
  if (e.key === 'Escape') {
    closeModal();
    return;
  }
  
  // Focus trap handling
  if (e.key === 'Tab') {
    const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }
}

/**
 * Opens the modal with the specified image
 * @param {string} src - Image source URL
 * @param {string} alt - Alt text for the image
 */
export function openModal(src, alt = '', triggerEl = null) {
  createModal();

  // Store trigger element for focus return
  triggerElement = triggerEl || document.activeElement;

  modalImg.src = src;
  modalImg.alt = alt;
  if (alt) {
    modal.setAttribute('aria-label', alt);
  }

  // Show modal
  modal.classList.remove('opacity-0', 'pointer-events-none');
  modal.classList.add('opacity-100');

  content.classList.remove('scale-95');
  content.classList.add('scale-100');

  // Prevent body scroll
  document.body.style.overflow = 'hidden';

  // Move focus to close button
  requestAnimationFrame(() => {
    if (closeBtn) closeBtn.focus();
  });
}

/**
 * Closes the modal
 */
export function closeModal() {
  if (!modal) return;

  // Hide modal
  modal.classList.remove('opacity-100');
  modal.classList.add('opacity-0', 'pointer-events-none');

  content.classList.remove('scale-100');
  content.classList.add('scale-95');

  // Restore body scroll
  document.body.style.overflow = '';

  // Return focus to trigger element
  if (triggerElement && triggerElement.focus) {
    triggerElement.focus();
    triggerElement = null;
  }

  if (onCloseHandler) {
    onCloseHandler();
    onCloseHandler = null;
  }
}

/**
 * Sets a callback to be called when the modal closes
 * @param {Function} callback
 */
export function setOnClose(callback) {
  onCloseHandler = callback;
}

/**
 * Destroys the modal and cleans up event listeners
 */
export function destroyModal() {
  if (modal) {
    modal.remove();
    modal = null;
    content = null;
    modalImg = null;
    closeBtn = null;
  }
  document.removeEventListener('keydown', handleKeydown);
}
