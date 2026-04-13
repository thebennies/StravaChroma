import { PRESETS, DEFAULT_DATA_PRESET, DEFAULT_LABEL_PRESET, COLORWAYS } from '../constants.js';

// LocalStorage keys
export const GROUP_SELECTION_KEY = 'stravachroma-selected-groups';
export const SEARCH_TERM_KEY = 'stravachroma-colorway-search-term';
export const FAVORITES_KEY = 'stravachroma-favorites';

// Extract unique groups and sort with Mono at the end
const UNIQUE_GROUPS = [...new Set(COLORWAYS.map(cw => cw.group))];
export const MANDATORY_GROUP = 'Mono';
export const ALL_GROUPS = [
  ...UNIQUE_GROUPS.filter(g => g !== MANDATORY_GROUP),
  MANDATORY_GROUP
];

/**
 * Generate a unique fingerprint for a colorway based on its HSL values
 * @param {Object} cw - Colorway object
 * @returns {string} Fingerprint string
 */
export function colorwayFingerprint(cw) {
  const { map, data, label } = cw;
  return `${map.hue},${map.sat},${map.luminance}|${data.hue},${data.sat},${data.luminance}|${label.hue},${label.sat},${label.luminance}`;
}

/**
 * Get saved favorites from localStorage
 * @returns {Array} Array of favorite indices
 */
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

/**
 * Save favorites to localStorage
 * @param {Array} favorites - Array of favorite indices
 */
export function saveFavorites(favorites) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Save search term to localStorage
 * @param {string} term - Search term
 */
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

/**
 * Load search term from localStorage
 * @returns {string|null} Saved search term
 */
export function loadSearchTerm() {
  try {
    return localStorage.getItem(SEARCH_TERM_KEY);
  } catch {
    return null;
  }
}

/**
 * Get saved group selection from localStorage
 * @param {Array} allGroups - All available groups
 * @param {string} mandatoryGroup - Group that must always be included
 * @returns {Array} Selected groups
 */
export function getSavedGroupSelection(allGroups, mandatoryGroup) {
  try {
    const saved = localStorage.getItem(GROUP_SELECTION_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Guard against non-array JSON
      if (!Array.isArray(parsed)) return [...allGroups];
      // Always ensure mandatory group is included
      if (!parsed.includes(mandatoryGroup)) {
        parsed.unshift(mandatoryGroup);
      }
      return parsed;
    }
  } catch {
    // Ignore localStorage errors
  }
  // Default: all groups selected
  return [...allGroups];
}

/**
 * Save group selection to localStorage
 * @param {Array} selectedGroups - Array of selected group names
 */
export function saveGroupSelection(selectedGroups) {
  try {
    localStorage.setItem(GROUP_SELECTION_KEY, JSON.stringify(selectedGroups));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * CSS class for active colorway swatch
 * @param {boolean} active - Whether the swatch is active
 * @returns {string} CSS class string
 */
export function colorwayItemClass(active) {
  return [
    'w-8 h-8 rounded-md cursor-pointer transition-all duration-150',
    'border-2 hover:scale-110',
    active
      ? 'border-primary shadow-lg shadow-primary/30 scale-110'
      : 'border-transparent hover:border-border',
  ].join(' ');
}

/**
 * Calculate swatch background color from HSL
 * @param {number} hue - Hue (0-360)
 * @param {number} sat - Saturation (0-100)
 * @param {number} luminance - Luminance (0-100)
 * @returns {string} CSS hsl() string
 */
export function swatchColor(hue, sat, luminance) {
  return `hsl(${hue}, ${sat * 100}%, ${luminance * 100}%)`;
}
