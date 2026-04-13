import { X, Search } from 'lucide';
import { COLORWAYS } from '../constants.js';
import {
  colorwayFingerprint,
  getSavedFavorites,
  saveFavorites,
  saveSearchTerm,
  loadSearchTerm,
  getSavedGroupSelection,
  saveGroupSelection,
  colorwayItemClass,
  swatchColor,
  ALL_GROUPS,
  MANDATORY_GROUP,
} from './controls-utils.js';

/**
 * Build the colorways panel with search, groups, and grid
 * @param {Array} colorwayPresets - Array of colorway objects
 * @param {Function} onColorway - Colorway selection handler
 * @param {Object} options - Configuration options
 * @returns {HTMLElement} Colorways panel container
 */
export function buildColorwaysPanel(colorwayPresets, onColorway, { mobile = false, onSwap, signal } = {}) {
  const container = document.createElement('div');
  container.className = mobile ? 'space-y-3' : 'space-y-4';

  // Search
  const searchContainer = document.createElement('div');
  searchContainer.className = 'relative';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search colorways...';
  searchInput.className = 'w-full px-3 py-2 pl-9 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary';
  searchInput.value = loadSearchTerm() || '';

  const searchIcon = document.createElement('span');
  searchIcon.className = 'absolute left-3 top-1/2 -translate-y-1/2 text-text-muted';
  searchIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>';

  searchContainer.appendChild(searchIcon);
  searchContainer.appendChild(searchInput);
  container.appendChild(searchContainer);

  // Group filter
  const selectedGroups = getSavedGroupSelection(ALL_GROUPS, MANDATORY_GROUP);
  let currentSearchTerm = loadSearchTerm() || '';

  const groupContainer = document.createElement('div');
  groupContainer.className = 'flex flex-wrap gap-1';

  ALL_GROUPS.forEach(group => {
    const isSelected = selectedGroups.includes(group);
    const btn = document.createElement('button');
    btn.className = [
      'px-2 py-1 text-xs rounded-md transition-colors',
      isSelected
        ? 'bg-primary text-white'
        : 'bg-surface-variant text-text-secondary hover:bg-border'
    ].join(' ');
    btn.textContent = group;
    btn.addEventListener('click', () => {
      const idx = selectedGroups.indexOf(group);
      if (idx === -1) {
        selectedGroups.push(group);
      } else if (group !== MANDATORY_GROUP) {
        selectedGroups.splice(idx, 1);
      }
      saveGroupSelection(selectedGroups);
      updateGrid();
    }, { signal });

    groupContainer.appendChild(btn);
  });

  container.appendChild(groupContainer);

  // Favorites toggle
  const favorites = getSavedFavorites();
  let showFavoritesOnly = false;

  const favBtn = document.createElement('button');
  favBtn.className = 'text-xs text-text-secondary hover:text-primary transition-colors flex items-center gap-1';
  favBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> Show Favorites`;
  favBtn.addEventListener('click', () => {
    showFavoritesOnly = !showFavoritesOnly;
    favBtn.classList.toggle('text-primary', showFavoritesOnly);
    updateGrid();
  }, { signal });
  container.appendChild(favBtn);

  // Colorway grid
  const grid = document.createElement('div');
  grid.className = mobile ? 'grid grid-cols-8 gap-1' : 'grid grid-cols-10 gap-1';
  container.appendChild(grid);

  // Update grid function
  function updateGrid() {
    grid.innerHTML = '';

    const filtered = colorwayPresets.filter((cw, idx) => {
      // Filter by search term
      if (currentSearchTerm) {
        const searchLower = currentSearchTerm.toLowerCase();
        const matchesSearch = cw.name.toLowerCase().includes(searchLower) ||
                              cw.group.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Filter by group
      if (!selectedGroups.includes(cw.group)) return false;

      // Filter by favorites
      if (showFavoritesOnly && !favorites.includes(idx)) return false;

      return true;
    });

    filtered.forEach((cw, filteredIdx) => {
      const originalIdx = colorwayPresets.indexOf(cw);
      const isFav = favorites.includes(originalIdx);

      const item = document.createElement('div');
      item.className = 'relative group';

      const swatch = document.createElement('div');
      swatch.className = colorwayItemClass(false);
      swatch.style.background = `linear-gradient(135deg, ${swatchColor(cw.map.hue, cw.map.sat, cw.map.luminance)} 33%, ${swatchColor(cw.data.hue, cw.data.sat, cw.data.luminance)} 33% 66%, ${swatchColor(cw.label.hue, cw.label.sat, cw.label.luminance)} 66%)`;
      swatch.title = `${cw.name} (${cw.group})`;
      swatch.addEventListener('click', () => onColorway(originalIdx), { signal });

      // Favorite button
      const favToggle = document.createElement('button');
      favToggle.className = 'absolute -top-1 -right-1 w-4 h-4 rounded-full bg-surface border border-border opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center';
      favToggle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
      favToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const favIdx = favorites.indexOf(originalIdx);
        if (favIdx === -1) {
          favorites.push(originalIdx);
        } else {
          favorites.splice(favIdx, 1);
        }
        saveFavorites(favorites);
        favToggle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="${favIdx === -1 ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
      }, { signal });

      item.appendChild(swatch);
      item.appendChild(favToggle);
      grid.appendChild(item);
    });
  }

  // Search input handler
  searchInput.addEventListener('input', (e) => {
    currentSearchTerm = e.target.value;
    saveSearchTerm(currentSearchTerm);
    updateGrid();
  }, { signal });

  updateGrid();

  return container;
}
