import { PRESETS } from '../constants.js';
import { navBtnClass } from './controls-utils.js';
import { registerModal, openModal, closeActiveModal } from './modal-manager.js';

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
  let currentIndex = initialIndex;
  const neutralIdx = PRESETS.findIndex(p => p.name === 'Black');

  function presetColor(idx) {
    const p = PRESETS[idx];
    return `hsl(${p.hue}, ${Math.round(p.sat * 100)}%, ${Math.round(p.luminance * 100)}%)`;
  }

  function updateTrigger(btn, idx) {
    const swatch = btn.querySelector('[data-swatch]');
    const label = btn.querySelector('[data-label]');
    if (idx === -1 || !PRESETS[idx]) {
      swatch.style.background = 'transparent';
      label.textContent = '';
    } else {
      swatch.style.background = presetColor(idx);
      label.textContent = PRESETS[idx].name;
    }
  }

  // Row container
  const row = document.createElement('div');
  row.className = 'flex items-center gap-2';

  // Prev button
  const prevBtn = document.createElement('button');
  prevBtn.className = navBtnClass();
  prevBtn.textContent = '\u2039';
  prevBtn.title = 'Previous preset';
  prevBtn.setAttribute('aria-label', 'Previous color preset');

  // Trigger button (opens modal)
  const triggerBtn = document.createElement('button');
  triggerBtn.className = [
    'flex-1 flex items-center gap-2 px-3 py-2',
    'bg-surface-variant border border-border rounded-lg cursor-pointer',
    'text-xs text-text-primary',
    'hover:border-primary focus:outline-none focus:border-primary',
    'transition-colors duration-150',
  ].join(' ');
  triggerBtn.setAttribute('aria-label', `${layer} color preset`);
  triggerBtn.setAttribute('aria-haspopup', 'dialog');

  const triggerSwatch = document.createElement('span');
  triggerSwatch.setAttribute('data-swatch', '');
  triggerSwatch.style.cssText = `width:1rem;height:1rem;border-radius:50%;background:${presetColor(currentIndex)};flex-shrink:0;`;

  const triggerLabel = document.createElement('span');
  triggerLabel.setAttribute('data-label', '');
  triggerLabel.className = 'flex-1 truncate text-left';
  triggerLabel.textContent = PRESETS[currentIndex].name;

  const chevron = document.createElement('span');
  chevron.className = 'text-text-secondary text-xs flex-shrink-0';
  chevron.setAttribute('aria-hidden', 'true');
  chevron.textContent = '\u25BE';

  triggerBtn.appendChild(triggerSwatch);
  triggerBtn.appendChild(triggerLabel);
  triggerBtn.appendChild(chevron);

  // Next button
  const nextBtn = document.createElement('button');
  nextBtn.className = navBtnClass();
  nextBtn.textContent = '\u203A';
  nextBtn.title = 'Next preset';
  nextBtn.setAttribute('aria-label', 'Next color preset');

  row.appendChild(prevBtn);
  row.appendChild(triggerBtn);
  row.appendChild(nextBtn);

  // Modal overlay — appended to document.body
  const overlay = document.createElement('div');
  overlay.style.display = 'none';
  overlay.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Select Preset');

  const content = document.createElement('div');
  content.className = 'bg-surface border border-border rounded-xl shadow-2xl w-full max-w-xs mx-4 flex flex-col max-h-[70vh]';

  // Header
  const header = document.createElement('div');
  header.className = 'px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0';

  const modalTitle = document.createElement('span');
  modalTitle.className = 'text-sm font-semibold text-text-primary';
  modalTitle.textContent = 'Select Preset';

  const closeBtn = document.createElement('button');
  closeBtn.className = [
    'w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer',
    'text-text-secondary hover:text-text-primary hover:bg-surface-variant',
    'transition-colors duration-150',
  ].join(' ');
  closeBtn.setAttribute('aria-label', 'Close preset selector');
  closeBtn.textContent = '\u00D7';

  header.appendChild(modalTitle);
  header.appendChild(closeBtn);

  // Scrollable list
  const list = document.createElement('div');
  list.className = 'overflow-y-auto flex-1 px-2 py-2 flex flex-col gap-0.5';

  // Build list rows — one per preset, with a neutrals separator
  const listItems = [];

  for (let i = 0; i < PRESETS.length; i++) {
    if (i === neutralIdx) {
      const sep = document.createElement('div');
      sep.className = 'flex items-center gap-2 px-3 py-1 text-xs text-text-secondary';
      sep.setAttribute('aria-hidden', 'true');
      const lineL = document.createElement('span');
      lineL.className = 'flex-1 border-t border-border';
      const sepLabel = document.createElement('span');
      sepLabel.textContent = 'Neutrals';
      const lineR = document.createElement('span');
      lineR.className = 'flex-1 border-t border-border';
      sep.appendChild(lineL);
      sep.appendChild(sepLabel);
      sep.appendChild(lineR);
      list.appendChild(sep);
    }

    const isSelected = i === currentIndex;
    const item = document.createElement('button');
    item.className = [
      'flex items-center gap-3 w-full px-3 py-2 rounded-lg cursor-pointer text-left',
      'text-xs text-text-primary hover:bg-surface-variant transition-colors duration-150',
      isSelected ? 'bg-surface-variant font-semibold' : '',
    ].filter(Boolean).join(' ');
    item.setAttribute('data-index', i);

    const itemSwatch = document.createElement('span');
    itemSwatch.style.cssText = `width:1rem;height:1rem;border-radius:50%;background:${presetColor(i)};flex-shrink:0;`;

    const itemLabel = document.createElement('span');
    itemLabel.className = 'flex-1 truncate';
    itemLabel.textContent = PRESETS[i].name;

    const check = document.createElement('span');
    check.setAttribute('data-check', '');
    check.className = 'text-primary flex-shrink-0';
    check.setAttribute('aria-hidden', 'true');
    check.textContent = '\u2713';
    check.style.visibility = isSelected ? 'visible' : 'hidden';

    item.appendChild(itemSwatch);
    item.appendChild(itemLabel);
    item.appendChild(check);

    const capturedIndex = i;
    item.addEventListener('click', () => {
      // Deselect previous
      const prev = listItems[currentIndex];
      if (prev) {
        prev.classList.remove('bg-surface-variant', 'font-semibold');
        prev.querySelector('[data-check]').style.visibility = 'hidden';
      }
      currentIndex = capturedIndex;
      item.classList.add('bg-surface-variant', 'font-semibold');
      check.style.visibility = 'visible';
      updateTrigger(triggerBtn, currentIndex);
      closeActiveModal();
      onChange(currentIndex);
    });

    listItems.push(item);
    list.appendChild(item);
  }

  content.appendChild(header);
  content.appendChild(list);
  overlay.appendChild(content);
  document.body.appendChild(overlay);

  // Register with modal manager
  const modalId = `preset-modal-${layer}`;
  registerModal(modalId, {
    onClose: () => {
      overlay.style.display = 'none';
      triggerBtn.focus();
    },
    getFocusableElements: () => Array.from(overlay.querySelectorAll('button')),
  });

  // Open modal
  triggerBtn.addEventListener('click', () => {
    overlay.style.display = 'flex';
    openModal(modalId, triggerBtn);
    requestAnimationFrame(() => {
      listItems[currentIndex]?.scrollIntoView({ block: 'nearest' });
      closeBtn.focus();
    });
  });

  closeBtn.addEventListener('click', () => closeActiveModal());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeActiveModal(); });

  // Prev / next — cycle through presets without opening modal
  prevBtn.addEventListener('click', () => {
    const prev = listItems[currentIndex];
    if (prev) {
      prev.classList.remove('bg-surface-variant', 'font-semibold');
      prev.querySelector('[data-check]').style.visibility = 'hidden';
    }
    currentIndex = currentIndex === -1 ? PRESETS.length - 1 : (currentIndex - 1 + PRESETS.length) % PRESETS.length;
    const next = listItems[currentIndex];
    if (next) {
      next.classList.add('bg-surface-variant', 'font-semibold');
      next.querySelector('[data-check]').style.visibility = 'visible';
    }
    updateTrigger(triggerBtn, currentIndex);
    onChange(currentIndex);
  });

  nextBtn.addEventListener('click', () => {
    const prev = listItems[currentIndex];
    if (prev) {
      prev.classList.remove('bg-surface-variant', 'font-semibold');
      prev.querySelector('[data-check]').style.visibility = 'hidden';
    }
    currentIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % PRESETS.length;
    const next = listItems[currentIndex];
    if (next) {
      next.classList.add('bg-surface-variant', 'font-semibold');
      next.querySelector('[data-check]').style.visibility = 'visible';
    }
    updateTrigger(triggerBtn, currentIndex);
    onChange(currentIndex);
  });

  // External setter (called by update() in buildLayerSection); idx may be -1 (custom color)
  function setValue(idx) {
    const prev = listItems[currentIndex];
    if (prev) {
      prev.classList.remove('bg-surface-variant', 'font-semibold');
      prev.querySelector('[data-check]').style.visibility = 'hidden';
    }
    currentIndex = idx;
    const next = listItems[currentIndex];
    if (next) {
      next.classList.add('bg-surface-variant', 'font-semibold');
      next.querySelector('[data-check]').style.visibility = 'visible';
    }
    updateTrigger(triggerBtn, currentIndex);
  }

  return { el: row, setValue };
}
