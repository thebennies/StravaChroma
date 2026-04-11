import { toast } from './ui/toast.js';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

/**
 * Triggers a full-res export download with automatic retry on failure.
 * @param {Uint8ClampedArray} pixelData  — rendered RGBA at full resolution
 * @param {number} width
 * @param {number} height
 * @param {boolean} [dropShadowEnabled] — whether to apply drop shadow effect
 * @param {number} [retryCount] — internal retry counter
 */
export async function downloadExport(pixelData, width, height, dropShadowEnabled = false, retryCount = 0) {
  try {
    await attemptDownload(pixelData, width, height, dropShadowEnabled);
    toast.success('Image saved successfully!');
  } catch (err) {
    console.error(`Export attempt ${retryCount + 1} failed:`, err);
    
    if (retryCount < MAX_RETRIES) {
      toast.warning('Retrying export...');
      await delay(RETRY_DELAY_MS * (retryCount + 1)); // Exponential backoff
      return downloadExport(pixelData, width, height, dropShadowEnabled, retryCount + 1);
    }
    
    toast.error('Export failed after multiple attempts. Please try again.');
    throw err;
  }
}

/**
 * Internal download attempt
 */
async function attemptDownload(pixelData, width, height, dropShadowEnabled = false) {
  const hiddenCanvas = document.createElement('canvas');
  hiddenCanvas.width = width;
  hiddenCanvas.height = height;
  const ctx = hiddenCanvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get 2D context');
  }

  const imageData = new ImageData(pixelData, width, height);

  if (dropShadowEnabled) {
    // putImageData bypasses ctx.filter, so we must composite via drawImage:
    // 1. Write raw pixels onto a temporary canvas
    // 2. Draw that canvas onto the export canvas with the filter applied
    const tmp = document.createElement('canvas');
    tmp.width = width;
    tmp.height = height;
    tmp.getContext('2d').putImageData(imageData, 0, 0);
    ctx.filter = 'drop-shadow(0 5px 10px rgba(0, 0, 0, 0.5))';
    ctx.drawImage(tmp, 0, 0);
    ctx.filter = 'none';
  } else {
    ctx.putImageData(imageData, 0, 0);
  }

  const blob = await new Promise((resolve, reject) => {
    hiddenCanvas.toBlob((b) => b ? resolve(b) : reject(new Error('Canvas toBlob returned null')), 'image/png');
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `stravachroma_export_${timestamp}.png`;

  // Web Share API: preferred on mobile (Android Chrome, iOS Safari/Chrome)
  if (navigator.share && navigator.canShare) {
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'StravaChroma Export' });
      return;
    }
  }

  // Desktop / fallback: anchor download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  try {
    a.click();
  } finally {
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
