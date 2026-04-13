import { bgCardClass } from './controls-utils.js';

// Inline SVGs for background card icons — avoids needing a second createIcons pass on dynamic updates
const SVG_MOON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
const SVG_SUN  = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
const SVG_AUTO = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18Z" fill="currentColor" stroke="none"/></svg>`;
const SVG_IMG  = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`;
const SVG_X    = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
const SVG_SHADOW = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5a6 6 0 0 0-6 6v6h12v-6a6 6 0 0 0-6-6Z"/><path d="M6 17v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1" opacity="0.5"/><path d="M8 20v2" opacity="0.3"/><path d="M12 20v2" opacity="0.3"/><path d="M16 20v2" opacity="0.3"/></svg>`;

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

export function buildActionsPanel(onRandom, onSwap, onReset, { onBackgroundChange, initialBackground = 'auto', initialCustomImage = null, onDropShadowChange, initialDropShadow = false } = {}) {
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

  // ── Effects sub-section ─────────────────────────────────────────────────────

  let localDropShadow = initialDropShadow;

  const effectsSeparator = document.createElement('div');
  effectsSeparator.className = 'border-t border-border mx-4';

  const effectsHeading = document.createElement('p');
  effectsHeading.className = 'px-4 pt-3 pb-1 text-xs font-semibold tracking-wide uppercase text-text-secondary';
  effectsHeading.textContent = 'Experimental';

  const effectsGrid = document.createElement('div');
  effectsGrid.className = 'grid grid-cols-4 gap-2 px-4 pb-4';

  // Drop shadow toggle
  const dropShadowCard = document.createElement('button');
  dropShadowCard.setAttribute('aria-label', 'Toggle drop shadow effect');
  dropShadowCard.addEventListener('click', () => {
    localDropShadow = !localDropShadow;
    updateDropShadowCard();
    onDropShadowChange?.(localDropShadow);
  });
  function updateDropShadowCard() {
    dropShadowCard.className = bgCardClass(localDropShadow);
    dropShadowCard.setAttribute('aria-pressed', localDropShadow ? 'true' : 'false');
    dropShadowCard.innerHTML = `${SVG_SHADOW}<span>Drop Shadow</span>`;
  }
  effectsGrid.appendChild(dropShadowCard);

  panel.appendChild(effectsSeparator);
  panel.appendChild(effectsHeading);
  panel.appendChild(effectsGrid);

  // Set initial state for effects
  updateDropShadowCard();

  return panel;
}
