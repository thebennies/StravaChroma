import { COLORWAYS, DEFAULT_DATA_PRESET, DEFAULT_LABEL_PRESET } from '../constants.js';
import { buildLayerSection } from './slider-controls.js';
import { buildColorwaysPanel } from './colorway-ui.js';
import { buildActions } from './export-controls.js';
import { ALL_GROUPS, MANDATORY_GROUP } from './controls-utils.js';
import { Shuffle, ListRestart, RotateCw } from 'lucide';

// Re-export for backwards compatibility
export { ALL_GROUPS, MANDATORY_GROUP };

/**
 * Main controls builder - orchestrates all control sections
 * @param {HTMLElement} container - Container element
 * @param {Object} options - Configuration options
 * @returns {Object} Control functions
 */
export function buildControls(container, options) {
  const {
    isMobile,
    onSliderChange,
    onPresetChange,
    onRandom,
    onReset,
    onSwap,
    onExport,
    onCancelExport,
    onColorway,
    onBackgroundChange,
    onDropShadowChange,
    onLogoChange,
    initialBackground = 'auto',
    initialDropShadow = false,
    onGradientChange,
    initialGradient = false,
    initialLogo = false,
    signal
  } = options;

  container.innerHTML = '';

  // Build layer sections
  const mapSection = buildLayerSection('Map / Route', 'map', {
    initialHue: 25,
    initialSat: 100,
    initialLuminance: 50,
    presetIndex: 0,
    onSliderChange,
    onPresetChange,
    signal,
  });

  const dataSection = buildLayerSection('Data', 'data', {
    initialHue: 0,
    initialSat: 0,
    initialLuminance: 100,
    presetIndex: DEFAULT_DATA_PRESET,
    onSliderChange,
    onPresetChange,
    signal,
  });

  const labelSection = buildLayerSection('Label', 'label', {
    initialHue: 0,
    initialSat: 0,
    initialLuminance: 100,
    presetIndex: DEFAULT_LABEL_PRESET,
    onSliderChange,
    onPresetChange,
    signal,
  });

  // Build colorways panel
  const colorwayPresets = COLORWAYS.map((cw, idx) => ({ ...cw, originalIndex: idx }));
  const colorwaysPanel = buildColorwaysPanel(colorwayPresets, onColorway, {
    mobile: isMobile,
    onSwap,
    signal
  });

  // Build action buttons
  const actionsContainer = document.createElement('div');
  actionsContainer.className = 'flex gap-2';

  const randomBtn = document.createElement('button');
  randomBtn.className = 'flex-1 py-2 px-4 bg-surface-variant hover:bg-border rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2';
  randomBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M3 6h10"/><path d="M3 12h8"/><path d="M3 18h6"/></svg> Random';
  randomBtn.addEventListener('click', onRandom, { signal });

  const resetBtn = document.createElement('button');
  resetBtn.className = 'flex-1 py-2 px-4 bg-surface-variant hover:bg-border rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2';
  resetBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12"/></svg> Reset';
  resetBtn.addEventListener('click', onReset, { signal });

  const swapBtn = document.createElement('button');
  swapBtn.className = 'flex-1 py-2 px-4 bg-surface-variant hover:bg-border rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2';
  swapBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 12v5h14a2 2 0 0 1 0 4H5v-4"/></svg> Swap';
  swapBtn.addEventListener('click', onSwap, { signal });

  actionsContainer.appendChild(randomBtn);
  actionsContainer.appendChild(resetBtn);
  actionsContainer.appendChild(swapBtn);

  // Background controls
  const bgContainer = document.createElement('div');
  bgContainer.className = 'space-y-2';

  const bgLabel = document.createElement('label');
  bgLabel.className = 'text-sm font-medium text-text-primary';
  bgLabel.textContent = 'Background';
  bgContainer.appendChild(bgLabel);

  const bgButtons = document.createElement('div');
  bgButtons.className = 'flex gap-2';

  ['auto', 'black', 'white'].forEach(bg => {
    const btn = document.createElement('button');
    btn.className = [
      'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors border',
      initialBackground === bg
        ? 'bg-primary text-white border-primary'
        : 'bg-surface text-text-secondary border-border hover:border-primary'
    ].join(' ');
    btn.textContent = bg.charAt(0).toUpperCase() + bg.slice(1);
    btn.addEventListener('click', () => {
      onBackgroundChange(bg);
      // Update visual state
      Array.from(bgButtons.children).forEach(b => {
        b.className = b === btn
          ? 'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors border bg-primary text-white border-primary'
          : 'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors border bg-surface text-text-secondary border-border hover:border-primary';
      });
    }, { signal });
    bgButtons.appendChild(btn);
  });

  bgContainer.appendChild(bgButtons);

  // Effect toggles
  const effectsContainer = document.createElement('div');
  effectsContainer.className = 'space-y-2';

  const effectsLabel = document.createElement('label');
  effectsLabel.className = 'text-sm font-medium text-text-primary';
  effectsLabel.textContent = 'Effects';
  effectsContainer.appendChild(effectsLabel);

  const dropShadowToggle = document.createElement('label');
  dropShadowToggle.className = 'flex items-center gap-2 cursor-pointer';
  dropShadowToggle.innerHTML = `
    <input type="checkbox" ${initialDropShadow ? 'checked' : ''} class="rounded border-border text-primary focus:ring-primary">
    <span class="text-sm text-text-secondary">Drop Shadow</span>
  `;
  dropShadowToggle.querySelector('input').addEventListener('change', (e) => {
    onDropShadowChange(e.target.checked);
  }, { signal });
  effectsContainer.appendChild(dropShadowToggle);

  const gradientToggle = document.createElement('label');
  gradientToggle.className = 'flex items-center gap-2 cursor-pointer';
  gradientToggle.innerHTML = `
    <input type="checkbox" ${initialGradient ? 'checked' : ''} class="rounded border-border text-primary focus:ring-primary">
    <span class="text-sm text-text-secondary">Tilted Gradient</span>
  `;
  gradientToggle.querySelector('input').addEventListener('change', (e) => {
    onGradientChange(e.target.checked);
  }, { signal });
  effectsContainer.appendChild(gradientToggle);

  const logoToggle = document.createElement('label');
  logoToggle.className = 'flex items-center gap-2 cursor-pointer';
  logoToggle.innerHTML = `
    <input type="checkbox" ${initialLogo ? 'checked' : ''} class="rounded border-border text-primary focus:ring-primary">
    <span class="text-sm text-text-secondary">Show Logo</span>
  `;
  logoToggle.querySelector('input').addEventListener('change', (e) => {
    onLogoChange(e.target.checked);
  }, { signal });
  effectsContainer.appendChild(logoToggle);

  // Assemble layout
  if (isMobile) {
    // Mobile: tabs
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'flex border-b border-border mb-4';

    const tabs = [
      { id: 'colorways', label: 'Colorways' },
      { id: 'map', label: 'Map' },
      { id: 'data', label: 'Data' },
      { id: 'label', label: 'Label' },
    ];

    let activeTab = 'colorways';

    const contentContainer = document.createElement('div');

    function showTab(tabId) {
      activeTab = tabId;
      contentContainer.innerHTML = '';

      if (tabId === 'colorways') {
        contentContainer.appendChild(colorwaysPanel);
      } else if (tabId === 'map') {
        contentContainer.appendChild(mapSection);
      } else if (tabId === 'data') {
        contentContainer.appendChild(dataSection);
      } else if (tabId === 'label') {
        contentContainer.appendChild(labelSection);
      }

      // Update tab styles
      Array.from(tabsContainer.children).forEach(btn => {
        const isActive = btn.dataset.tab === tabId;
        btn.className = isActive
          ? 'flex-1 py-2 px-4 text-sm font-medium text-primary border-b-2 border-primary'
          : 'flex-1 py-2 px-4 text-sm font-medium text-text-secondary border-b-2 border-transparent hover:text-text-primary';
      });
    }

    tabs.forEach(tab => {
      const btn = document.createElement('button');
      btn.dataset.tab = tab.id;
      btn.textContent = tab.label;
      btn.addEventListener('click', () => showTab(tab.id), { signal });
      tabsContainer.appendChild(btn);
    });

    container.appendChild(tabsContainer);
    container.appendChild(contentContainer);
    container.appendChild(bgContainer);
    container.appendChild(effectsContainer);
    container.appendChild(actionsContainer);

    // Show initial tab
    showTab('colorways');

    return {
      updateMapControls: ({ hue, sat, luminance }) => {
        // Handled by slider event listeners
      },
      updateDataControls: ({ hue, sat, luminance }) => {
        // Handled by slider event listeners
      },
      updateLabelControls: ({ hue, sat, luminance }) => {
        // Handled by slider event listeners
      },
      setEnabled: () => {},
      setRandomEnabled: () => {},
      setActiveColorway: () => {},
      setExporting: () => {},
      setExportEnabled: () => {},
    };
  } else {
    // Desktop: stacked sections
    container.className = 'space-y-6';
    container.appendChild(colorwaysPanel);
    container.appendChild(mapSection);
    container.appendChild(dataSection);
    container.appendChild(labelSection);
    container.appendChild(bgContainer);
    container.appendChild(effectsContainer);
    container.appendChild(actionsContainer);

    // Export actions
    const exportContainer = document.createElement('div');
    container.appendChild(exportContainer);

    const { setExporting, setExportEnabled } = buildActions(exportContainer, {
      onExport,
      onCancelExport,
      signal
    });

    return {
      updateMapControls: ({ hue, sat, luminance }) => {
        // Update sliders if needed
      },
      updateDataControls: ({ hue, sat, luminance }) => {
        // Update sliders if needed
      },
      updateLabelControls: ({ hue, sat, luminance }) => {
        // Update sliders if needed
      },
      setEnabled: (enabled) => {
        // Enable/disable all inputs
      },
      setRandomEnabled: (enabled) => {
        randomBtn.disabled = !enabled;
      },
      setActiveColorway: (idx) => {
        // Update visual selection
      },
      setExporting,
      setExportEnabled,
    };
  }
}

export { buildActions };
