import { createIcons, Shuffle, ListRestart, RotateCw, Layers, X, Search } from 'lucide';
import { COLORWAYS } from '../constants.js';
import { saveBtnClass, tabBtnInactiveClass, tabBtnActiveClass } from './controls-utils.js';
import { buildActionsPanel } from './actions-panel.js';
import { buildColorwaysPanel } from './colorway-ui.js';

export function buildMobileTabs(container, { mapSection, dataSection, labelSection, onRandom, onReset, onSwap, onExport, onColorway, onBackgroundChange, initialBackground, initialCustomImage, onDropShadowChange, initialDropShadow, onGradientChange, initialGradient, onLogoChange, initialLogo, signal }) {
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
  const actionsPanel = buildActionsPanel(onRandom, onSwap, onReset, { onBackgroundChange, initialBackground, initialCustomImage, onDropShadowChange, initialDropShadow, onGradientChange, initialGradient, onLogoChange, initialLogo });
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
    { id: 'colorways', label: 'Colorways', panel: colorwaysPanel },
    { id: 'manual',    label: 'Manual',    panel: manualPanel },
    { id: 'tools',     label: 'Tools',     panel: actionsPanel },
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

  let activeTabId = 'tools';

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
  activateTab('colorways');

  createIcons({ icons: { Shuffle, ListRestart, RotateCw, Layers, X, Search } });

  function setEnabled(enabled) {
    container.style.display = enabled ? 'flex' : 'none';
  }

  function setRandomEnabled(enabled) {
    // Only override the panel display when 'actions' is the active tab —
    // otherwise the tab system's own display setting stays in charge.
    if (activeTabId === 'tools') {
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
