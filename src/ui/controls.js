import { COLORWAYS, DEFAULT_DATA_PRESET, DEFAULT_LABEL_PRESET } from '../constants.js';
import { createIcons, Shuffle, ListRestart, RotateCw, Layers, X, Search } from 'lucide';
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
export function buildControls(container, { isMobile, onSliderChange, onPresetChange, onRandom, onReset, onSwap, onExport, onColorway, onBackgroundChange, onDropShadowChange, onLogoChange, initialBackground = 'auto', initialCustomImage = null, initialDropShadow = false, onGradientChange, initialGradient = false, initialLogo = false, signal }) {
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
    return buildMobileTabs(container, { mapSection, dataSection, labelSection, onRandom, onReset, onSwap, onExport, onColorway, onBackgroundChange, initialBackground, initialCustomImage, onDropShadowChange, initialDropShadow, onGradientChange, initialGradient, onLogoChange, initialLogo, signal });
  }

  // ── Desktop: all sections stacked ──────────────────────────────────────────

  const randomWrapper = buildActionsPanel(onRandom, onSwap, onReset, { onBackgroundChange, initialBackground, initialCustomImage, onDropShadowChange, initialDropShadow, onGradientChange, initialGradient, onLogoChange, initialLogo });
  randomWrapper.classList.add('border-b', 'border-border');

  const desktopColorwaysSection = document.createElement('div');
  desktopColorwaysSection.className = 'border-b border-border';
  const desktopColorwaysHeading = document.createElement('p');
  desktopColorwaysHeading.className = 'px-5 pt-4 pb-1 text-xs font-semibold tracking-wide uppercase text-text-secondary';
  desktopColorwaysHeading.textContent = 'Colorways';
  const { el: desktopColorwaysInner, setActive: setActiveColorway } = buildColorwaysPanel(COLORWAYS, onColorway, { onSwap, signal });
  desktopColorwaysSection.appendChild(desktopColorwaysHeading);
  desktopColorwaysSection.appendChild(desktopColorwaysInner);

  container.appendChild(randomWrapper);
  container.appendChild(desktopColorwaysSection);
  container.appendChild(labelSection.el);
  container.appendChild(dataSection.el);
  container.appendChild(mapSection.el);

  createIcons({ icons: { Shuffle, ListRestart, RotateCw, Layers, X, Search } });

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
    setExporting:    () => {},
    setExportEnabled: () => {},
  };
}
