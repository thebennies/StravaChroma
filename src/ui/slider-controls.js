import { Shuffle, ListRestart, RotateCw, Layers } from 'lucide';
import { PRESETS } from '../constants.js';

/**
 * Build a layer section with sliders and presets
 * @param {string} title - Section title
 * @param {string} layer - Layer name ('map', 'data', 'label')
 * @param {Object} options - Configuration options
 * @returns {HTMLElement} Section container
 */
export function buildLayerSection(title, layer, { initialHue, initialSat, initialLuminance, presetIndex, onSliderChange, onPresetChange, signal }) {
  const section = document.createElement('div');
  section.className = 'space-y-4';

  // Header with title and reset
  const header = document.createElement('div');
  header.className = 'flex items-center justify-between';

  const titleEl = document.createElement('h3');
  titleEl.className = 'text-sm font-bold text-text-primary';
  titleEl.textContent = title;

  const resetBtn = document.createElement('button');
  resetBtn.className = 'text-xs text-text-muted hover:text-text-primary transition-colors';
  resetBtn.textContent = 'Reset';
  resetBtn.addEventListener('click', () => onPresetChange(layer, layer === 'map' ? 0 : layer === 'data' ? PRESETS.findIndex(p => p.name === 'Pure White') : PRESETS.findIndex(p => p.name === 'Pure White')));

  header.appendChild(titleEl);
  header.appendChild(resetBtn);
  section.appendChild(header);

  // Sliders
  const hueRow = buildSliderRow(
    `${layer}-hue`,
    'Hue',
    0, 360, initialHue,
    'hue', layer,
    (val) => onSliderChange(layer, 'hue', val)
  );

  const satRow = buildSliderRow(
    `${layer}-sat`,
    'Saturation',
    0, 100, initialSat,
    'sat', layer,
    (val) => onSliderChange(layer, 'sat', val / 100)
  );

  const lumRow = buildSliderRow(
    `${layer}-lum`,
    'Luminance',
    0, 100, initialLuminance,
    'luminance', layer,
    (val) => onSliderChange(layer, 'luminance', val / 100)
  );

  section.appendChild(hueRow);
  section.appendChild(satRow);
  section.appendChild(lumRow);

  // Presets
  const presetRow = buildPresetRow(layer, presetIndex, onPresetChange, signal);
  section.appendChild(presetRow);

  return section;
}

/**
 * Build a slider row with label and input
 * @param {string} id - Slider ID
 * @param {string} label - Label text
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {number} initial - Initial value
 * @param {string} type - Slider type ('hue', 'sat', 'luminance')
 * @param {string} layer - Layer name
 * @param {Function} onChange - Change handler
 * @returns {HTMLElement} Slider row container
 */
export function buildSliderRow(id, label, min, max, initial, type, layer, onChange) {
  const row = document.createElement('div');
  row.className = 'space-y-1';

  const header = document.createElement('div');
  header.className = 'flex items-center justify-between';

  const labelEl = document.createElement('label');
  labelEl.className = 'text-xs text-text-secondary';
  labelEl.textContent = label;
  labelEl.htmlFor = id;

  const valueEl = document.createElement('span');
  valueEl.className = 'text-xs text-text-muted font-mono';
  valueEl.textContent = initial;

  header.appendChild(labelEl);
  header.appendChild(valueEl);
  row.appendChild(header);

  const input = document.createElement('input');
  input.type = 'range';
  input.id = id;
  input.min = min;
  input.max = max;
  input.value = initial;
  input.className = 'w-full h-2 bg-surface-variant rounded-lg appearance-none cursor-pointer accent-primary';

  // Update value display and call handler
  input.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    valueEl.textContent = val;
    onChange(type === 'hue' ? val : val / 100);
  });

  row.appendChild(input);

  return row;
}

/**
 * Build preset selection row
 * @param {string} layer - Layer name
 * @param {number} initialIndex - Initial preset index
 * @param {Function} onChange - Change handler
 * @param {AbortSignal} signal - Abort signal for cleanup
 * @returns {HTMLElement} Preset row container
 */
export function buildPresetRow(layer, initialIndex, onChange, signal) {
  const row = document.createElement('div');
  row.className = 'flex flex-wrap gap-1 pt-2';

  PRESETS.forEach((preset, index) => {
    const btn = document.createElement('button');
    btn.className = [
      'px-2 py-1 text-xs rounded-md transition-colors',
      index === initialIndex
        ? 'bg-primary text-white'
        : 'bg-surface-variant text-text-secondary hover:bg-border'
    ].join(' ');
    btn.textContent = preset.name;
    btn.addEventListener('click', () => {
      onChange(layer, index);
    }, { signal });

    row.appendChild(btn);
  });

  return row;
}

/**
 * Update slider controls with new values
 * @param {string} layer - Layer name
 * @param {Object} values - New values { hue, sat, luminance }
 */
export function updateLayerControls(layer, { hue, sat, luminance }) {
  const hueInput = document.getElementById(`${layer}-hue`);
  const satInput = document.getElementById(`${layer}-sat`);
  const lumInput = document.getElementById(`${layer}-lum`);

  if (hueInput) {
    hueInput.value = hue;
    hueInput.previousElementSibling?.querySelector('span')?.textContent?.(hue);
  }
  if (satInput) {
    satInput.value = Math.round(sat * 100);
    satInput.previousElementSibling?.querySelector('span')?.textContent?.(Math.round(sat * 100));
  }
  if (lumInput) {
    lumInput.value = Math.round(luminance * 100);
    lumInput.previousElementSibling?.querySelector('span')?.textContent?.(Math.round(luminance * 100));
  }
}
