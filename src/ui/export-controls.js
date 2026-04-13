import { exportBtnClass } from './controls-utils.js';

/**
 * Builds action buttons (Export only — desktop footer).
 */
export function buildActions(container, { onExport, signal }) {
  container.innerHTML = '';

  const exportBtn = document.createElement('button');
  exportBtn.id = 'export-btn';
  exportBtn.className = exportBtnClass(false);
  exportBtn.textContent = 'Save Image';
  exportBtn.setAttribute('aria-label', 'Save edited image');
  exportBtn.addEventListener('click', onExport, { signal });

  container.appendChild(exportBtn);

  function setExporting(exporting) {
    exportBtn.disabled = exporting;
    exportBtn.textContent = exporting ? 'Saving\u2026' : 'Save Image';
    exportBtn.setAttribute('aria-label', exporting ? 'Saving image, please wait' : 'Save edited image');
    exportBtn.className = exportBtnClass(exporting);
  }

  function setExportEnabled(enabled) {
    exportBtn.style.display = enabled ? '' : 'none';
  }

  return { setExporting, setExportEnabled };
}
