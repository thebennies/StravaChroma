let canvas = null;
let ctx = null;
let checkerboard = null;
let renderSpinner = null;
let classifyOverlay = null;
let canvasPane = null;

// Transform state
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let isPanning = false;
let lastPanX = 0;
let lastPanY = 0;

// Touch state
let lastTouchDist = 0;
let lastTouchMidX = 0;
let lastTouchMidY = 0;
let touchPaneRect = null; // cached at pinch-start, avoids forced layout in touchmove

// window-level handlers stored so they can be removed before re-registering on layout rebuild
let onWindowMouseMove = null;
let onWindowMouseUp = null;

const MIN_SCALE = 0.25;
const MAX_SCALE = 5;

export function buildCanvas(pane) {
  canvasPane = pane;
  checkerboard = document.createElement('div');
  checkerboard.id = 'checkerboard';
  checkerboard.className = 'absolute inset-0 z-0 rounded-xl';
  checkerboard.style.cssText = 'background-size:32px 32px;display:none';
  canvasPane.appendChild(checkerboard);

  canvas = document.createElement('canvas');
  canvas.id = 'preview-canvas';
  canvas.className = 'absolute z-10';
  canvas.style.cssText = 'top:0;left:0;image-rendering:pixelated;transform-origin:0 0;';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Recolored Strava map preview');
  canvasPane.appendChild(canvas);
  ctx = canvas.getContext('2d');

  renderSpinner = document.createElement('div');
  renderSpinner.id = 'render-spinner';
  renderSpinner.className = [
    'absolute top-4 right-4 z-30',
    'bg-surface/90 backdrop-blur-sm border border-border rounded-lg',
    'px-3 py-2 text-xs font-medium text-text-secondary',
    'flex items-center gap-2',
    'hidden',
  ].join(' ');
  renderSpinner.innerHTML = '<span class="w-2 h-2 bg-primary rounded-full animate-pulse"></span> Updating';
  renderSpinner.setAttribute('role', 'status');
  renderSpinner.setAttribute('aria-live', 'polite');
  renderSpinner.setAttribute('aria-atomic', 'true');
  canvasPane.appendChild(renderSpinner);

  classifyOverlay = document.createElement('div');
  classifyOverlay.id = 'classify-overlay';
  classifyOverlay.className = [
    'absolute inset-0 flex flex-col items-center justify-center z-40',
    'bg-bg/80 backdrop-blur-sm',
    'hidden',
  ].join(' ');
  classifyOverlay.setAttribute('role', 'status');
  classifyOverlay.setAttribute('aria-live', 'polite');

  // Skeleton route lines — pulse while classifying
  const skeleton = document.createElement('div');
  skeleton.className = 'absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none';
  skeleton.setAttribute('aria-hidden', 'true');
  [['w-48', 'h-1.5'], ['w-64', 'h-1.5'], ['w-40', 'h-1.5'], ['w-56', 'h-1.5'], ['w-36', 'h-1.5']]
    .forEach(([w, h]) => {
      const bar = document.createElement('div');
      bar.className = `${w} ${h} rounded-full bg-surface-variant animate-pulse`;
      skeleton.appendChild(bar);
    });
  classifyOverlay.appendChild(skeleton);

  const scannerContainer = document.createElement('div');
  scannerContainer.className = 'flex flex-col items-center z-10';

  const spinnerRing = document.createElement('div');
  spinnerRing.className = [
    'w-12 h-12 border-3 border-surface-variant border-t-primary',
    'rounded-full animate-spin mb-4',
  ].join(' ');

  const spinnerLabel = document.createElement('p');
  spinnerLabel.className = 'text-sm font-medium text-text-secondary';
  spinnerLabel.textContent = 'Analyzing image\u2026';

  scannerContainer.appendChild(spinnerRing);
  scannerContainer.appendChild(spinnerLabel);
  classifyOverlay.appendChild(scannerContainer);
  canvasPane.appendChild(classifyOverlay);

  canvas.addEventListener('dblclick', fitToCanvas);

  setupDesktopInteractions(canvasPane, canvas);
  setupMobileInteractions(canvas);

  return { canvas, ctx };
}

export function drawImageData(pixelData, width, height) {
  canvas.width = width;
  canvas.height = height;
  ctx.putImageData(new ImageData(pixelData, width, height), 0, 0);
}

export function fitToCanvas() {
  const imgW = canvas.width;
  const imgH = canvas.height;
  if (!imgW || !imgH) return;
  const rect = canvas.parentElement.getBoundingClientRect();
  const scaleX = rect.width / imgW;
  const scaleY = rect.height / imgH;
  scale = Math.min(scaleX, scaleY);
  offsetX = (rect.width  - imgW * scale) / 2;
  offsetY = (rect.height - imgH * scale) / 2;
  applyTransform();
}

function applyTransform() {
  canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
}

export function showCheckerboard(show, useDark = false) {
  if (!checkerboard) return;
  if (!show) { checkerboard.style.display = 'none'; return; }
  const dotColor = useDark ? '#CCCCCC' : '#1A1A1A';
  const dotSize = useDark ? '1.5px' : '2px';
  checkerboard.style.backgroundColor = useDark ? '#999999' : '';
  checkerboard.style.backgroundImage = `radial-gradient(circle, ${dotColor} ${dotSize}, transparent ${dotSize})`;
  checkerboard.style.backgroundSize = '24px 24px';
  checkerboard.style.display = '';
}

export function setCanvasBackground(type, imageUrl) {
  if (!canvasPane) return;
  canvasPane.style.backgroundColor = '';
  canvasPane.style.backgroundImage = '';
  canvasPane.style.backgroundSize = '';
  canvasPane.style.backgroundPosition = '';
  if (type === 'white') {
    canvasPane.style.backgroundColor = '#ffffff';
  } else if (type === 'black') {
    canvasPane.style.backgroundColor = '#000000';
  } else if (type === 'image' && imageUrl) {
    canvasPane.style.backgroundImage = `url(${imageUrl})`;
    canvasPane.style.backgroundSize = 'cover';
    canvasPane.style.backgroundPosition = 'center';
  }
  // 'auto': all inline styles cleared → CSS class bg-bg (#0D0D0D) takes over
}

/**
 * Update the canvas aria-label with the filename for better context
 */
export function setCanvasLabel(filename) {
  if (canvas) {
    canvas.setAttribute('aria-label', filename ? `Recolored map: ${filename}` : 'Recolored Strava map preview');
  }
}

export function setClassifyOverlay(visible) {
  if (classifyOverlay) classifyOverlay.classList.toggle('hidden', !visible);
}

export function setRenderSpinner(visible) {
  if (renderSpinner) renderSpinner.classList.toggle('hidden', !visible);
}

/**
 * Applies a CSS drop-shadow filter to the preview canvas.
 * The same filter is applied during export via canvas context filter.
 */
export function setDropShadow(enabled) {
  if (!canvas) return;
  if (enabled) {
    canvas.style.filter = 'drop-shadow(0 5px 10px rgba(0, 0, 0, 0.5))';
  } else {
    canvas.style.filter = '';
  }
}

function clampScale(s) {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
}

function zoomAround(localX, localY, factor) {
  const newScale = clampScale(scale * factor);
  const ratio = newScale / scale;
  offsetX = localX - (localX - offsetX) * ratio;
  offsetY = localY - (localY - offsetY) * ratio;
  scale = newScale;
  applyTransform();
}

function setupDesktopInteractions(canvasPane, canvas) {
  // Remove stale window listeners from a previous buildCanvas call
  if (onWindowMouseMove) window.removeEventListener('mousemove', onWindowMouseMove);
  if (onWindowMouseUp)   window.removeEventListener('mouseup',   onWindowMouseUp);

  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isPanning = true;
    lastPanX = e.clientX;
    lastPanY = e.clientY;
    canvas.style.cursor = 'grabbing';
  });

  onWindowMouseMove = (e) => {
    if (!isPanning) return;
    offsetX += e.clientX - lastPanX;
    offsetY += e.clientY - lastPanY;
    lastPanX = e.clientX;
    lastPanY = e.clientY;
    applyTransform();
  };
  window.addEventListener('mousemove', onWindowMouseMove);

  onWindowMouseUp = () => {
    if (isPanning) {
      isPanning = false;
      canvas.style.cursor = '';
    }
  };
  window.addEventListener('mouseup', onWindowMouseUp);

  canvasPane.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvasPane.getBoundingClientRect();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    zoomAround(e.clientX - rect.left, e.clientY - rect.top, factor);
  }, { passive: false });
}

function setupMobileInteractions(canvas) {
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touches = e.touches;
    if (touches.length === 1) {
      lastPanX = touches[0].clientX;
      lastPanY = touches[0].clientY;
      lastTouchDist = 0;
    } else if (touches.length === 2) {
      lastTouchDist = Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      );
      lastTouchMidX = (touches[0].clientX + touches[1].clientX) / 2;
      lastTouchMidY = (touches[0].clientY + touches[1].clientY) / 2;
      // Cache pane rect once per pinch gesture to avoid forced layout on every touchmove
      touchPaneRect = canvas.parentElement.getBoundingClientRect();
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touches = e.touches;

    if (touches.length === 1) {
      offsetX += touches[0].clientX - lastPanX;
      offsetY += touches[0].clientY - lastPanY;
      lastPanX = touches[0].clientX;
      lastPanY = touches[0].clientY;
      applyTransform();
    } else if (touches.length === 2) {
      const dist = Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      );
      const midX = (touches[0].clientX + touches[1].clientX) / 2;
      const midY = (touches[0].clientY + touches[1].clientY) / 2;

      if (lastTouchDist > 0 && touchPaneRect) {
        zoomAround(midX - touchPaneRect.left, midY - touchPaneRect.top, dist / lastTouchDist);
      }

      lastTouchDist = dist;
      lastTouchMidX = midX;
      lastTouchMidY = midY;
    }
  }, { passive: false });
}
