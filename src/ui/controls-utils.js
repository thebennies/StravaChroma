import { COLORWAYS } from '../constants.js';

export const GROUP_SELECTION_KEY = 'stravachroma-selected-groups';
export const SEARCH_TERM_KEY = 'stravachroma-colorway-search-term';
export const FAVORITES_KEY = 'stravachroma-favorites';

export function getSavedSearchTerm() {
  try {
    return localStorage.getItem(SEARCH_TERM_KEY) || '';
  } catch {
    return '';
  }
}

export function saveSearchTerm(term) {
  try {
    if (term) {
      localStorage.setItem(SEARCH_TERM_KEY, term);
    } else {
      localStorage.removeItem(SEARCH_TERM_KEY);
    }
  } catch {
    // Ignore localStorage errors
  }
}

export function colorwayFingerprint(cw) {
  const { map, data, label } = cw;
  return `${map.hue},${map.sat},${map.luminance}|${data.hue},${data.sat},${data.luminance}|${label.hue},${label.sat},${label.luminance}`;
}

export function getSavedFavorites() {
  try {
    const saved = localStorage.getItem(FAVORITES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    }
  } catch {
    // Ignore localStorage errors
  }
  return [];
}

export function saveFavorites(favorites) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch {
    // Ignore localStorage errors
  }
}

// Extract unique groups and sort with Mono at the end
const UNIQUE_GROUPS = [...new Set(COLORWAYS.map(cw => cw.group))];
export const MANDATORY_GROUP = 'Mono';
export const ALL_GROUPS = [
  ...UNIQUE_GROUPS.filter(g => g !== MANDATORY_GROUP),
  MANDATORY_GROUP
];

export function getSavedGroupSelection() {
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
  // Default: show only running/shoe groups + Mono
  return ['Kopi', 'ADIZERO', 'Asics *Blast', 'Hoka Clifton', 'Running', MANDATORY_GROUP];
}

export function saveGroupSelection(selectedGroups) {
  try {
    localStorage.setItem(GROUP_SELECTION_KEY, JSON.stringify(selectedGroups));
  } catch {
    // Ignore localStorage errors
  }
}

export function bgCardClass(active) {
  return [
    'flex flex-col items-center justify-center gap-1.5',
    'aspect-square w-full rounded-xl border',
    'text-xs font-medium cursor-pointer transition-colors duration-150',
    active
      ? 'bg-surface-variant border-primary text-text-primary'
      : 'bg-surface-variant border-border text-text-primary hover:bg-border hover:border-primary/50',
  ].join(' ');
}

export function tabBtnInactiveClass() {
  return [
    'px-2 py-3 text-xs font-medium',
    'text-text-secondary border-b-2 border-transparent -mb-px',
    'hover:text-text-primary transition-colors duration-150 cursor-pointer',
  ].join(' ');
}

export function tabBtnActiveClass() {
  return [
    'px-2 py-3 text-xs font-semibold',
    'text-text-primary border-b-2 -mb-px',
    'transition-colors duration-150 cursor-pointer',
  ].join(' ');
}

export function saveBtnClass(disabled) {
  return [
    'ml-auto mr-3 px-3 py-1.5',
    disabled
      ? 'bg-surface-variant text-text-muted cursor-not-allowed'
      : 'btn-gradient cursor-pointer',
    'text-xs font-bold rounded-lg',
    'transition-all duration-200',
  ].join(' ');
}

export function exportBtnClass(disabled) {
  return [
    'w-full py-3.5 px-6',
    disabled
      ? 'bg-surface-variant text-text-muted cursor-not-allowed'
      : 'btn-gradient cursor-pointer',
    'text-sm font-bold tracking-wide',
    'transition-all duration-200',
  ].join(' ');
}

export const SVG_X = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;

export function navBtnClass() {
  return [
    'bg-surface-variant border border-border',
    'text-text-secondary hover:text-text-primary hover:border-primary hover:bg-surface-variant',
    'w-9 h-9 flex items-center justify-center',
    'text-lg rounded-lg cursor-pointer transition-colors duration-150',
    'flex-shrink-0',
  ].join(' ');
}

export function colorwayItemClass(active) {
  return [
    'flex items-center gap-2 w-full px-3 py-2.5',
    'rounded-lg border cursor-pointer text-left',
    'transition-colors duration-150',
    active
      ? 'border-primary bg-surface-variant text-text-primary'
      : 'border-border bg-surface hover:bg-surface-variant hover:border-primary/50 text-text-primary',
  ].join(' ');
}

export function swatchColor(hue, sat, luminance) {
  return `hsl(${hue}, ${Math.round(sat * 100)}%, ${Math.round(luminance * 100)}%)`;
}
