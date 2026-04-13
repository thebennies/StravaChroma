import {
  colorwayFingerprint,
  getSavedFavorites,
  getSavedGroupSelection,
  getSavedSearchTerm,
  saveFavorites,
  saveGroupSelection,
  saveSearchTerm,
  ALL_GROUPS,
  MANDATORY_GROUP,
  navBtnClass,
  colorwayItemClass,
  swatchColor,
} from './controls-utils.js';

// Inline SVGs used within colorway UI
const SVG_HEART_OUTLINE = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2c-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
const SVG_HEART_FILLED  = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2c-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
const SVG_TRASH = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`;

export function buildColorwaysPanel(colorwayPresets, onColorway, { mobile = false, onSwap, signal } = {}) {
  const panel = document.createElement('div');
  panel.className = 'flex flex-col';
  if (mobile) {
    panel.style.overflow = 'hidden';
  }

  let selectedGroups = getSavedGroupSelection();
  let favorites = getSavedFavorites();

  // Filter colorways based on selected groups
  function getFilteredColorways() {
    return colorwayPresets
      .filter(cw => selectedGroups.includes(cw.group))
      .sort((a, b) => {
        const aIsMono = a.group === MANDATORY_GROUP;
        const bIsMono = b.group === MANDATORY_GROUP;
        if (aIsMono === bIsMono) return 0;
        return aIsMono ? 1 : -1;
      });
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

  const favBtn = document.createElement('button');
  favBtn.className = navBtnClass();
  favBtn.setAttribute('aria-label', 'View favorites');
  favBtn.innerHTML = SVG_HEART_OUTLINE;

  const searchBtn = document.createElement('button');
  searchBtn.className = navBtnClass();
  searchBtn.setAttribute('aria-label', 'Search colorways');
  searchBtn.innerHTML = `<i data-lucide="search" class="w-4 h-4 flex-shrink-0"></i>`;

  navBtns.appendChild(groupBtn);
  navBtns.appendChild(favBtn);
  navBtns.appendChild(searchBtn);
  navBtns.appendChild(cycleBtn);
  navBtns.appendChild(shuffleBtn);

  navBar.appendChild(prevBtn);
  navBar.appendChild(navBtns);
  navBar.appendChild(nextBtn);

  function updateFavBtnIcon() {
    favBtn.innerHTML = favorites.length > 0 ? SVG_HEART_FILLED : SVG_HEART_OUTLINE;
    favBtn.setAttribute('aria-label', favorites.length > 0 ? `View favorites (${favorites.length})` : 'View favorites');
  }
  updateFavBtnIcon();

  function heartBtnClass(isFav) {
    return [
      'w-7 h-7 flex items-center justify-center rounded flex-shrink-0',
      'transition-colors duration-150',
      isFav ? 'text-error hover:text-error/70' : 'text-text-muted hover:text-text-primary',
    ].join(' ');
  }

  function buildFavoritedHeartBtn(colorway, fp, onUnfavorite) {
    const heartBtn = document.createElement('button');
    heartBtn.dataset.heart = '1';
    heartBtn.className = heartBtnClass(true);
    heartBtn.setAttribute('aria-label', `Remove ${colorway.name} from favorites`);
    heartBtn.innerHTML = SVG_HEART_FILLED;
    heartBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      favorites = favorites.filter(f => f.fingerprint !== fp);
      saveFavorites(favorites);
      heartBtn.remove();
      updateFavBtnIcon();
      onUnfavorite?.();
      if (favModalOverlay.style.display !== 'none') renderFavoritesModal();
    });
    return heartBtn;
  }

  function attachHeartToRow(rowEl, colorway) {
    detachHeartFromRow(rowEl);
    const fp = colorwayFingerprint(colorway);
    const isFav = favorites.some(f => f.fingerprint === fp);

    const heartBtn = document.createElement('button');
    heartBtn.dataset.heart = '1';
    heartBtn.className = heartBtnClass(isFav);
    heartBtn.setAttribute('aria-label', isFav ? `Remove ${colorway.name} from favorites` : `Add ${colorway.name} to favorites`);
    heartBtn.innerHTML = isFav ? SVG_HEART_FILLED : SVG_HEART_OUTLINE;

    heartBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (favorites.some(f => f.fingerprint === fp)) {
        favorites = favorites.filter(f => f.fingerprint !== fp);
      } else {
        favorites = [...favorites, { fingerprint: fp, name: colorway.name }];
      }
      saveFavorites(favorites);
      const nowFav = favorites.some(f => f.fingerprint === fp);
      heartBtn.className = heartBtnClass(nowFav);
      heartBtn.setAttribute('aria-label', nowFav ? `Remove ${colorway.name} from favorites` : `Add ${colorway.name} to favorites`);
      heartBtn.innerHTML = nowFav ? SVG_HEART_FILLED : SVG_HEART_OUTLINE;
      updateFavBtnIcon();
      if (favModalOverlay.style.display !== 'none') renderFavoritesModal();
    });

    rowEl.insertBefore(heartBtn, rowEl.lastChild);
  }

  function detachHeartFromRow(rowEl) {
    const existing = rowEl.querySelector('[data-heart]');
    if (existing) existing.remove();
  }

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
    list.innerHTML = '';
    items.length = 0;
    currentGroup = null;
    const favSet = new Set(favorites.map(f => f.fingerprint));

    filteredColorways.forEach((colorway) => {
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
      nameEl.className = 'text-sm font-medium flex-1 truncate';
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

      const fp = colorwayFingerprint(colorway);
      if (favSet.has(fp)) {
        item.insertBefore(buildFavoritedHeartBtn(colorway, fp), item.lastChild);
      }
    });

    // Restore active state if still visible
    if (activeIdx >= 0) {
      const matching = items.find(i => i.originalIdx === activeIdx);
      if (matching) {
        activeEl = matching.el;
        activeEl.className = colorwayItemClass(true);
        attachHeartToRow(activeEl, colorwayPresets[activeIdx]);
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
  modalContent.className = 'bg-surface border border-border rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden flex flex-col max-h-[60vh]';

  // Modal header
  const modalHeader = document.createElement('div');
  modalHeader.className = 'flex items-center justify-between px-4 py-3 border-b border-border';

  const modalTitle = document.createElement('h3');
  modalTitle.className = 'flex items-center gap-2 text-sm font-semibold text-text-primary';
  modalTitle.innerHTML = `<i data-lucide="layers" class="w-4 h-4 flex-shrink-0"></i><span>Colorway Groups</span>`;

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
  modalActions.className = 'flex gap-2 px-4 py-2';

  const selectAllBtn = document.createElement('button');
  selectAllBtn.className = 'flex-1 px-3 py-1.5 text-xs font-medium bg-surface-variant border border-border rounded-lg hover:border-primary transition-colors';
  selectAllBtn.textContent = 'All';

  const deselectAllBtn = document.createElement('button');
  deselectAllBtn.className = 'flex-1 px-3 py-1.5 text-xs font-medium bg-surface-variant border border-border rounded-lg hover:border-primary transition-colors';
  deselectAllBtn.textContent = 'Minimal';

  modalActions.appendChild(selectAllBtn);
  modalActions.appendChild(deselectAllBtn);

  // Group list
  const groupList = document.createElement('div');
  groupList.className = 'flex-1 min-h-0 overflow-y-auto px-2 py-2';

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

  // Favorites modal
  const favModalOverlay = document.createElement('div');
  favModalOverlay.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center';
  favModalOverlay.style.display = 'none';

  const favModalContent = document.createElement('div');
  favModalContent.className = 'bg-surface border border-border rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden flex flex-col max-h-[70vh]';

  const favModalHeader = document.createElement('div');
  favModalHeader.className = 'flex items-center justify-between px-4 py-3 border-b border-border';

  const favModalTitle = document.createElement('h3');
  favModalTitle.className = 'flex items-center gap-2 text-sm font-semibold text-text-primary';
  favModalTitle.innerHTML = `${SVG_HEART_FILLED}<span>Favorites</span>`;

  const favCloseBtn = document.createElement('button');
  favCloseBtn.className = 'text-text-secondary hover:text-text-primary transition-colors';
  favCloseBtn.innerHTML = `<i data-lucide="x" class="w-5 h-5"></i>`;
  favCloseBtn.setAttribute('aria-label', 'Close favorites modal');
  favCloseBtn.addEventListener('click', () => {
    favModalOverlay.style.display = 'none';
  });

  favModalHeader.appendChild(favModalTitle);
  favModalHeader.appendChild(favCloseBtn);

  const favResultsContainer = document.createElement('div');
  favResultsContainer.className = 'flex-1 min-h-0 overflow-y-auto px-2 py-2 flex flex-col gap-2';

  const favModalFooter = document.createElement('div');
  favModalFooter.className = 'border-t border-border px-4 py-3';
  favModalFooter.style.display = 'none';

  const favClearAllBtn = document.createElement('button');
  favClearAllBtn.className = [
    'flex items-center gap-2 w-full px-3 py-2.5 rounded-lg',
    'text-sm text-error hover:bg-error/10 transition-colors duration-150',
  ].join(' ');
  favClearAllBtn.innerHTML = `${SVG_TRASH}<span>Clear all favorites</span>`;
  favClearAllBtn.setAttribute('aria-label', 'Clear all favorites');
  favClearAllBtn.addEventListener('click', () => {
    if (!confirm('Clear all favorites?')) return;
    favorites = [];
    saveFavorites(favorites);
    updateFavBtnIcon();
    if (activeEl && activeIdx >= 0) attachHeartToRow(activeEl, colorwayPresets[activeIdx]);
    renderFavoritesModal();
  });

  favModalFooter.appendChild(favClearAllBtn);

  favModalContent.appendChild(favModalHeader);
  favModalContent.appendChild(favResultsContainer);
  favModalContent.appendChild(favModalFooter);
  favModalOverlay.appendChild(favModalContent);
  panel.appendChild(favModalOverlay);

  function renderFavoritesModal() {
    favResultsContainer.innerHTML = '';
    favModalFooter.style.display = favorites.length > 0 ? '' : 'none';

    if (favorites.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'px-2 py-8 text-center text-text-muted text-sm';
      empty.textContent = 'No favorites yet. Select a colorway and tap the heart to save it.';
      favResultsContainer.appendChild(empty);
      return;
    }

    const resolved = favorites.map(fav => ({
      fav,
      colorway: colorwayPresets.find(cw => colorwayFingerprint(cw) === fav.fingerprint) ?? null,
    }));

    // Group resolved colorways by group, unavailable ones at the end
    const available = resolved.filter(r => r.colorway !== null);
    const unavailable = resolved.filter(r => r.colorway === null);

    let currentFavGroup = null;

    available.forEach(({ fav, colorway }) => {
      const originalIdx = colorwayPresets.indexOf(colorway);

      if (colorway.group !== currentFavGroup) {
        const groupHeader = document.createElement('p');
        groupHeader.className = 'mt-1 text-xs font-semibold tracking-wide uppercase text-text-secondary px-1';
        groupHeader.textContent = colorway.group;
        favResultsContainer.appendChild(groupHeader);
        currentFavGroup = colorway.group;
      }

      const item = document.createElement('button');
      item.className = colorwayItemClass(false);
      item.setAttribute('aria-label', `Apply ${colorway.name} colorway`);

      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'flex flex-col items-start flex-1 min-w-0';

      const nameEl = document.createElement('span');
      nameEl.className = 'text-sm font-medium truncate';
      nameEl.textContent = colorway.name;
      contentWrapper.appendChild(nameEl);

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

      const heartBtn = document.createElement('button');
      heartBtn.className = 'w-7 h-7 flex items-center justify-center rounded flex-shrink-0 text-error hover:text-error/70 transition-colors duration-150';
      heartBtn.setAttribute('aria-label', `Remove ${colorway.name} from favorites`);
      heartBtn.innerHTML = SVG_HEART_FILLED;
      heartBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent row click from firing
        favorites = favorites.filter(f => f.fingerprint !== fav.fingerprint);
        saveFavorites(favorites);
        updateFavBtnIcon();
        // If this was the active colorway, update its heart in the main list too
        if (activeEl && activeIdx === originalIdx) {
          attachHeartToRow(activeEl, colorway);
        }
        renderFavoritesModal();
      });

      item.appendChild(contentWrapper);
      item.appendChild(heartBtn);
      item.appendChild(swatches);
      item.addEventListener('click', () => {
        onColorway(originalIdx);
        favModalOverlay.style.display = 'none';
      });

      favResultsContainer.appendChild(item);
    });

    // Show unavailable (removed colorways) at the bottom
    if (unavailable.length > 0) {
      const unavailableHeader = document.createElement('p');
      unavailableHeader.className = 'mt-2 text-xs font-semibold tracking-wide uppercase text-text-muted px-1';
      unavailableHeader.textContent = 'No longer available';
      favResultsContainer.appendChild(unavailableHeader);

      unavailable.forEach(({ fav }) => {
        const row = document.createElement('div');
        row.className = 'flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border border-border bg-surface opacity-50';

        const nameEl = document.createElement('span');
        nameEl.className = 'text-sm font-medium flex-1 truncate text-text-muted';
        nameEl.textContent = fav.name;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'w-7 h-7 flex items-center justify-center rounded flex-shrink-0 text-text-muted hover:text-text-primary transition-colors duration-150';
        removeBtn.setAttribute('aria-label', `Remove ${fav.name} from favorites`);
        removeBtn.innerHTML = SVG_HEART_FILLED;
        removeBtn.addEventListener('click', () => {
          favorites = favorites.filter(f => f.fingerprint !== fav.fingerprint);
          saveFavorites(favorites);
          updateFavBtnIcon();
          renderFavoritesModal();
        });

        row.appendChild(nameEl);
        row.appendChild(removeBtn);
        favResultsContainer.appendChild(row);
      });
    }
  }

  // Open favorites modal
  favBtn.addEventListener('click', () => {
    renderFavoritesModal();
    favModalOverlay.style.display = 'flex';
  });

  // Close favorites modal on overlay click
  favModalOverlay.addEventListener('click', (e) => {
    if (e.target === favModalOverlay) {
      favModalOverlay.style.display = 'none';
    }
  });

  // Close favorites modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && favModalOverlay.style.display !== 'none') {
      favModalOverlay.style.display = 'none';
    }
  }, signal ? { signal } : undefined);

  // Search modal
  const searchModalOverlay = document.createElement('div');
  searchModalOverlay.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center';
  searchModalOverlay.style.display = 'none';

  const searchModalContent = document.createElement('div');
  searchModalContent.className = 'bg-surface border border-border rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden flex flex-col max-h-[70vh]';

  // Search modal header
  const searchModalHeader = document.createElement('div');
  searchModalHeader.className = 'flex items-center justify-between px-4 py-3 border-b border-border';

  const searchModalTitle = document.createElement('h3');
  searchModalTitle.className = 'flex items-center gap-2 text-sm font-semibold text-text-primary';
  searchModalTitle.innerHTML = `<i data-lucide="search" class="w-4 h-4 flex-shrink-0"></i><span>Search Colorways</span>`;

  const searchCloseBtn = document.createElement('button');
  searchCloseBtn.className = 'text-text-secondary hover:text-text-primary transition-colors';
  searchCloseBtn.innerHTML = `<i data-lucide="x" class="w-5 h-5"></i>`;
  searchCloseBtn.setAttribute('aria-label', 'Close search modal');
  searchCloseBtn.addEventListener('click', () => {
    searchModalOverlay.style.display = 'none';
  });

  searchModalHeader.appendChild(searchModalTitle);
  searchModalHeader.appendChild(searchCloseBtn);

  // Search input container
  const searchInputContainer = document.createElement('div');
  searchInputContainer.className = 'px-4 py-3 border-b border-border';

  const searchInputWrapper = document.createElement('div');
  searchInputWrapper.className = 'relative';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search colorway name...';
  searchInput.className = [
    'w-full bg-surface-variant border border-border rounded-lg',
    'px-3 py-2 pr-10 text-sm text-text-primary',
    'placeholder:text-text-muted',
    'focus:outline-none focus:border-primary',
  ].join(' ');

  // Clear button
  const clearSearchBtn = document.createElement('button');
  clearSearchBtn.className = [
    'absolute right-2 top-1/2 -translate-y-1/2',
    'text-text-muted hover:text-text-primary',
    'transition-colors',
  ].join(' ');
  clearSearchBtn.innerHTML = `<i data-lucide="x" class="w-4 h-4"></i>`;
  clearSearchBtn.setAttribute('aria-label', 'Clear search');
  clearSearchBtn.style.display = 'none';

  searchInputWrapper.appendChild(searchInput);
  searchInputWrapper.appendChild(clearSearchBtn);
  searchInputContainer.appendChild(searchInputWrapper);

  // Search results container
  const searchResultsContainer = document.createElement('div');
  searchResultsContainer.className = 'flex-1 min-h-0 overflow-y-auto px-2 py-2 flex flex-col gap-2';

  searchModalContent.appendChild(searchModalHeader);
  searchModalContent.appendChild(searchInputContainer);
  searchModalContent.appendChild(searchResultsContainer);
  searchModalOverlay.appendChild(searchModalContent);
  panel.appendChild(searchModalOverlay);

  // Search functionality
  function performSearch(query) {
    const normalizedQuery = query.toLowerCase().trim();

    if (!normalizedQuery) {
      searchResultsContainer.innerHTML = '';
      return;
    }

    const results = colorwayPresets.filter(cw =>
      cw.name.toLowerCase().includes(normalizedQuery)
    );

    renderSearchResults(results);
  }

  function renderSearchResults(results) {
    searchResultsContainer.innerHTML = '';
    const favSet = new Set(favorites.map(f => f.fingerprint));

    if (results.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'px-2 py-4 text-center text-text-muted text-sm';
      noResults.textContent = 'No colorways found';
      searchResultsContainer.appendChild(noResults);
      return;
    }

    results.forEach((colorway) => {
      const originalIdx = colorwayPresets.indexOf(colorway);

      const item = document.createElement('button');
      item.className = colorwayItemClass(false);
      item.setAttribute('aria-label', `Apply ${colorway.name} colorway`);

      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'flex flex-col items-start flex-1 min-w-0';

      const groupEl = document.createElement('span');
      groupEl.className = 'text-xs text-text-muted mb-0.5';
      groupEl.textContent = colorway.group;

      const nameEl = document.createElement('span');
      nameEl.className = 'text-sm font-medium truncate';
      nameEl.textContent = colorway.name;

      contentWrapper.appendChild(groupEl);
      contentWrapper.appendChild(nameEl);

      const swatches = document.createElement('div');
      swatches.className = 'flex gap-1 flex-shrink-0 ml-2';
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

      const fp = colorwayFingerprint(colorway);
      item.appendChild(contentWrapper);
      if (favSet.has(fp)) {
        item.appendChild(buildFavoritedHeartBtn(colorway, fp, () => {
          if (activeEl && activeIdx === originalIdx) attachHeartToRow(activeEl, colorway);
        }));
      }
      item.appendChild(swatches);

      item.addEventListener('click', () => {
        onColorway(originalIdx);
        searchModalOverlay.style.display = 'none';
      });

      searchResultsContainer.appendChild(item);
    });
  }

  // Search input handlers
  searchInput.addEventListener('input', () => {
    const value = searchInput.value;
    clearSearchBtn.style.display = value ? 'block' : 'none';
    saveSearchTerm(value);
    performSearch(value);
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    saveSearchTerm('');
    performSearch('');
    searchInput.focus();
  });

  // Open search modal on search button click
  searchBtn.addEventListener('click', () => {
    const savedTerm = getSavedSearchTerm();
    searchInput.value = savedTerm;
    clearSearchBtn.style.display = savedTerm ? 'block' : 'none';
    searchModalOverlay.style.display = 'flex';
    searchInput.focus();
    performSearch(savedTerm);
  });

  // Close search modal on overlay click
  searchModalOverlay.addEventListener('click', (e) => {
    if (e.target === searchModalOverlay) {
      searchModalOverlay.style.display = 'none';
    }
  });

  // Close search modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && searchModalOverlay.style.display !== 'none') {
      searchModalOverlay.style.display = 'none';
    }
  }, signal ? { signal } : undefined);

  function setActive(idx) {
    if (activeEl) {
      const oldColorway = colorwayPresets[activeIdx];
      const wasAlreadyFav = oldColorway && favorites.some(f => f.fingerprint === colorwayFingerprint(oldColorway));
      if (!wasAlreadyFav) detachHeartFromRow(activeEl);
      activeEl.className = colorwayItemClass(false);
    }
    activeIdx = idx;
    const matching = items.find(i => i.originalIdx === idx);
    activeEl = matching?.el ?? null;
    if (activeEl) {
      activeEl.className = colorwayItemClass(true);
      attachHeartToRow(activeEl, colorwayPresets[idx]);
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }

  return { el: panel, setActive };
}
