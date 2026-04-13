/**
 * Centralized modal manager for handling multiple modals
 * Prevents overlapping Escape key listeners and manages focus
 */

const modals = new Map();
let activeModalId = null;

/**
 * Register a modal with the manager
 * @param {string} id - Unique modal identifier
 * @param {Object} handlers - Modal handlers { onClose, getFocusableElements }
 * @returns {Function} Unregister function
 */
export function registerModal(id, handlers) {
  modals.set(id, handlers);
  
  return function unregister() {
    if (activeModalId === id) {
      activeModalId = null;
    }
    modals.delete(id);
  };
}

/**
 * Open a modal and register it as active
 * @param {string} id - Modal identifier
 * @param {HTMLElement} triggerElement - Element to return focus to on close
 */
export function openModal(id, triggerElement = null) {
  const modal = modals.get(id);
  if (!modal) {
    console.warn(`Modal "${id}" not registered`);
    return;
  }
  
  // If there's already an active modal, close it first
  if (activeModalId && activeModalId !== id) {
    const activeModal = modals.get(activeModalId);
    if (activeModal && activeModal.onClose) {
      activeModal.onClose();
    }
  }
  
  activeModalId = id;
  
  // Store trigger element for focus return
  if (modal.storeTrigger) {
    modal.storeTrigger(triggerElement || document.activeElement);
  }
  
  // Add global escape listener if not already added
  if (!escapeListenerAdded) {
    document.addEventListener('keydown', handleGlobalKeydown);
    escapeListenerAdded = true;
  }
  
  // Prevent body scroll
  document.body.style.overflow = 'hidden';
}

/**
 * Close the currently active modal
 */
export function closeActiveModal() {
  if (!activeModalId) return;
  
  const modal = modals.get(activeModalId);
  if (modal && modal.onClose) {
    modal.onClose();
  }
  
  activeModalId = null;
  document.body.style.overflow = '';

  // Remove the global listener whenever no modal is active.
  // It will be re-added on the next openModal() call.
  document.removeEventListener('keydown', handleGlobalKeydown);
  escapeListenerAdded = false;
}

/**
 * Get the currently active modal ID
 * @returns {string|null}
 */
export function getActiveModal() {
  return activeModalId;
}

let escapeListenerAdded = false;

function handleGlobalKeydown(e) {
  if (e.key === 'Escape') {
    closeActiveModal();
    return;
  }
  
  // Focus trap for active modal
  if (e.key === 'Tab' && activeModalId) {
    const modal = modals.get(activeModalId);
    if (modal && modal.getFocusableElements) {
      const elements = modal.getFocusableElements();
      if (elements.length === 0) return;
      
      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];
      
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }
}

/**
 * Check if any modal is currently open
 * @returns {boolean}
 */
export function isModalOpen() {
  return activeModalId !== null;
}

/**
 * Close all registered modals
 */
export function closeAllModals() {
  const ids = Array.from(modals.keys());
  ids.forEach(id => {
    const modal = modals.get(id);
    if (modal && modal.onClose) {
      modal.onClose();
    }
  });
  activeModalId = null;
  document.body.style.overflow = '';
}
