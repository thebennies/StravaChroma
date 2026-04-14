import { COLORWAYS, DEFAULT_DATA_PRESET, DEFAULT_LABEL_PRESET } from '../constants.js';
import { createIcons, Shuffle, ListRestart, RotateCw, Layers, X, Search, Undo2, Redo2, BookmarkPlus } from 'lucide';
import { buildLayerSection } from './slider-controls.js';
import { buildColorwaysPanel } from './colorway-ui.js';
import { buildActionsPanel } from './actions-panel.js';
import { buildMobileTabs } from './mobile-tabs.js';

// Re-export buildActions so main.js can import it from here
export { buildActions } from './export-controls.js';

/**
 * Builds the controls DOM and returns wiring callbacks.
 * On mobile: renders a tab bar (TOOLS | MAP | DATA | LABEL) with Save button in the tab bar.
 * On desktop: renders all sections stacked (unchanged).
 */
export function buildControls(container, { isMobile, onSliderChange, onPresetChange, onRandom, onReset, onSwap, onExport, onColorway, onBackgroundChange, onDropShadowChange, onLogoChange, initialBackground = 'auto', initialCustomImage = null, initialDropShadow = false, onGradientChange, initialGradient = false, initialLogo = false, onUndo, onRedo, onSaveCustom, onDeleteCustom, signal }) {
  container.innerHTML = '';

  const mapSection = buildLayerSection('Map / Route', 'map', {
    initialHue: 25,
    initialSat: 100,
    initialLuminance: 50,
    presetIndex: 0,
    onSliderChange,
    onPresetChange,
  });

  const dataSection = buildLayerSection('Data', 'data', {
    initialHue: 0,
    initialSat: 0,
    initialLuminance: 100,
    presetIndex: DEFAULT_DATA_PRESET,
    onSliderChange,
    onPresetChange,
  });

  const labelSection = buildLayerSection('Label', 'label', {
    initialHue: 0,
    initialSat: 0,
    initialLuminance: 100,
    presetIndex: DEFAULT_LABEL_PRESET,
    onSliderChange,
    onPresetChange,
  });

  if (isMobile) {
    return buildMobileTabs(container, { mapSection, dataSection, labelSection, onRandom, onReset, onSwap, onExport, onColorway, onBackgroundChange, initialBackground, initialCustomImage, onDropShadowChange, initialDropShadow, onGradientChange, initialGradient, onLogoChange, initialLogo, onUndo, onRedo, onSaveCustom, onDeleteCustom, signal });
  }

  // ── Desktop: all sections stacked ──────────────────────────────────────────

  const { el: randomWrapper, setUndoEnabled, setRedoEnabled } = buildActionsPanel(onRandom, onSwap, onReset, { onUndo, onRedo, onBackgroundChange, initialBackground, initialCustomImage, onDropShadowChange, initialDropShadow, onGradientChange, initialGradient, onLogoChange, initialLogo });
  randomWrapper.classList.add('border-b', 'border-border');

  const desktopColorwaysSection = document.createElement('div');
  desktopColorwaysSection.className = 'border-b border-border';
  const desktopColorwaysHeading = document.createElement('p');
  desktopColorwaysHeading.className = 'px-5 pt-4 pb-1 text-xs font-semibold tracking-wide uppercase text-text-secondary';
  desktopColorwaysHeading.textContent = 'Colorways';
  const { el: desktopColorwaysInner, setActive: setActiveColorway, refresh: refreshColorways } = buildColorwaysPanel(COLORWAYS, onColorway, { onSwap, signal, onDeleteCustom });
  desktopColorwaysSection.appendChild(desktopColorwaysHeading);
  desktopColorwaysSection.appendChild(desktopColorwaysInner);

  // Save Custom Colorway button (below manual layer sections)
  const saveCustomBtn = document.createElement('button');
  saveCustomBtn.className = 'mx-4 my-3 py-2.5 btn-secondary text-sm font-medium flex items-center justify-center gap-2 cursor-pointer';
  saveCustomBtn.style.width = 'calc(100% - 2rem)';
  saveCustomBtn.innerHTML = `<i data-lucide="bookmark-plus" class="w-4 h-4 flex-shrink-0"></i><span>Save as Custom Colorway</span>`;
  saveCustomBtn.setAttribute('aria-label', 'Save current colors as a custom colorway');
  saveCustomBtn.addEventListener('click', onSaveCustom ?? (() => {}));

  container.appendChild(randomWrapper);
  container.appendChild(desktopColorwaysSection);
  container.appendChild(labelSection.el);
  container.appendChild(dataSection.el);
  container.appendChild(mapSection.el);
  container.appendChild(saveCustomBtn);

  createIcons({ icons: { Shuffle, ListRestart, RotateCw, Layers, X, Search, Undo2, Redo2, BookmarkPlus } });

  function setEnabled(enabled) {
    container.style.display = enabled ? '' : 'none';
  }

  function setRandomEnabled(enabled) {
    randomWrapper.style.display = enabled ? '' : 'none';
  }

  return {
    updateMapControls:   mapSection.update,
    updateDataControls:  dataSection.update,
    updateLabelControls: labelSection.update,
    setEnabled,
    setRandomEnabled,
    setActiveColorway,
    setUndoEnabled,
    setRedoEnabled,
    refreshColorways,
    setExporting:    () => {},
    setExportEnabled: () => {},
  };
}
