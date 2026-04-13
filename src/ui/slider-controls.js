import { PRESETS } from '../constants.js';
import { navBtnClass } from './controls-utils.js';

export function buildLayerSection(title, layer, { initialHue, initialSat, initialLuminance, presetIndex, onSliderChange, onPresetChange }) {
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

export function buildSliderRow(id, label, min, max, initial, type, layer, onChange) {
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

export function buildPresetRow(layer, initialIndex, onChange) {
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
