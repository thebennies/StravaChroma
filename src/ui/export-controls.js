/**
 * Export action controls
 * Builds the export button with optional cancel functionality
 */

/**
 * Build export action buttons
 * @param {HTMLElement} container - Container element
 * @param {Object} options - Configuration options
 * @returns {Object} Control functions { setExporting, setExportEnabled }
 */
export function buildActions(container, { onExport, onCancelExport, signal }) {
  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'flex gap-2';
  container.appendChild(wrapper);

  const exportBtn = document.createElement('button');
  exportBtn.id = 'export-btn';
  exportBtn.className = exportBtnClass(false);
  exportBtn.textContent = 'Save Image';
  exportBtn.setAttribute('aria-label', 'Save edited image');
  exportBtn.addEventListener('click', onExport, { signal });
  wrapper.appendChild(exportBtn);

  const cancelBtn = document.createElement('button');
  cancelBtn.id = 'cancel-export-btn';
  cancelBtn.className = cancelBtnClass();
  cancelBtn.textContent = 'Cancel';
  cancelBtn.setAttribute('aria-label', 'Cancel export');
  cancelBtn.style.display = 'none';
  cancelBtn.addEventListener('click', () => {
    if (onCancelExport) onCancelExport();
  }, { signal });
  wrapper.appendChild(cancelBtn);

  function setExporting(exporting) {
    exportBtn.disabled = exporting;
    exportBtn.textContent = exporting ? 'Saving\u2026' : 'Save Image';
    exportBtn.setAttribute('aria-label', exporting ? 'Saving image, please wait' : 'Save edited image');
    exportBtn.className = exportBtnClass(exporting);
    cancelBtn.style.display = exporting ? 'block' : 'none';
  }

  function setExportEnabled(enabled) {
    exportBtn.style.display = enabled ? '' : 'none';
    if (!enabled) cancelBtn.style.display = 'none';
  }

  return { setExporting, setExportEnabled };
}

function exportBtnClass(disabled) {
  return [
    'flex-1 py-3.5 px-6',
    disabled
      ? 'bg-surface-variant text-text-muted cursor-not-allowed'
      : 'btn-gradient cursor-pointer',
    'text-sm font-bold tracking-wide',
    'transition-all duration-200',
  ].join(' ');
}

function cancelBtnClass() {
  return [
    'py-3.5 px-4',
    'bg-error/10 text-error hover:bg-error/20',
    'border border-error/30 rounded-lg',
    'text-sm font-bold tracking-wide',
    'cursor-pointer',
    'transition-all duration-200',
  ].join(' ');
}
