import { swatchColor, CUSTOM_GROUP, SVG_X } from './controls-utils.js';

const PLACEHOLDER_NAMES = [
  'Zestify', 'Glitchpop', 'Neonova', 'Bubblefuzz', 'Vibescape', 'Chromewave', 'Sparklynx',
  'Lushbloom', 'Frostbyte', 'Pixievolt', 'Glowdrift', 'Sizzlepop', 'Velvetrix', 'Hypefluff',
  'Radiantix', 'Sugarrush', 'Blitzhue', 'Moonspark', 'Electricute', 'Jellyvibe', 'Prismjoy',
  'Cosmicush', 'Twinklepop', 'Hyperlush', 'Starfizz', 'Dreamglitz', 'Fluffwave', 'Novaflare',
  'Bubblyx', 'Glowzen', 'Pixelkiss', 'Riotbloom', 'Candyvolt', 'Zenithpop', 'Fizzbloom',
  'Miragehue', 'Sparkwhip', 'Lumenjoy', 'Chillwave', 'Tropicrush', 'Velvetpop', 'Aurorafluff',
  'Glitterbyte', 'Solstice', 'Hologlow', 'Mysticrush', 'Echozest', 'Blitzfluff', 'Quirkwave',
  'Luminova', 'Sweetspark', 'Vortexpop', 'Rainbowly', 'Frostfluff', 'Gigglehue', 'Neonwhirl',
  'Plushvolt', 'Cosmicpop', 'Dazzlefix', 'Shimmerly', 'Joyblast', 'Flarefizz', 'Bubbleglitz',
  'Zenithfluff', 'Chromafizz', 'Starwhip', 'Glowquake', 'Pixelflare', 'Hypegloss', 'Dreamvolt',
  'Sizzlehue', 'Lushquake', 'Twinklyx', 'Radiantpop', 'Fuzznova', 'Electricfluff', 'Prismspark',
  'Candyglitz', 'Moonvibe', 'Hyperfizz', 'Bloomdrift', 'Sparknova', 'Velvetbyte', 'Jellyglow',
  'Cosmicwhip', 'Glitchjoy', 'Neonfuzz', 'Tropicfluff', 'Auroraflash', 'Sugarbyte', 'Blitzgloss',
  'Quirkpop', 'Lumenfluff', 'Starbloom', 'Glowhype', 'Pixelrush', 'Riotfizz', 'Frostjoy',
  'Hologlitz', 'Vibraflare',
];

function randomPlaceholder() {
  return PLACEHOLDER_NAMES[Math.floor(Math.random() * PLACEHOLDER_NAMES.length)];
}

/**
 * Builds and returns a save-custom-colorway overlay element.
 * Append to document.body to show; it removes itself on close.
 *
 * @param {object} colorState  Current HSL state fields
 * @param {function} onSave    Called with (name, colorwayObject) when user saves
 */
export function buildSaveCustomModal(colorState, onSave) {
  const {
    mapHue, mapSat, mapLuminance,
    dataHue, dataSat, dataLuminance,
    labelHue, labelSat, labelLuminance,
  } = colorState;

  const placeholder = randomPlaceholder();

  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center';

  const modal = document.createElement('div');
  modal.className = 'bg-surface border border-border rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden flex flex-col';

  // ── Header ──────────────────────────────────────────────────────────────────

  const header = document.createElement('div');
  header.className = 'flex items-center justify-between px-4 py-3 border-b border-border';

  const title = document.createElement('h3');
  title.className = 'text-sm font-semibold text-text-primary';
  title.textContent = 'Save Custom Colorway';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'text-text-secondary hover:text-text-primary transition-colors cursor-pointer';
  closeBtn.innerHTML = SVG_X;
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.addEventListener('click', () => close());

  header.appendChild(title);
  header.appendChild(closeBtn);

  // ── Body ────────────────────────────────────────────────────────────────────

  const body = document.createElement('div');
  body.className = 'px-4 py-4 flex flex-col gap-4';

  // Color preview swatches
  const preview = document.createElement('div');
  preview.className = 'flex items-center gap-3';

  const swatches = document.createElement('div');
  swatches.className = 'flex gap-2';
  [
    { hue: labelHue, sat: labelSat, luminance: labelLuminance, title: 'Label' },
    { hue: dataHue,  sat: dataSat,  luminance: dataLuminance,  title: 'Data' },
    { hue: mapHue,   sat: mapSat,   luminance: mapLuminance,   title: 'Map' },
  ].forEach(({ hue, sat, luminance, title }) => {
    const dot = document.createElement('span');
    dot.className = 'w-9 h-9 rounded-lg border border-white/20 flex-shrink-0';
    dot.style.backgroundColor = swatchColor(hue, sat, luminance);
    dot.title = title;
    swatches.appendChild(dot);
  });

  const previewLabel = document.createElement('span');
  previewLabel.className = 'text-xs text-text-muted';
  previewLabel.textContent = 'Label \u00b7 Data \u00b7 Map';

  preview.appendChild(swatches);
  preview.appendChild(previewLabel);

  // Name input
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = placeholder;
  input.maxLength = 32;
  input.className = [
    'w-full bg-surface-variant border border-border rounded-lg',
    'px-3 py-2 text-sm text-text-primary',
    'placeholder:text-text-muted',
    'focus:outline-none focus:border-primary',
    'transition-colors',
  ].join(' ');

  body.appendChild(preview);
  body.appendChild(input);

  // ── Footer ──────────────────────────────────────────────────────────────────

  const footer = document.createElement('div');
  footer.className = 'flex items-center gap-2 px-4 py-3 border-t border-border';

  const hint = document.createElement('span');
  hint.className = 'text-xs text-text-muted flex-1';
  hint.textContent = '3\u201332 characters';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'px-3 py-1.5 text-xs font-medium bg-surface-variant border border-border rounded-lg hover:border-primary transition-colors cursor-pointer';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => close());

  const saveBtn = document.createElement('button');
  saveBtn.className = 'px-3 py-1.5 text-xs font-bold rounded-lg btn-gradient cursor-pointer transition-all duration-200';
  saveBtn.textContent = 'Save';

  function getSaveBtnClass(valid) {
    return [
      'px-3 py-1.5 text-xs font-bold rounded-lg',
      valid ? 'btn-gradient cursor-pointer' : 'bg-surface-variant text-text-muted cursor-not-allowed',
      'transition-all duration-200',
    ].join(' ');
  }

  function updateSaveState() {
    const len = input.value.trim().length;
    // Empty → valid (placeholder will be used); 1–2 chars → invalid; 3–32 → valid
    const valid = len === 0 || len >= 3;
    saveBtn.disabled = !valid;
    saveBtn.className = getSaveBtnClass(valid);
  }

  input.addEventListener('input', updateSaveState);
  updateSaveState(); // Initial state (empty = valid)

  saveBtn.addEventListener('click', () => {
    const rawValue = input.value.trim();
    const name = rawValue.length > 0 ? rawValue : placeholder;
    if (name.length < 3) return;
    const colorway = {
      name,
      group: CUSTOM_GROUP,
      map:   { hue: mapHue,   sat: mapSat,   luminance: mapLuminance },
      data:  { hue: dataHue,  sat: dataSat,  luminance: dataLuminance },
      label: { hue: labelHue, sat: labelSat, luminance: labelLuminance },
    };
    onSave(name, colorway);
    close();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !saveBtn.disabled) saveBtn.click();
  });

  footer.appendChild(hint);
  footer.appendChild(cancelBtn);
  footer.appendChild(saveBtn);

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  overlay.appendChild(modal);

  // ── Close logic ─────────────────────────────────────────────────────────────

  function close() {
    overlay.remove();
    document.removeEventListener('keydown', handleEscape);
  }

  function handleEscape(e) {
    if (e.key === 'Escape') close();
  }

  document.addEventListener('keydown', handleEscape);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // Focus input after mount
  requestAnimationFrame(() => input.focus());

  return overlay;
}
