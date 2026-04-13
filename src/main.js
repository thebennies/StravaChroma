import './styles.css';
import { appState, setState, subscribe } from './state.js';
import { PRESETS, COLORWAYS, DEFAULT_MAP_PRESET, DEFAULT_DATA_PRESET, DEFAULT_LABEL_PRESET } from './constants.js';
import { buildLayout } from './ui/layout.js';
import { buildUploadPrompt, processFile, setupDragHighlight } from './ui/upload.js';
import { buildDocsPage } from './ui/docs.js';
import { buildCanvas, drawImageData, fitToCanvas, showCheckerboard, setCanvasBackground, setClassifyOverlay, setRenderSpinner, setDropShadow, setCanvasLabel } from './ui/canvas.js';
import { buildControls, buildActions } from './ui/controls.js';
import { downloadExport } from './export.js';
import { toast } from './ui/toast.js';
import { hslToRgb } from './worker/utils.js';
import { initErrorHandling } from './error-boundary.js';
import { trackColorwaySelected, trackExport } from './analytics.js';

// ── Initialize Global Error Handling ──────────────────────────────────────────

initErrorHandling();

// ── Filename sanitization helper ─────────────────────────────────────────────

function sanitizeFilename(name) {
  // Remove path components and control characters
  // Keep only alphanumeric, spaces, hyphens, underscores, dots
  return name
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    .replace(/[<>",;:%|?*\x00-\x1F\x7F]/g, '')
    .slice(0, 255); // Limit length
}

// ── Image session persistence (IndexedDB) ────────────────────────────────────

const IDB_NAME  = 'stravachroma';
const IDB_STORE = 'session';
const IDB_KEY   = 'source-image';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess  = () => resolve(req.result);
    req.onerror    = () => reject(req.error);
  });
}

async function clearImageSession() {
  try {
    const db = await openDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(IDB_KEY);
  } catch { /* non-critical */ }
}

async function saveImageSession(pixelData, width, height) {
  try {
    const db = await openDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put({ buffer: pixelData.buffer.slice(0), width, height }, IDB_KEY);
  } catch { /* non-critical */ }
}

async function loadImageSession() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => {
        const d = req.result;
        resolve(d ? { pixelData: new Uint8ClampedArray(d.buffer), width: d.width, height: d.height } : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

// ── Resilient Worker Setup ────────────────────────────────────────────────────

let worker = null;
let workerRestartCount = 0;
const MAX_WORKER_RESTARTS = 2;
let pendingClassification = null;

let latestRequestId = 0;
let pendingExport = null;
let pendingExportTimeout = null;

function nextRequestId() {
  return ++latestRequestId;
}

function initWorker() {
  if (worker) {
    try {
      worker.terminate();
    } catch { /* ignore */ }
  }

  worker = new Worker(
    new URL('./worker/processor.worker.js', import.meta.url),
    { type: 'module' }
  );

  worker.addEventListener('message', handleWorkerMessage);

  worker.addEventListener('error', (error) => {
    console.error('Worker crashed:', error);
    handleWorkerCrash();
  });
}

function handleWorkerCrash() {
  if (workerRestartCount < MAX_WORKER_RESTARTS) {
    workerRestartCount++;
    console.warn(`Worker crashed, restarting (attempt ${workerRestartCount})...`);
    toast.warning('Processing interrupted. Retrying...');
    
    initWorker();
    
    // Re-submit pending work
    if (pendingClassification) {
      const { pixelData, width, height } = pendingClassification;
      pendingClassification = null;
      requestClassification(pixelData, width, height);
    }
  } else {
    toast.error('Processing failed too many times. Try a smaller image or reload the page.');
    setState({ 
      isClassifying: false, 
      isRendering: false, 
      isExporting: false 
    });
    // Clear any pending export timeout to prevent memory leak and double-rejection
    if (pendingExportTimeout) {
      clearTimeout(pendingExportTimeout);
      pendingExportTimeout = null;
    }
    if (pendingExport) {
      const { reject } = pendingExport;
      pendingExport = null;
      reject(new Error('Worker crashed repeatedly'));
    }
  }
}

// ── Worker message validation ─────────────────────────────────────────────────

function isValidClassifiedMsg(msg) {
  return msg && 
    typeof msg.requestId === 'number' &&
    msg.mask instanceof Uint8Array &&
    typeof msg.mapCount === 'number' &&
    typeof msg.textCount === 'number';
}

function isValidRenderedMsg(msg) {
  return msg && 
    typeof msg.requestId === 'number' &&
    msg.pixelData instanceof Uint8ClampedArray &&
    typeof msg.width === 'number' &&
    typeof msg.height === 'number';
}

function isValidErrorMsg(msg) {
  return msg && 
    typeof msg.message === 'string';
}

function handleWorkerMessage(e) {
  const msg = e.data;

  if (msg.type === 'classified') {
    if (!isValidClassifiedMsg(msg)) {
      console.error('Invalid classified message from worker:', msg);
      toast.error('Processing error: invalid response');
      setState({ isClassifying: false });
      return;
    }
    if (msg.requestId !== latestRequestId) return;

    pendingClassification = null;
    workerRestartCount = 0; // Reset on success
    
    setState({ classificationMask: msg.mask, isClassifying: false });

    if (msg.mapCount === 0 && msg.textCount === 0) {
      toast.info('No map or text pixels detected. Try a different image.');
    }

    requestRender(false);
    return;
  }

  if (msg.type === 'rendered') {
    if (!isValidRenderedMsg(msg)) {
      console.error('Invalid rendered message from worker:', msg);
      toast.error('Rendering error: invalid response');
      setState({ isRendering: false });
      return;
    }
    if (msg.requestId !== latestRequestId) return;

    if (pendingExport) {
      const { resolve } = pendingExport;
      pendingExport = null;
      resolve({ pixelData: msg.pixelData, width: msg.width, height: msg.height });
      return;
    }

    setState({
      previewPixelData: msg.pixelData,
      previewWidth: msg.width,
      previewHeight: msg.height,
      isRendering: false,
    });

    if (currentView === 'editor') {
      drawImageData(msg.pixelData, msg.width, msg.height);
      // Only fit canvas on first render to preserve user zoom/pan context
      if (!hasFittedCanvas) {
        fitToCanvas();
        hasFittedCanvas = true;
      }
    }
    return;
  }

  if (msg.type === 'error') {
    if (!isValidErrorMsg(msg)) {
      console.error('Invalid error message from worker:', msg);
      toast.error('Processing failed. Try reloading the page.');
    } else {
      console.error('Worker reported error:', msg.message);
      toast.error('Processing failed. Try reloading the page.');
    }
    setState({ isClassifying: false, isRendering: false, isExporting: false });
    pendingClassification = null;
    if (pendingExport) {
      const { reject } = pendingExport;
      pendingExport = null;
      reject(new Error('Worker error: ' + (msg.message || 'Unknown error')));
    }
  }
}

function requestClassification(pixelData, width, height) {
  pendingClassification = { pixelData, width, height };
  
  const rid = nextRequestId();
  const transferred = new Uint8ClampedArray(pixelData.buffer.slice(0));
  
  try {
    worker.postMessage(
      { type: 'classify', requestId: rid, pixelData: transferred, width, height },
      [transferred.buffer]
    );
  } catch (err) {
    console.error('Failed to post message to worker:', err);
    handleWorkerCrash();
  }
}

// Initialize worker on load
initWorker();

// ── Checkerboard helpers ──────────────────────────────────────────────────────

function hslLuminance(hue, sat, luminance) {
  const [r, g, b] = hslToRgb(hue, sat, luminance);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function anyColorIsCloseToBlack(state) {
  const threshold = 0.1;
  return hslLuminance(state.dataHue,  state.dataSat,  state.dataLuminance)  < threshold
      || hslLuminance(state.labelHue, state.labelSat, state.labelLuminance) < threshold
      || hslLuminance(state.mapHue,   state.mapSat,   state.mapLuminance)   < threshold;
}

// ── UI references (reset to no-ops on each view change) ──────────────────────

let currentView = null; // 'landing' | 'editor' | '404'
let layout = null;
let updateMapControls   = () => {};
let updateDataControls  = () => {};
let updateLabelControls = () => {};
let setControlsEnabled  = () => {};
let setRandomEnabled    = () => {};
let setExporting           = () => {};
let setExportEnabled       = () => {};
let setActiveColorway      = () => {};

let prevHasImage         = false;
let prevCheckerShow      = false;
let prevCheckerDark      = false;
let prevDropShadowEnabled = false;
let hasFittedCanvas      = false;

// ── State subscription → DOM updates ─────────────────────────────────────────

subscribe((state) => {
  if (currentView !== 'editor') return;

  const hasImage = !!state.sourcePixelData;
  if (hasImage !== prevHasImage) {
    prevHasImage = hasImage;
    setControlsEnabled(hasImage);
    setExportEnabled(hasImage);
    setRandomEnabled(hasImage);
  }

  setClassifyOverlay(state.isClassifying);
  setRenderSpinner(state.isRendering && !state.isClassifying);

  // Show checkerboard only for 'auto' — explicit dark/light backgrounds use a
  // solid colour so the canvas pane's backgroundColor shows through transparent
  // pixels, giving clear visual feedback that the button worked.
  const checkerShow = !!state.previewPixelData && state.selectedBackground === 'auto';
  const checkerDark = checkerShow && anyColorIsCloseToBlack(state);
  if (checkerShow !== prevCheckerShow || checkerDark !== prevCheckerDark) {
    prevCheckerShow = checkerShow;
    prevCheckerDark = checkerDark;
    showCheckerboard(checkerShow, checkerDark);
  }

  setExporting(state.isExporting);
  setActiveColorway(state.selectedColorway);

  // Handle drop shadow effect
  if (state.dropShadowEnabled !== prevDropShadowEnabled) {
    prevDropShadowEnabled = state.dropShadowEnabled;
    setDropShadow(state.dropShadowEnabled);
  }

  updateMapControls({
    hue: state.mapHue,
    sat: state.mapSat,
    luminance: state.mapLuminance,
    selectedPreset: state.selectedMapPreset,
  });

  updateDataControls({
    hue: state.dataHue,
    sat: state.dataSat,
    luminance: state.dataLuminance,
    selectedPreset: state.selectedDataPreset,
  });

  updateLabelControls({
    hue: state.labelHue,
    sat: state.labelSat,
    luminance: state.labelLuminance,
    selectedPreset: state.selectedLabelPreset,
  });
});

// ── Upload handling ───────────────────────────────────────────────────────────

function handleFileLoad(file, pixelData, width, height) {
  setState({
    sourceFile:         file,
    sourcePixelData:    pixelData,
    sourceWidth:        width,
    sourceHeight:       height,
    classificationMask: null,
    previewPixelData:   null,
    previewWidth:       0,
    previewHeight:      0,
    isClassifying:      true,
    isRendering:        false,
  });

  // Update canvas label with sanitized filename for accessibility
  setCanvasLabel(sanitizeFilename(file.name));

  requestClassification(pixelData, width, height);
  saveImageSession(pixelData, width, height);
  navigate('/editor');
}

// ── Slider / preset handlers ──────────────────────────────────────────────────

function cap(s) { return s[0].toUpperCase() + s.slice(1); }

function handleSliderChange(layer, field, value) {
  const patch = {};
  if (field === 'hue')      patch[`${layer}Hue`]      = value;
  if (field === 'sat')      patch[`${layer}Sat`]      = value;
  if (field === 'luminance') patch[`${layer}Luminance`] = value;
  setState({ ...patch, [`selected${cap(layer)}Preset`]: -1, selectedColorway: -1 });
  requestRender(false);
}

function handleSwap() {
  const { mapHue, mapSat, mapLuminance, dataHue, dataSat, dataLuminance, labelHue, labelSat, labelLuminance } = appState;
  setState({
    labelHue: mapHue,    labelSat: mapSat,    labelLuminance: mapLuminance,
    dataHue:  labelHue,  dataSat:  labelSat,  dataLuminance:  labelLuminance,
    mapHue:   dataHue,   mapSat:   dataSat,   mapLuminance:   dataLuminance,
    selectedMapPreset: -1, selectedDataPreset: -1, selectedLabelPreset: -1,
    selectedColorway: -1,
  });
  requestRender(false);
}

function handleColorway(idx) {
  const colorway = COLORWAYS[idx];
  if (!colorway) return;
  trackColorwaySelected(colorway, idx);
  setState({
    mapHue:   colorway.map.hue,   mapSat:   colorway.map.sat,   mapLuminance:   colorway.map.luminance,
    dataHue:  colorway.data.hue,  dataSat:  colorway.data.sat,  dataLuminance:  colorway.data.luminance,
    labelHue: colorway.label.hue, labelSat: colorway.label.sat, labelLuminance: colorway.label.luminance,
    selectedMapPreset: -1, selectedDataPreset: -1, selectedLabelPreset: -1,
    selectedColorway: idx,
  });
  requestRender(false);
}

function handlePresetChange(layer, presetIndex) {
  const preset = PRESETS[presetIndex];
  if (!preset) return;
  setState({
    [`${layer}Hue`]:                  preset.hue,
    [`${layer}Sat`]:                  preset.sat,
    [`${layer}Luminance`]:            preset.luminance,
    [`selected${cap(layer)}Preset`]:  presetIndex,
  });
  requestRender(false);
}

// ── Background handler ────────────────────────────────────────────────────────

function handleBackgroundChange(type, imageUrl) {
  setState({ selectedBackground: type, customImage: imageUrl ?? null });
  setCanvasBackground(type, imageUrl);
}

function handleDropShadowChange(enabled) {
  setState({ dropShadowEnabled: enabled });
}

function handleGradientChange(enabled) {
  setState({ gradientEnabled: enabled });
  requestRender(false);
}

function handleLogoChange(enabled) {
  setState({ showLogo: enabled });
}

// ── Render request ────────────────────────────────────────────────────────────

function buildSliders() {
  const { mapHue, mapSat, mapLuminance,
          dataHue, dataSat, dataLuminance,
          labelHue, labelSat, labelLuminance,
          gradientEnabled } = appState;
  return { mapHue, mapSat, mapLuminance,
           dataHue, dataSat, dataLuminance,
           labelHue, labelSat, labelLuminance,
           gradientEnabled };
}

function requestRender(isExport) {
  if (!appState.sourcePixelData || !appState.classificationMask) return;

  const rid = nextRequestId();
  setState({ isRendering: true });

  const sliders   = buildSliders();
  const pixelCopy = new Uint8ClampedArray(appState.sourcePixelData.buffer.slice(0));
  const maskCopy  = new Uint8Array(appState.classificationMask.buffer.slice(0));

  try {
    worker.postMessage(
      {
        type: 'render',
        requestId: rid,
        pixelData: pixelCopy,
        mask: maskCopy,
        width:  appState.sourceWidth,
        height: appState.sourceHeight,
        sliders,
        downscale: !isExport,
        gradientEnabled: sliders.gradientEnabled,
      },
      [pixelCopy.buffer, maskCopy.buffer]
    );
  } catch (err) {
    console.error('Failed to post render message:', err);
    toast.error('Failed to start rendering. Please try again.');
    setState({ isRendering: false });
  }
}

// ── Export handler ────────────────────────────────────────────────────────────

async function handleExport() {
  if (!appState.sourcePixelData || !appState.classificationMask) {
    toast.info('Load an image first.');
    return;
  }
  if (appState.isExporting) return;

  setState({ isExporting: true });

  const rid       = nextRequestId();
  const sliders   = buildSliders();
  const pixelCopy = new Uint8ClampedArray(appState.sourcePixelData.buffer.slice(0));
  const maskCopy  = new Uint8Array(appState.classificationMask.buffer.slice(0));

  let result;
  try {
    result = await new Promise((resolve, reject) => {
      pendingExport = { resolve, reject };
      
      try {
        worker.postMessage(
          {
            type: 'render',
            requestId: rid,
            pixelData: pixelCopy,
            mask: maskCopy,
            width:  appState.sourceWidth,
            height: appState.sourceHeight,
            sliders,
            downscale: false,
            gradientEnabled: sliders.gradientEnabled,
          },
          [pixelCopy.buffer, maskCopy.buffer]
        );
      } catch (err) {
        reject(err);
      }
      
      // Timeout fallback in case worker hangs
      pendingExportTimeout = setTimeout(() => {
        pendingExportTimeout = null;
        if (pendingExport) {
          pendingExport = null;
          reject(new Error('Export timed out'));
        }
      }, 60000); // 60 second timeout
    });
  } catch (err) {
    console.error('Export failed:', err);
    toast.error('Export failed. Please try again.');
    setState({ isExporting: false, isRendering: false });
    return;
  } finally {
    // Clear timeout on success or failure
    if (pendingExportTimeout) {
      clearTimeout(pendingExportTimeout);
      pendingExportTimeout = null;
    }
  }

  try {
    trackExport(appState, COLORWAYS);
    await downloadExport(result.pixelData, result.width, result.height, appState.dropShadowEnabled, appState.showLogo);
  } catch (err) {
    console.error('Download failed:', err);
    toast.error('Failed to save image. Please try again.');
  }
  
  setState({ isExporting: false, isRendering: false });
}

// ── Reset handler ─────────────────────────────────────────────────────────────

function handleReset() {
  setState({
    mapHue:              PRESETS[DEFAULT_MAP_PRESET].hue,
    mapSat:              PRESETS[DEFAULT_MAP_PRESET].sat,
    mapLuminance:        PRESETS[DEFAULT_MAP_PRESET].luminance,
    selectedMapPreset:   DEFAULT_MAP_PRESET,
    dataHue:             PRESETS[DEFAULT_DATA_PRESET].hue,
    dataSat:             PRESETS[DEFAULT_DATA_PRESET].sat,
    dataLuminance:       PRESETS[DEFAULT_DATA_PRESET].luminance,
    selectedDataPreset:  DEFAULT_DATA_PRESET,
    labelHue:            PRESETS[DEFAULT_LABEL_PRESET].hue,
    labelSat:            PRESETS[DEFAULT_LABEL_PRESET].sat,
    labelLuminance:      PRESETS[DEFAULT_LABEL_PRESET].luminance,
    selectedLabelPreset: DEFAULT_LABEL_PRESET,
  });
  requestRender(false);
}

// ── Random handler ────────────────────────────────────────────────────────────

function handleRandom() {
  const randomHue = () => Math.floor(Math.random() * 361);

  setState({
    mapHue:   randomHue(), mapSat: 1.0, mapLuminance: 0.5,   selectedMapPreset:   -1,
    dataHue:  randomHue(), dataSat: 1.0, dataLuminance: 0.5,  selectedDataPreset:  -1,
    labelHue: randomHue(), labelSat: 1.0, labelLuminance: 0.5, selectedLabelPreset: -1,
  });
  requestRender(false);
}

// ── Views ─────────────────────────────────────────────────────────────────────

function setupLanding() {
  currentView = 'landing';
  layout = null;
  updateMapControls = updateDataControls = updateLabelControls = () => {};
  setControlsEnabled = setRandomEnabled = setExporting = setExportEnabled = setActiveColorway = () => {};

  const app = document.getElementById('app');
  app.innerHTML = '';
  app.className = 'min-h-screen w-screen relative bg-bg overflow-y-auto';

  const { dropZone, inner, fileInput, demoBtn } = buildUploadPrompt(app, { onDocs: () => navigate('/docs') });

  inner.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file, handleFileLoad);
    fileInput.value = '';
  });
  setupDragHighlight(inner, inner);
  inner.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file, handleFileLoad);
  });

  demoBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    demoBtn.disabled = true;
    demoBtn.textContent = 'Loading\u2026';
    try {
      const res = await fetch(import.meta.env.BASE_URL + 'demo.png');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const file = new File([blob], 'demo.png', { type: 'image/png' });
      processFile(file, handleFileLoad);
    } catch (err) {
      console.error('Failed to load demo image:', err);
      toast.error('Could not load demo image.');
      demoBtn.disabled = false;
      demoBtn.innerHTML = [
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
        '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>',
        '<circle cx="8.5" cy="8.5" r="1.5"/>',
        '<polyline points="21 15 16 10 5 21"/>',
        '</svg>',
        'Try with Demo Image',
      ].join('');
    }
  });
}

let editorAbortController = null;

function setupEditor() {
  // Clean up previous editor instance's event listeners
  if (editorAbortController) {
    editorAbortController.abort();
  }
  editorAbortController = new AbortController();
  const signal = editorAbortController.signal;

  currentView = 'editor';

  layout = buildLayout(isMobile, { onStartOver: () => navigate('/'), onDocs: () => navigate('/docs') });
  buildCanvas(layout.canvasPane);
  setCanvasBackground(appState.selectedBackground, appState.customImage);
  setDropShadow(appState.dropShadowEnabled);

  prevHasImage = false;
  prevCheckerShow = false;
  prevCheckerDark = false;
  prevDropShadowEnabled = false;
  hasFittedCanvas = false;

  const controlsResult = buildControls(
    layout.controlsContainer,
    { isMobile, onSliderChange: handleSliderChange, onPresetChange: handlePresetChange,
      onRandom: handleRandom, onReset: handleReset, onSwap: handleSwap, onExport: handleExport, onColorway: handleColorway,
      onBackgroundChange: handleBackgroundChange,
      onDropShadowChange: handleDropShadowChange,
      onLogoChange: handleLogoChange,
      initialBackground: appState.selectedBackground,
      initialCustomImage: appState.customImage,
      initialDropShadow: appState.dropShadowEnabled,
      onGradientChange: handleGradientChange,
      initialGradient: appState.gradientEnabled,
      initialLogo: appState.showLogo,
      signal }
  );
  ({ updateMapControls, updateDataControls, updateLabelControls,
     setEnabled: setControlsEnabled, setRandomEnabled, setActiveColorway } = controlsResult);

  if (layout.actions) {
    ({ setExporting, setExportEnabled } = buildActions(layout.actions, { onExport: handleExport, signal }));
  } else {
    ({ setExporting, setExportEnabled } = controlsResult);
  }

  layout.showFullLayout();

  if (appState.previewPixelData) {
    drawImageData(appState.previewPixelData, appState.previewWidth, appState.previewHeight);
    fitToCanvas();
  }

  const checkerShow = !!appState.previewPixelData && appState.selectedBackground === 'auto';
  const checkerDark = checkerShow && anyColorIsCloseToBlack(appState);
  showCheckerboard(checkerShow, checkerDark);

  setState({});
}

function setupDocs() {
  currentView = 'docs';
  layout = null;
  updateMapControls = updateDataControls = updateLabelControls = () => {};
  setControlsEnabled = setRandomEnabled = setExporting = setExportEnabled = setActiveColorway = () => {};

  const app = document.getElementById('app');
  app.innerHTML = '';
  app.className = '';

  const docsPage = buildDocsPage({ onClose: () => history.back() });
  app.appendChild(docsPage);
}

function setup404() {
  currentView = '404';
  layout = null;
  updateMapControls = updateDataControls = updateLabelControls = () => {};
  setControlsEnabled = setRandomEnabled = setExporting = setExportEnabled = setActiveColorway = () => {};

  const app = document.getElementById('app');
  app.innerHTML = '';
  app.className = 'h-screen w-screen flex flex-col items-center justify-center gap-4 bg-bg text-text-primary';

  const code = document.createElement('p');
  code.className = 'text-8xl font-black text-text-muted';
  code.textContent = '404';

  const msg = document.createElement('p');
  msg.className = 'text-lg font-semibold';
  msg.textContent = 'Page not found';

  const countdown = document.createElement('p');
  countdown.className = 'text-sm text-text-secondary';

  const link = document.createElement('a');
  link.href = '/';
  link.className = 'text-primary hover:underline text-sm mt-2 cursor-pointer';
  link.textContent = 'Go to homepage';
  link.addEventListener('click', (e) => {
    e.preventDefault();
    clearInterval(timer);
    navigate('/');
  });

  app.appendChild(code);
  app.appendChild(msg);
  app.appendChild(countdown);
  app.appendChild(link);

  let seconds = 5;
  const tick = () => { countdown.textContent = `Redirecting to homepage in ${seconds}s…`; };
  tick();

  const timer = setInterval(() => {
    seconds--;
    if (seconds <= 0) { clearInterval(timer); navigate('/'); }
    else tick();
  }, 1000);
}

// ── Router ────────────────────────────────────────────────────────────────────

const BASE = import.meta.env.BASE_URL; // '/StravaChroma/' in prod, '/' in dev

function getRelativePath() {
  const raw = window.location.pathname;
  return raw.startsWith(BASE) ? '/' + raw.slice(BASE.length) : raw;
}

function navigate(path) {
  const base = BASE.endsWith('/') ? BASE.slice(0, -1) : BASE;
  history.pushState({}, '', base + path);
  render(path);
}

function render(path) {
  if (path === '/' || path === '') {
    setupLanding();
  } else if (path === '/editor') {
    if (!appState.sourcePixelData) { navigate('/'); return; }
    setupEditor();
  } else if (path === '/docs') {
    setupDocs();
  } else {
    setup404();
  }
}

window.onpopstate = () => render(getRelativePath());

// ── Responsive resize ─────────────────────────────────────────────────────────

const MOBILE_BREAKPOINT = 800;
let isMobile = window.innerWidth < MOBILE_BREAKPOINT;

window.addEventListener('resize', () => {
  const nowMobile = window.innerWidth < MOBILE_BREAKPOINT;
  if (nowMobile !== isMobile) {
    isMobile = nowMobile;
    render(getRelativePath());
  }
});

// ── Prevent default browser drag-and-drop behavior page-wide ─────────────────

document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());

// ── Beforeunload Warning ──────────────────────────────────────────────────────

window.addEventListener('beforeunload', (e) => {
  // Warn if processing is in progress
  if (appState.isClassifying || appState.isRendering || appState.isExporting) {
    e.preventDefault();
    e.returnValue = 'Image processing in progress. Are you sure you want to leave?';
    return e.returnValue;
  }
  
  // Warn if there are unsaved changes
  if (appState.sourcePixelData && hasUnsavedChanges()) {
    e.preventDefault();
    e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    return e.returnValue;
  }
});

function hasUnsavedChanges() {
  return appState.mapHue       !== PRESETS[DEFAULT_MAP_PRESET].hue   ||
         appState.dataHue      !== PRESETS[DEFAULT_DATA_PRESET].hue  ||
         appState.labelHue     !== PRESETS[DEFAULT_LABEL_PRESET].hue ||
         appState.mapSat       !== PRESETS[DEFAULT_MAP_PRESET].sat   ||
         appState.dataSat      !== PRESETS[DEFAULT_DATA_PRESET].sat  ||
         appState.labelSat     !== PRESETS[DEFAULT_LABEL_PRESET].sat ||
         appState.mapLuminance  !== PRESETS[DEFAULT_MAP_PRESET].luminance   ||
         appState.dataLuminance !== PRESETS[DEFAULT_DATA_PRESET].luminance  ||
         appState.labelLuminance !== PRESETS[DEFAULT_LABEL_PRESET].luminance;
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

(async () => {
  // Clear any stale IndexedDB session on startup to prevent storage bloat
  await clearImageSession();

  // Restore path saved by 404.html (GitHub Pages SPA routing).
  const redirect = sessionStorage.getItem('spa-redirect');
  if (redirect) {
    sessionStorage.removeItem('spa-redirect');
    history.replaceState(null, '', redirect);
  }

  const path = getRelativePath();

  // On a hard refresh at /editor the in-memory image is gone — restore from IDB.
  if (path === '/editor' && !appState.sourcePixelData) {
    const saved = await loadImageSession();
    if (saved) {
      setState({
        sourcePixelData:    saved.pixelData,
        sourceWidth:        saved.width,
        sourceHeight:       saved.height,
        classificationMask: null,
        previewPixelData:   null,
        previewWidth:       0,
        previewHeight:      0,
        isClassifying:      true,
        isRendering:        false,
      });
      requestClassification(saved.pixelData, saved.width, saved.height);
    } else {
      // No saved image — fall back to landing.
      render('/');
      return;
    }
  }

  render(path);
})();
