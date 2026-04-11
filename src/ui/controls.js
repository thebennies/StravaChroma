import { PRESETS, COLORWAYS, DEFAULT_DATA_PRESET, DEFAULT_LABEL_PRESET } from '../constants.js';
import { createIcons, Shuffle, ListRestart, RotateCw, Layers, X } from 'lucide';

const GROUP_SELECTION_KEY = 'stravachroma-selected-groups';
// Extract unique groups and sort with Mono at the end
const UNIQUE_GROUPS = [...new Set(COLORWAYS.map(cw => cw.group))];
const MANDATORY_GROUP = 'Mono';
const ALL_GROUPS = [
  ...UNIQUE_GROUPS.filter(g => g !== MANDATORY_GROUP),
  MANDATORY_GROUP
];

function getSavedGroupSelection() {
  try {
    const saved = localStorage.getItem(GROUP_SELECTION_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Guard against non-array JSON
      if (!Array.isArray(parsed)) return [...ALL_GROUPS];
      // Always ensure Mono is included
      if (!parsed.includes(MANDATORY_GROUP)) {
        parsed.unshift(MANDATORY_GROUP);
      }
      return parsed;
    }
  } catch {
    // Ignore localStorage errors
  }
  // Default: all groups selected
  return [...ALL_GROUPS];
}

function saveGroupSelection(selectedGroups) {
  try {
    localStorage.setItem(GROUP_SELECTION_KEY, JSON.stringify(selectedGroups));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Builds the controls DOM and returns wiring callbacks.
 * On mobile: renders a tab bar (TOOLS | MAP | DATA | LABEL) with Save button in the tab bar.
 * On desktop: renders all sections stacked (unchanged).
 */
export function buildControls(container, { isMobile, onSliderChange, onPresetChange, onRandom, onReset, onSwap, onExport, onColorway, onBackgroundChange, initialBackground = 'auto', initialCustomImage = null, signal }) {
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
    return buildMobileTabs(container, { mapSection, dataSection, labelSection, onRandom, onReset, onSwap, onExport, onColorway, onBackgroundChange, initialBackground, initialCustomImage, signal });
  }

  // ── Desktop: all sections stacked ──────────────────────────────────────────

  const randomWrapper = buildActionsPanel(onRandom, onSwap, onReset, { onBackgroundChange, initialBackground, initialCustomImage });
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

  createIcons({ icons: { Shuffle, ListRestart, RotateCw, Layers, X } });

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

// ── Mobile tab layout ─────────────────────────────────────────────────────────

function buildMobileTabs(container, { mapSection, dataSection, labelSection, onRandom, onReset, onSwap, onExport, onColorway, onBackgroundChange, initialBackground, initialCustomImage, signal }) {
  // Make container a flex column — panels will live in an absolutely-positioned area
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.overflow = 'hidden';

  // Tab bar: tabs on left, Save button on right
  const tabBar = document.createElement('div');
  tabBar.className = 'flex items-center border-b border-border bg-surface';
  tabBar.style.flexShrink = '0';
  tabBar.setAttribute('role', 'tablist');

  const tabsWrapper = document.createElement('div');
  tabsWrapper.className = 'flex';
  tabBar.appendChild(tabsWrapper);

  // Save button pinned to far right of tab bar
  const saveBtn = document.createElement('button');
  saveBtn.id = 'export-btn';
  saveBtn.className = saveBtnClass(false);
  saveBtn.textContent = 'Save';
  saveBtn.setAttribute('aria-label', 'Save edited image');
  saveBtn.addEventListener('click', onExport, signal ? { signal } : undefined);
  tabBar.appendChild(saveBtn);

  // Panel area: grows to fill all space below the tab bar; panels sit absolutely inside it
  const panelArea = document.createElement('div');
  panelArea.style.flexGrow = '1';
  panelArea.style.flexShrink = '1';
  panelArea.style.flexBasis = '0px';
  panelArea.style.minHeight = '0';
  panelArea.style.position = 'relative';
  panelArea.style.overflow = 'hidden';

  // Build panels
  const actionsPanel = buildActionsPanel(onRandom, onSwap, onReset, { onBackgroundChange, initialBackground, initialCustomImage });
  const { el: colorwaysPanel, setActive: setActiveColorway } = buildColorwaysPanel(COLORWAYS, onColorway, { mobile: true, onSwap, signal });

  // Manual panel — stacks Label, Data, Map sections vertically with headings intact
  const manualPanel = document.createElement('div');
  manualPanel.style.overflowY = 'auto';
  [labelSection.el, dataSection.el, mapSection.el].forEach(el => {
    manualPanel.appendChild(el);
  });
  const manualBottomSpacer = document.createElement('div');
  manualBottomSpacer.style.height = '4em';
  manualBottomSpacer.style.flexShrink = '0';
  manualPanel.appendChild(manualBottomSpacer);

  const tabDefs = [
    { id: 'actions',   label: 'Actions',   panel: actionsPanel },
    { id: 'colorways', label: 'Colorways', panel: colorwaysPanel },
    { id: 'manual',    label: 'Manual',    panel: manualPanel },
  ];

  // Mount all panels absolutely inside panelArea — they fill the area exactly
  tabDefs.forEach(({ id, panel }) => {
    panel.id = `tab-panel-${id}`;
    panel.setAttribute('role', 'tabpanel');
    panel.style.position = 'absolute';
    panel.style.top = '0';
    panel.style.left = '0';
    panel.style.right = '0';
    panel.style.bottom = '0';
    panel.style.display = 'none';
    panel.style.overflow = 'hidden';
    panelArea.appendChild(panel);
  });

  // colorwaysPanel needs its own flex layout to let the list scroll
  colorwaysPanel.style.display = 'none'; // will be set by activateTab
  colorwaysPanel.style.flexDirection = 'column';

  // Manual panel scrolls its stacked content
  manualPanel.style.overflowY = 'auto';

  const tabBtns = tabDefs.map(({ id, label }) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-controls', `tab-panel-${id}`);
    btn.addEventListener('click', () => activateTab(id));
    tabsWrapper.appendChild(btn);
    return btn;
  });

  let activeTabId = 'actions';

  function activateTab(id) {
    activeTabId = id;
    tabBtns.forEach((btn, i) => {
      const isActive = tabDefs[i].id === id;
      btn.className = isActive ? tabBtnActiveClass() : tabBtnInactiveClass();
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      btn.style.borderImage = isActive
        ? 'linear-gradient(135deg, #F04A00 0%, #C0349A 55%, #7B2FBE 100%) 1'
        : '';
    });
    tabDefs.forEach(({ id: tabId, panel }) => {
      const show = tabId === id;
      if (show) {
        panel.style.display = tabId === 'colorways' ? 'flex' : 'block';
        panel.style.overflow = tabId === 'manual' ? 'hidden auto' : 'auto';
      } else {
        panel.style.display = 'none';
      }
    });
  }

  container.appendChild(tabBar);
  container.appendChild(panelArea);

  // Activate default tab
  activateTab('actions');

  createIcons({ icons: { Shuffle, ListRestart, RotateCw, Layers, X } });

  function setEnabled(enabled) {
    container.style.display = enabled ? 'flex' : 'none';
  }

  function setRandomEnabled(enabled) {
    // Only override the panel display when 'actions' is the active tab —
    // otherwise the tab system's own display setting stays in charge.
    if (activeTabId === 'actions') {
      actionsPanel.style.display = enabled ? 'block' : 'none';
    }
  }

  function setExporting(exporting) {
    saveBtn.disabled = exporting;
    saveBtn.textContent = exporting ? 'Saving\u2026' : 'Save';
    saveBtn.setAttribute('aria-label', exporting ? 'Saving image, please wait' : 'Save edited image');
    saveBtn.className = saveBtnClass(exporting);
  }

  function setExportEnabled(enabled) {
    saveBtn.style.visibility = enabled ? '' : 'hidden';
  }

  return {
    updateMapControls:   mapSection.update,
    updateDataControls:  dataSection.update,
    updateLabelControls: labelSection.update,
    setEnabled,
    setRandomEnabled,
    setActiveColorway,
    setExporting,
    setExportEnabled,
  };
}

// Inline SVGs for background card icons — avoids needing a second createIcons pass on dynamic updates
const SVG_MOON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
const SVG_SUN  = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
const SVG_AUTO = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18Z" fill="currentColor" stroke="none"/></svg>`;
const SVG_IMG  = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`;
const SVG_X    = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;

function bgCardClass(active) {
  return [
    'flex flex-col items-center justify-center gap-1.5',
    'aspect-square w-full rounded-xl border',
    'text-xs font-medium cursor-pointer transition-colors duration-150',
    active
      ? 'bg-surface-variant border-primary text-text-primary'
      : 'bg-surface-variant border-border text-text-primary hover:bg-border hover:border-primary/50',
  ].join(' ');
}

function buildActionsPanel(onRandom, onSwap, onReset, { onBackgroundChange, initialBackground = 'auto', initialCustomImage = null } = {}) {
  const panel = document.createElement('div');
  panel.appendChild(buildActionGrid([
    {
      id: 'random-btn',
      icon: 'shuffle',
      label: 'Shuffle',
      ariaLabel: 'Randomize all colors',
      onClick: onRandom,
    },
    {
      id: 'swap-btn',
      icon: 'rotate-cw',
      label: 'Cycle',
      ariaLabel: 'Rotate colors between map, data and label',
      onClick: onSwap,
    },
    {
      id: 'reset-btn',
      icon: 'list-restart',
      label: 'Reset',
      extraClass: 'text-error',
      ariaLabel: 'Reset all colors to defaults',
      onClick: () => { if (window.confirm('Reset all colors to their defaults?')) onReset(); },
    },
  ]));

  // ── Background sub-section ──────────────────────────────────────────────────

  let localBackground  = initialBackground;
  let localCustomImage = initialCustomImage;

  const separator = document.createElement('div');
  separator.className = 'border-t border-border mx-4';

  const bgHeading = document.createElement('p');
  bgHeading.className = 'px-4 pt-3 pb-1 text-xs font-semibold tracking-wide uppercase text-text-secondary';
  bgHeading.textContent = 'Background';

  const bgGrid = document.createElement('div');
  bgGrid.className = 'grid grid-cols-4 gap-2 px-4 pb-4';

  // Dark card
  const darkCard = document.createElement('button');
  darkCard.setAttribute('aria-label', 'Dark background');
  darkCard.innerHTML = `${SVG_MOON}<span>Dark</span>`;
  darkCard.addEventListener('click', () => {
    localBackground  = 'black';
    localCustomImage = null;
    updateCards();
    onBackgroundChange?.('black', null);
  });

  // Light card
  const lightCard = document.createElement('button');
  lightCard.setAttribute('aria-label', 'Light background');
  lightCard.innerHTML = `${SVG_SUN}<span>Light</span>`;
  lightCard.addEventListener('click', () => {
    localBackground  = 'white';
    localCustomImage = null;
    updateCards();
    onBackgroundChange?.('white', null);
  });

  // Auto card
  const autoCard = document.createElement('button');
  autoCard.setAttribute('aria-label', 'Auto background — adapts to color brightness');
  autoCard.innerHTML = `${SVG_AUTO}<span>Auto</span>`;
  autoCard.addEventListener('click', () => {
    localBackground  = 'auto';
    localCustomImage = null;
    updateCards();
    onBackgroundChange?.('auto', null);
  });

  // Image / Clear card
  const imageCard = document.createElement('button');

  // Hidden file input for image picker
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      localCustomImage = e.target.result;
      localBackground  = 'image';
      updateCards();
      onBackgroundChange?.('image', localCustomImage);
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
  });
  panel.appendChild(fileInput);

  imageCard.addEventListener('click', () => {
    if (localCustomImage) {
      // Clear
      localCustomImage = null;
      localBackground  = 'auto';
      updateCards();
      onBackgroundChange?.('auto', null);
    } else {
      fileInput.click();
    }
  });

  function updateCards() {
    darkCard.className  = bgCardClass(localBackground === 'black');
    lightCard.className = bgCardClass(localBackground === 'white');
    autoCard.className  = bgCardClass(localBackground === 'auto');
    imageCard.className = bgCardClass(localBackground === 'image');
    imageCard.setAttribute('aria-label', localCustomImage ? 'Clear background image' : 'Set background image');
    imageCard.innerHTML = localCustomImage
      ? `${SVG_X}<span>Clear</span>`
      : `${SVG_IMG}<span>Image</span>`;
  }

  bgGrid.appendChild(darkCard);
  bgGrid.appendChild(lightCard);
  bgGrid.appendChild(autoCard);
  bgGrid.appendChild(imageCard);

  panel.appendChild(separator);
  panel.appendChild(bgHeading);
  panel.appendChild(bgGrid);

  // Set initial state
  updateCards();

  return panel;
}

function tabBtnInactiveClass() {
  return [
    'px-2 py-3 text-xs font-medium',
    'text-text-secondary border-b-2 border-transparent -mb-px',
    'hover:text-text-primary transition-colors duration-150 cursor-pointer',
  ].join(' ');
}

function tabBtnActiveClass() {
  return [
    'px-2 py-3 text-xs font-semibold',
    'text-text-primary border-b-2 -mb-px',
    'transition-colors duration-150 cursor-pointer',
  ].join(' ');
}

function saveBtnClass(disabled) {
  return [
    'ml-auto mr-3 px-3 py-1.5',
    disabled
      ? 'bg-surface-variant text-text-muted cursor-not-allowed'
      : 'btn-gradient cursor-pointer',
    'text-xs font-bold rounded-lg',
    'transition-all duration-200',
  ].join(' ');
}

// ── Shared section builder ────────────────────────────────────────────────────

function buildLayerSection(title, layer, { initialHue, initialSat, initialLuminance, presetIndex, onSliderChange, onPresetChange }) {
  const section = document.createElement('div');
  section.className = 'px-5 py-4 border-b border-border';

  // Section title
  const heading = document.createElement('p');
  heading.className = 'text-xs font-semibold tracking-wide uppercase text-text-secondary mb-4';
  heading.textContent = title;
  section.appendChild(heading);

  // Sliders container
  const slidersEl = document.createElement('div');
  slidersEl.id = `${layer}-sliders`;
  slidersEl.className = 'flex flex-col gap-5 mb-4';
  section.appendChild(slidersEl);

  let curHue = initialHue, curSat = initialSat / 100, curLum = initialLuminance / 100;

  function refreshTracks() {
    hueRow.updateTrack(curHue, curSat, curLum);
    satRow.updateTrack(curHue, curSat, curLum);
    lumRow.updateTrack(curHue, curSat, curLum);
  }

  const hueRow = buildSliderRow(`${layer}-hue`, 'Hue', 0, 360, initialHue, 'hue', layer, (val) => {
    curHue = val;
    onSliderChange(layer, 'hue', val);
  });

  const satRow = buildSliderRow(`${layer}-sat`, 'Saturation', 0, 100, initialSat, 'sat', layer, (val) => {
    curSat = val / 100;
    onSliderChange(layer, 'sat', val / 100);
  });

  const lumRow = buildSliderRow(`${layer}-lum`, 'Luminance', 0, 100, initialLuminance, 'lum', layer, (val) => {
    curLum = val / 100;
    onSliderChange(layer, 'luminance', val / 100);
  });

  slidersEl.appendChild(hueRow.el);
  slidersEl.appendChild(satRow.el);
  slidersEl.appendChild(lumRow.el);

  // Initialise gradients
  refreshTracks();

  // Preset picker row
  const presetRow = buildPresetRow(layer, presetIndex, (idx) => {
    onPresetChange(layer, idx);
  });
  section.appendChild(presetRow.el);

  function update({ hue, sat, luminance, selectedPreset }) {
    if (hue       !== undefined) { curHue = hue;       hueRow.setValue(Math.round(hue)); }
    if (sat       !== undefined) { curSat = sat;       satRow.setValue(Math.round(sat * 100)); }
    if (luminance !== undefined) { curLum = luminance; lumRow.setValue(Math.round(luminance * 100)); }
    if (selectedPreset !== undefined) presetRow.setValue(selectedPreset);
    refreshTracks();
  }

  return { el: section, update };
}

function buildSliderRow(id, label, min, max, initial, type, layer, onChange) {
  const unit = type === 'hue' ? '\u00B0' : '%';

  const row = document.createElement('div');
  row.className = 'flex flex-col gap-1.5';

  const labelRow = document.createElement('div');
  labelRow.className = 'flex justify-between items-center';

  const labelEl = document.createElement('label');
  labelEl.htmlFor = id;
  labelEl.className = 'text-xs font-medium text-text-secondary';
  labelEl.textContent = label;

  // Editable number input
  const valueInput = document.createElement('input');
  valueInput.type = 'number';
  valueInput.min = min;
  valueInput.max = max;
  valueInput.value = initial;
  valueInput.className = [
    'w-[3.75rem] text-right text-xs font-semibold text-text-primary',
    'bg-surface-variant border border-border rounded px-1.5 py-0.5',
    'focus:outline-none focus:border-primary',
  ].join(' ');
  valueInput.setAttribute('aria-label', `${label} value for ${layer}`);
  // Hide spin buttons via inline style (Tailwind purges arbitrary variants unreliably)
  valueInput.style.MozAppearance = 'textfield';
  valueInput.style.setProperty('-webkit-appearance', 'none');

  labelRow.appendChild(labelEl);
  labelRow.appendChild(valueInput);
  row.appendChild(labelRow);

  const rangeInput = document.createElement('input');
  rangeInput.type = 'range';
  rangeInput.id = id;
  rangeInput.min = min;
  rangeInput.max = max;
  rangeInput.value = initial;
  rangeInput.className = 'w-full slider-gradient';
  rangeInput.setAttribute('aria-label', `${label} for ${layer} layer`);
  rangeInput.setAttribute('aria-valuemin', min);
  rangeInput.setAttribute('aria-valuemax', max);
  rangeInput.setAttribute('aria-valuenow', initial);
  rangeInput.setAttribute('aria-valuetext', `${initial}${unit}`);

  function updateTrack(hue, sat, lum) {
    let gradient;
    if (type === 'hue') {
      const s = Math.round(sat * 100), l = Math.round(lum * 100);
      const stops = [];
      for (let h = 0; h <= 360; h += 30) stops.push(`hsl(${h},${s}%,${l}%)`);
      gradient = `linear-gradient(to right, ${stops.join(',')})`;
    } else if (type === 'sat') {
      const l = Math.round(lum * 100);
      gradient = `linear-gradient(to right, hsl(${hue},0%,${l}%), hsl(${hue},100%,${l}%))`;
    } else {
      const s = Math.round(sat * 100);
      gradient = `linear-gradient(to right, hsl(${hue},${s}%,0%), hsl(${hue},${s}%,50%), hsl(${hue},${s}%,100%))`;
    }
    rangeInput.style.setProperty('--track-gradient', gradient);
  }

  rangeInput.addEventListener('input', () => {
    const val = Number(rangeInput.value);
    valueInput.value = val;
    rangeInput.setAttribute('aria-valuenow', val);
    rangeInput.setAttribute('aria-valuetext', `${val}${unit}`);
    onChange(val);
  });

  valueInput.addEventListener('input', () => {
    let val = Number(valueInput.value);
    if (!isNaN(val)) {
      val = Math.max(min, Math.min(max, val));
      rangeInput.value = val;
      rangeInput.setAttribute('aria-valuenow', val);
      rangeInput.setAttribute('aria-valuetext', `${val}${unit}`);
      onChange(val);
    }
  });

  valueInput.addEventListener('blur', () => {
    let val = Number(valueInput.value);
    val = Math.max(min, Math.min(max, isNaN(val) ? initial : val));
    valueInput.value = val;
    rangeInput.value = val;
  });

  valueInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') valueInput.blur();
  });

  row.appendChild(rangeInput);

  function setValue(val) {
    rangeInput.value = val;
    valueInput.value = val;
    rangeInput.setAttribute('aria-valuenow', val);
    rangeInput.setAttribute('aria-valuetext', `${val}${unit}`);
  }

  return { el: row, setValue, updateTrack };
}

function buildPresetRow(layer, initialIndex, onChange) {
  const row = document.createElement('div');
  row.className = 'flex items-center gap-2';

  const select = document.createElement('select');
  select.id = `${layer}-preset-select`;
  select.className = [
    'flex-1 bg-surface-variant border border-border',
    'text-xs text-text-primary',
    'px-3 py-2 rounded-lg cursor-pointer',
    'focus:outline-none focus:border-primary',
    'appearance-none',
  ].join(' ');
  select.setAttribute('aria-label', `${layer} color preset`);

  for (let i = 0; i < PRESETS.length; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = PRESETS[i].name;
    if (i === initialIndex) opt.selected = true;
    select.appendChild(opt);
  }

  // Wrapper for select with arrow
  const selectWrapper = document.createElement('div');
  selectWrapper.className = 'relative flex-1';
  selectWrapper.appendChild(select);

  const arrow = document.createElement('span');
  arrow.className = 'absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none text-xs';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '\u25BE';
  selectWrapper.appendChild(arrow);

  const prevBtn = document.createElement('button');
  prevBtn.className = navBtnClass();
  prevBtn.textContent = '\u2039';
  prevBtn.title = 'Previous preset';
  prevBtn.setAttribute('aria-label', 'Previous color preset');

  const nextBtn = document.createElement('button');
  nextBtn.className = navBtnClass();
  nextBtn.textContent = '\u203A';
  nextBtn.title = 'Next preset';
  nextBtn.setAttribute('aria-label', 'Next color preset');

  select.addEventListener('change', () => {
    onChange(Number(select.value));
  });

  prevBtn.addEventListener('click', () => {
    const cur = Number(select.value);
    const next = (cur - 1 + PRESETS.length) % PRESETS.length;
    select.value = next;
    onChange(next);
  });

  nextBtn.addEventListener('click', () => {
    const cur = Number(select.value);
    const next = (cur + 1) % PRESETS.length;
    select.value = next;
    onChange(next);
  });

  row.appendChild(prevBtn);
  row.appendChild(selectWrapper);
  row.appendChild(nextBtn);

  function setValue(idx) {
    select.value = idx;
  }

  return { el: row, setValue };
}

function buildColorwaysPanel(colorwayPresets, onColorway, { mobile = false, onSwap, signal } = {}) {
  const panel = document.createElement('div');
  panel.className = 'flex flex-col';
  if (mobile) {
    panel.style.overflow = 'hidden';
  }

  // Get selected groups from localStorage
  let selectedGroups = getSavedGroupSelection();

  // Filter colorways based on selected groups
  function getFilteredColorways() {
    return colorwayPresets.filter(cw => selectedGroups.includes(cw.group));
  }

  // Build filtered colorways list
  let filteredColorways = getFilteredColorways();
  function refreshFilteredColorways() {
    filteredColorways = getFilteredColorways();
  }

  // Prev / Next nav bar
  const navBar = document.createElement('div');
  navBar.className = 'flex items-center gap-2 px-4 py-2 border-b border-border';
  navBar.style.flexShrink = '0';

  const prevBtn = document.createElement('button');
  prevBtn.className = navBtnClass();
  prevBtn.textContent = '\u2039';
  prevBtn.setAttribute('aria-label', 'Previous colorway');

  const nextBtn = document.createElement('button');
  nextBtn.className = navBtnClass();
  nextBtn.textContent = '\u203A';
  nextBtn.setAttribute('aria-label', 'Next colorway');

  const navBtns = document.createElement('div');
  navBtns.className = 'flex flex-1 items-center justify-center gap-2';

  const shuffleBtn = document.createElement('button');
  shuffleBtn.className = navBtnClass();
  shuffleBtn.setAttribute('aria-label', 'Shuffle colors randomly');
  shuffleBtn.innerHTML = `<i data-lucide="shuffle" class="w-4 h-4 flex-shrink-0"></i>`;
  shuffleBtn.addEventListener('click', () => {
    if (filteredColorways.length === 0) return;
    const randomFilteredIdx = Math.floor(Math.random() * filteredColorways.length);
    const selectedColorway = filteredColorways[randomFilteredIdx];
    const originalIdx = colorwayPresets.indexOf(selectedColorway);
    onColorway(originalIdx);
  });

  const cycleBtn = document.createElement('button');
  cycleBtn.className = navBtnClass();
  cycleBtn.setAttribute('aria-label', 'Cycle colors between layers');
  cycleBtn.innerHTML = `<i data-lucide="rotate-cw" class="w-4 h-4 flex-shrink-0"></i>`;
  if (onSwap) cycleBtn.addEventListener('click', onSwap);

  const groupBtn = document.createElement('button');
  groupBtn.className = navBtnClass();
  groupBtn.setAttribute('aria-label', 'Select groups to display');
  groupBtn.innerHTML = `<i data-lucide="layers" class="w-4 h-4 flex-shrink-0"></i>`;

  navBtns.appendChild(groupBtn);
  navBtns.appendChild(cycleBtn);
  navBtns.appendChild(shuffleBtn);

  navBar.appendChild(prevBtn);
  navBar.appendChild(navBtns);
  navBar.appendChild(nextBtn);

  // Scrollable list
  const list = document.createElement('div');
  list.className = 'px-4 py-3 flex flex-col gap-2';
  if (mobile) {
    list.style.flexGrow = '1';
    list.style.flexShrink = '1';
    list.style.flexBasis = '0px';
    list.style.minHeight = '0';
    list.style.overflowY = 'auto';
  } else {
    list.style.overflowY = 'auto';
    list.style.maxHeight = '176px';
  }

  let activeIdx = -1;
  let activeEl = null;
  const items = [];
  let currentGroup = null;

  function renderList() {
    // Clear existing items
    list.innerHTML = '';
    items.length = 0;
    currentGroup = null;

    filteredColorways.forEach((colorway, filteredIdx) => {
      const originalIdx = colorwayPresets.indexOf(colorway);

      if (colorway.group !== currentGroup) {
        const groupHeader = document.createElement('p');
        groupHeader.className = 'mt-1 text-xs font-semibold tracking-wide uppercase text-text-secondary';
        groupHeader.textContent = colorway.group;
        list.appendChild(groupHeader);
        currentGroup = colorway.group;
      }

      const item = document.createElement('button');
      item.className = colorwayItemClass(false);
      item.setAttribute('aria-label', `Apply ${colorway.name} colorway`);

      const nameEl = document.createElement('span');
      nameEl.className = 'text-sm font-medium';
      nameEl.textContent = colorway.name;

      const swatches = document.createElement('div');
      swatches.className = 'flex gap-1 flex-shrink-0';
      [
        { layer: colorway.label, title: 'Label' },
        { layer: colorway.data,  title: 'Data' },
        { layer: colorway.map,   title: 'Map' },
      ].forEach(({ layer, title }) => {
        const dot = document.createElement('span');
        dot.className = 'w-4 h-4 rounded-sm border border-white/20 flex-shrink-0';
        dot.style.backgroundColor = swatchColor(layer.hue, layer.sat, layer.luminance);
        dot.title = title;
        swatches.appendChild(dot);
      });

      item.appendChild(nameEl);
      item.appendChild(swatches);
      item.addEventListener('click', () => onColorway(originalIdx));
      list.appendChild(item);
      items.push({ el: item, originalIdx });
    });

    // Restore active state if still visible
    if (activeIdx >= 0) {
      const matching = items.find(i => i.originalIdx === activeIdx);
      if (matching) {
        activeEl = matching.el;
        activeEl.className = colorwayItemClass(true);
      } else {
        activeEl = null;
      }
    }
  }

  renderList();

  prevBtn.addEventListener('click', () => {
    if (filteredColorways.length === 0) return;
    const currentFilteredIdx = items.findIndex(i => i.originalIdx === activeIdx);
    const newFilteredIdx = currentFilteredIdx <= 0 ? filteredColorways.length - 1 : currentFilteredIdx - 1;
    const newOriginalIdx = items[newFilteredIdx]?.originalIdx ?? colorwayPresets.indexOf(filteredColorways[0]);
    onColorway(newOriginalIdx);
  });

  nextBtn.addEventListener('click', () => {
    if (filteredColorways.length === 0) return;
    const currentFilteredIdx = items.findIndex(i => i.originalIdx === activeIdx);
    const newFilteredIdx = currentFilteredIdx >= filteredColorways.length - 1 ? 0 : currentFilteredIdx + 1;
    const newOriginalIdx = items[newFilteredIdx]?.originalIdx ?? colorwayPresets.indexOf(filteredColorways[0]);
    onColorway(newOriginalIdx);
  });

  // Group selection modal
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center';
  modalOverlay.style.display = 'none';

  const modalContent = document.createElement('div');
  modalContent.className = 'bg-surface border border-border rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden';

  // Modal header
  const modalHeader = document.createElement('div');
  modalHeader.className = 'flex items-center justify-between px-4 py-3 border-b border-border';

  const modalTitle = document.createElement('h3');
  modalTitle.className = 'text-sm font-semibold text-text-primary';
  modalTitle.textContent = 'Select Groups';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'text-text-secondary hover:text-text-primary transition-colors';
  closeBtn.innerHTML = `<i data-lucide="x" class="w-5 h-5"></i>`;
  closeBtn.setAttribute('aria-label', 'Close modal');
  closeBtn.addEventListener('click', () => {
    modalOverlay.style.display = 'none';
  });

  modalHeader.appendChild(modalTitle);
  modalHeader.appendChild(closeBtn);

  // Select all / Deselect all buttons
  const modalActions = document.createElement('div');
  modalActions.className = 'flex gap-2 px-4 py-2 border-b border-border';

  const selectAllBtn = document.createElement('button');
  selectAllBtn.className = 'flex-1 px-3 py-1.5 text-xs font-medium bg-surface-variant border border-border rounded-lg hover:border-primary transition-colors';
  selectAllBtn.textContent = 'Select All';

  const deselectAllBtn = document.createElement('button');
  deselectAllBtn.className = 'flex-1 px-3 py-1.5 text-xs font-medium bg-surface-variant border border-border rounded-lg hover:border-primary transition-colors';
  deselectAllBtn.textContent = 'Deselect All';

  modalActions.appendChild(selectAllBtn);
  modalActions.appendChild(deselectAllBtn);

  // Group list
  const groupList = document.createElement('div');
  groupList.className = 'max-h-64 overflow-y-auto px-2 py-2';

  const groupCheckboxes = [];

  ALL_GROUPS.forEach(group => {
    const isMandatory = group === MANDATORY_GROUP;
    const row = document.createElement('div');
    row.className = 'flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-variant cursor-pointer';

    const checkbox = document.createElement('div');
    checkbox.className = `w-5 h-5 rounded border flex items-center justify-center transition-colors ${
      isMandatory
        ? 'bg-primary border-primary cursor-not-allowed'
        : 'border-border bg-surface'
    }`;

    const checkIcon = document.createElement('span');
    checkIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    checkIcon.className = isMandatory ? 'text-white' : 'text-white opacity-0';

    checkbox.appendChild(checkIcon);

    const label = document.createElement('span');
    label.className = 'text-sm text-text-primary flex-1';
    label.textContent = group;

    if (isMandatory) {
      const mandatoryBadge = document.createElement('span');
      mandatoryBadge.className = 'text-xs text-text-muted';
      mandatoryBadge.textContent = 'Required';
      row.appendChild(checkbox);
      row.appendChild(label);
      row.appendChild(mandatoryBadge);
    } else {
      row.appendChild(checkbox);
      row.appendChild(label);
    }

    function updateCheckbox() {
      const isChecked = selectedGroups.includes(group);
      if (isChecked) {
        checkbox.classList.remove('border-border', 'bg-surface');
        checkbox.classList.add('bg-primary', 'border-primary');
        checkIcon.classList.remove('opacity-0');
      } else {
        checkbox.classList.add('border-border', 'bg-surface');
        checkbox.classList.remove('bg-primary', 'border-primary');
        checkIcon.classList.add('opacity-0');
      }
    }

    row.addEventListener('click', () => {
      if (isMandatory) return;
      if (selectedGroups.includes(group)) {
        selectedGroups = selectedGroups.filter(g => g !== group);
      } else {
        selectedGroups = [...selectedGroups, group];
      }
      saveGroupSelection(selectedGroups);
      updateCheckbox();
      refreshFilteredColorways();
      renderList();
    });

    groupCheckboxes.push({ group, updateCheckbox });
    groupList.appendChild(row);
  });

  // Select All / Deselect All handlers
  selectAllBtn.addEventListener('click', () => {
    selectedGroups = [...ALL_GROUPS];
    saveGroupSelection(selectedGroups);
    groupCheckboxes.forEach(({ updateCheckbox }) => updateCheckbox());
    refreshFilteredColorways();
    renderList();
  });

  deselectAllBtn.addEventListener('click', () => {
    selectedGroups = [MANDATORY_GROUP]; // Keep only mandatory group
    saveGroupSelection(selectedGroups);
    groupCheckboxes.forEach(({ updateCheckbox }) => updateCheckbox());
    refreshFilteredColorways();
    renderList();
  });

  // Close modal on overlay click
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      modalOverlay.style.display = 'none';
    }
  });

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.style.display !== 'none') {
      modalOverlay.style.display = 'none';
    }
  }, signal ? { signal } : undefined);

  modalContent.appendChild(modalHeader);
  modalContent.appendChild(modalActions);
  modalContent.appendChild(groupList);
  modalOverlay.appendChild(modalContent);
  panel.appendChild(navBar);
  panel.appendChild(list);
  panel.appendChild(modalOverlay);

  // Open modal on group button click
  groupBtn.addEventListener('click', () => {
    // Refresh checkboxes state
    groupCheckboxes.forEach(({ group, updateCheckbox }) => updateCheckbox());
    modalOverlay.style.display = 'flex';
  });

  function setActive(idx) {
    if (activeEl) activeEl.className = colorwayItemClass(false);
    activeIdx = idx;
    const matching = items.find(i => i.originalIdx === idx);
    activeEl = matching?.el ?? null;
    if (activeEl) {
      activeEl.className = colorwayItemClass(true);
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }

  return { el: panel, setActive };
}

function swatchColor(hue, sat, luminance) {
  return `hsl(${hue}, ${Math.round(sat * 100)}%, ${Math.round(luminance * 100)}%)`;
}

function colorwayItemClass(active) {
  return [
    'flex items-center justify-between w-full px-3 py-2.5',
    'rounded-lg border cursor-pointer text-left',
    'transition-colors duration-150',
    active
      ? 'border-primary bg-surface-variant text-text-primary'
      : 'border-border bg-surface hover:bg-surface-variant hover:border-primary/50 text-text-primary',
  ].join(' ');
}

function buildActionGrid(buttons) {
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-4 gap-2 p-4';
  buttons.forEach(({ id, icon, label, extraClass, ariaLabel, onClick }) => {
    const btn = document.createElement('button');
    if (id) btn.id = id;
    btn.className = [
      'flex flex-col items-center justify-center gap-1.5',
      'aspect-square w-full',
      'btn-secondary cursor-pointer',
      'text-xs font-medium',
      extraClass || '',
    ].filter(Boolean).join(' ');
    btn.setAttribute('aria-label', ariaLabel);
    btn.innerHTML = `<i data-lucide="${icon}" class="w-5 h-5 flex-shrink-0"></i><span>${label}</span>`;
    btn.addEventListener('click', onClick);
    grid.appendChild(btn);
  });
  return grid;
}

function navBtnClass() {
  return [
    'bg-surface-variant border border-border',
    'text-text-secondary hover:text-text-primary hover:border-primary hover:bg-surface-variant',
    'w-9 h-9 flex items-center justify-center',
    'text-lg rounded-lg cursor-pointer transition-colors duration-150',
    'flex-shrink-0',
  ].join(' ');
}

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

function exportBtnClass(disabled) {
  return [
    'w-full py-3.5 px-6',
    disabled
      ? 'bg-surface-variant text-text-muted cursor-not-allowed'
      : 'btn-gradient cursor-pointer',
    'text-sm font-bold tracking-wide',
    'transition-all duration-200',
  ].join(' ');
}
