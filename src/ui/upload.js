import { toast } from './toast.js';
import { checkMemoryConstraints } from '../error-boundary.js';
import { createIcons, Users, ScrollText, BookOpen, ImageUp } from 'lucide';
import { openModal } from './modal.js';
import { APP_VERSION } from '../version.js';

/**
 * Builds the empty-state drop zone inside the canvas pane.
 * Returns { dropZone, fileInput }.
 */
const SIMPLE_MODE_KEY = 'stravachroma-simple-mode';

export function buildUploadPrompt(canvasPane, { onDocs } = {}) {
  const dropZone = document.createElement('div');
  dropZone.id = 'drop-zone';
  dropZone.className = [
    'flex flex-col items-center gap-8',
    'cursor-pointer select-none z-20 px-4 md:px-0 py-16',
  ].join(' ');

  // Load simple mode preference from localStorage
  let isSimpleMode = false;
  try {
    isSimpleMode = localStorage.getItem(SIMPLE_MODE_KEY) === 'true';
  } catch { /* ignore */ }

  // Simple mode toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.className = [
    'fixed top-4 right-4 z-30',
    'px-3 py-1.5 rounded-full',
    'bg-surface border border-border',
    'text-xs text-text-muted hover:text-text-primary hover:border-primary',
    'transition-all duration-150 cursor-pointer',
  ].join(' ');
  toggleBtn.textContent = isSimpleMode ? 'Full View' : 'Simple View';
  toggleBtn.setAttribute('aria-label', isSimpleMode ? 'Show full landing page view' : 'Show simplified landing page view');
  canvasPane.appendChild(toggleBtn);

  // App title
  const title = document.createElement('div');
  title.className = 'text-center flex flex-col items-center';

  const logoImg = document.createElement('img');
  logoImg.src = import.meta.env.BASE_URL + 'favicon.png';
  logoImg.alt = 'StravaChroma logo';
  logoImg.className = 'w-20 h-20 md:w-24 md:h-24 rounded-2xl mb-4';

  title.appendChild(logoImg);

  const titleMain = document.createElement('h1');
  titleMain.className = 'text-4xl md:text-6xl font-black text-text-primary leading-tight';
  titleMain.innerHTML = 'Strava<span class="text-gradient">Chroma</span>';
  title.appendChild(titleMain);
  titleMain.style.display = isSimpleMode ? 'none' : '';

  const titleSub = document.createElement('p');
  titleSub.className = 'text-lg md:text-xl text-text-secondary mt-1';
  titleSub.textContent = 'Personalize your run. Turn boring Strava share image into vibrant artworks.';
  title.appendChild(titleSub);
  titleSub.style.display = isSimpleMode ? 'none' : '';

  // Upload card - use a button for keyboard accessibility
  const inner = document.createElement('button');
  inner.className = [
    'bg-surface border-2 border-solid border-border rounded-2xl',
    'px-12 py-10 md:px-16 md:py-12 text-center',
    'transition-all duration-200 ease-out',
    'hover:border-text-secondary hover:bg-surface/80',
    'cursor-pointer',
  ].join(' ');
  inner.setAttribute('aria-label', 'Upload image - click to browse or drag and drop a PNG file');

  function updateUploadIcon() {
    uploadIcon.className = `mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center ${isSimpleMode ? '' : 'bg-surface-variant'}`;
  }
  const uploadIcon = document.createElement('div');
  updateUploadIcon();
  uploadIcon.innerHTML = '<i data-lucide="image-up" class="w-6 h-6 text-text-secondary"></i>';

  const line1 = document.createElement('p');
  line1.className = 'text-lg font-bold text-text-primary mb-1';
  line1.textContent = 'Drag and drop your Strava share image';

  const line2 = document.createElement('p');
  line2.className = 'text-sm text-text-secondary';
  line2.textContent = 'or click to browse your PNG file';

  inner.appendChild(uploadIcon);
  inner.appendChild(line1);
  inner.appendChild(line2);

  // Set initial visibility for simple mode
  line1.style.display = isSimpleMode ? 'none' : '';
  line2.style.display = isSimpleMode ? 'none' : '';
  dropZone.appendChild(title);

  // Implementation Sample section
  const sampleSection = document.createElement('div');
  sampleSection.className = 'w-full max-w-4xl mx-auto px-4';
  sampleSection.style.display = isSimpleMode ? 'none' : '';

  const sampleGrid = document.createElement('div');
  sampleGrid.className = 'grid grid-cols-4 gap-4 md:gap-6';

  const sampleImages = [
    { src: 'features-01-original.png', label: 'Original', alt: 'Strava screenshot with the default orange map route on a dark background' },
    { src: 'features-02-colorways.png', label: 'Colorways', alt: 'Strava screenshot showing various color theme options applied to the map' },
    { src: 'features-03-customize.png', label: 'Customize', alt: 'Strava screenshot demonstrating hue, saturation, and luminance customization controls' },
    { src: 'features-04-apply.jpg', label: 'Apply', alt: 'Strava screenshot showing the final recolored result ready to save' },
  ];

  sampleImages.forEach(({ src, label, alt }) => {
    const col = document.createElement('div');
    col.className = 'flex flex-col items-center gap-3';

    const imgWrap = document.createElement('button');
    imgWrap.className = 'w-full aspect-[517/980] rounded-lg overflow-hidden bg-surface border border-border cursor-pointer hover:border-primary transition-colors duration-200';
    imgWrap.setAttribute('aria-label', `View larger image: ${alt}`);

    const img = document.createElement('img');
    const imgSrc = import.meta.env.BASE_URL + src;
    img.src = imgSrc;
    img.alt = alt;
    img.className = 'w-full h-full object-cover pointer-events-none';

    imgWrap.addEventListener('click', () => {
      openModal(imgSrc, alt, imgWrap);
    });

    imgWrap.appendChild(img);

    const labelEl = document.createElement('p');
    labelEl.className = 'text-xs sm:text-sm font-semibold text-text-primary';
    labelEl.textContent = label;

    col.appendChild(imgWrap);
    col.appendChild(labelEl);
    sampleGrid.appendChild(col);
  });

  sampleSection.appendChild(sampleGrid);
  dropZone.appendChild(sampleSection);

  // Features — no card bg, just icon + title + desc
  function gradIcon(id, svgPaths) {
    return [
      `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">`,
      `<defs><linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%">`,
      `<stop offset="0%" stop-color="#F04A00"/>`,
      `<stop offset="55%" stop-color="#C0349A"/>`,
      `<stop offset="100%" stop-color="#7B2FBE"/>`,
      `</linearGradient></defs>`,
      ...svgPaths,
      `</svg>`,
    ].join('');
  }

  const featureItems = [
    {
      icon: gradIcon('fg-palette', [
        `<path stroke="url(#fg-palette)" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>`,
        `<circle cx="8.5" cy="7.5" r="1" fill="url(#fg-palette)" stroke="none"/>`,
        `<circle cx="12" cy="5.5" r="1" fill="url(#fg-palette)" stroke="none"/>`,
        `<circle cx="15.5" cy="7.5" r="1" fill="url(#fg-palette)" stroke="none"/>`,
        `<circle cx="17" cy="11" r="1" fill="url(#fg-palette)" stroke="none"/>`,
      ]),
      title: 'Custom Palettes',
      desc: 'Select pre-made themes or build your own.',
    },
    {
      icon: gradIcon('fg-monitor', [
        `<rect stroke="url(#fg-monitor)" x="2" y="3" width="20" height="14" rx="2"/>`,
        `<path stroke="url(#fg-monitor)" d="M8 21h8"/>`,
        `<path stroke="url(#fg-monitor)" d="M12 17v4"/>`,
      ]),
      title: 'High-Res Export',
      desc: 'No-loss quality for large screen sharing.',
    },
    {
      icon: gradIcon('fg-shield', [
        `<path stroke="url(#fg-shield)" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`,
        `<path stroke="url(#fg-shield)" d="M9 12l2 2 4-4"/>`,
      ]),
      title: '100% Private',
      desc: 'Images stay in your browser. Nothing is uploaded.',
    },
    {
      icon: gradIcon('fg-ban', [
        `<circle stroke="url(#fg-ban)" cx="12" cy="12" r="10"/>`,
        `<line stroke="url(#fg-ban)" x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>`,
      ]),
      title: 'No Watermarks',
      desc: 'Keep your final images completely clean.',
    },
  ];

  const featureGrid = document.createElement('div');
  featureGrid.className = 'w-full max-w-2xl grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-6 mt-6 mb-2';

  featureItems.forEach(({ icon, title, desc }) => {
    const col = document.createElement('div');
    col.className = 'flex flex-col items-center text-center gap-2';

    const iconWrap = document.createElement('div');
    iconWrap.className = 'mb-1';
    iconWrap.innerHTML = icon;

    const colTitle = document.createElement('p');
    colTitle.className = 'text-sm font-bold text-text-primary leading-snug';
    colTitle.textContent = title;

    const colDesc = document.createElement('p');
    colDesc.className = 'text-xs text-text-secondary leading-relaxed';
    colDesc.textContent = desc;

    col.appendChild(iconWrap);
    col.appendChild(colTitle);
    col.appendChild(colDesc);
    featureGrid.appendChild(col);
  });

  dropZone.appendChild(featureGrid);
  dropZone.appendChild(inner);

  // OR divider
  const orDivider = document.createElement('div');
  orDivider.className = 'flex items-center gap-4 w-full max-w-xs';
  orDivider.innerHTML = [
    '<div class="flex-1 h-px bg-border"></div>',
    '<span class="text-sm font-medium text-text-secondary tracking-widest">OR</span>',
    '<div class="flex-1 h-px bg-border"></div>',
  ].join('');
  dropZone.appendChild(orDivider);

  // Demo image button
  const demoBtn = document.createElement('button');
  demoBtn.id = 'demo-btn';
  const demoBtnIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
  function updateDemoBtnStyle() {
    if (isSimpleMode) {
      demoBtn.className = [
        'flex items-center justify-center gap-2',
        'w-auto px-3 py-1.5',
        'text-text-muted text-xs',
        'cursor-pointer transition-colors duration-150',
        'hover:text-text-primary',
        'bg-transparent border-0',
      ].join(' ');
    } else {
      demoBtn.className = [
        'flex items-center justify-center gap-2.5',
        'w-full max-w-xs px-7 py-3.5 rounded-full',
        'bg-surface border border-border',
        'text-text-secondary font-semibold text-sm',
        'cursor-pointer transition-all duration-200',
        'hover:bg-surface-variant hover:border-text-secondary hover:text-text-primary',
      ].join(' ');
    }
    demoBtn.innerHTML = demoBtnIcon + (isSimpleMode ? 'Demo Image' : 'Try with Demo Image');
  }
  updateDemoBtnStyle();
  demoBtn.setAttribute('aria-label', 'Load demo image');
  dropZone.appendChild(demoBtn);

  // Set initial visibility for simple mode
  featureGrid.style.display = isSimpleMode ? 'none' : '';
  orDivider.style.display = isSimpleMode ? 'none' : '';

  canvasPane.appendChild(dropZone);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'flex flex-col items-center gap-2 pointer-events-none pt-8 pb-6';

  const avatarLink = document.createElement('a');
  avatarLink.href = 'https://github.com/thebennies';
  avatarLink.target = '_blank';
  avatarLink.rel = 'noopener noreferrer';
  avatarLink.className = 'pointer-events-auto';

  const avatarWrap = document.createElement('div');
  avatarWrap.className = 'rounded-full overflow-hidden border-2 border-border flex-shrink-0';
  avatarWrap.style.cssText = 'width: 3em; height: 3em;';

  const avatarImg = document.createElement('img');
  avatarImg.src = import.meta.env.BASE_URL + 'thebennies.png';
  avatarImg.alt = 'thebennies';
  avatarImg.className = 'w-full h-full object-cover';
  avatarImg.style.filter = isSimpleMode ? 'grayscale(100%)' : '';
  avatarImg.style.opacity = isSimpleMode ? '0.2' : '';
  avatarWrap.appendChild(avatarImg);
  avatarLink.appendChild(avatarWrap);

  const footerLinks = document.createElement('div');
  footerLinks.className = 'flex items-center gap-3 pointer-events-auto';

  [
    ...(onDocs ? [{ label: 'Docs', onClick: onDocs, icon: `<i data-lucide="book-open" class="w-3 h-3 flex-shrink-0"></i>` }] : []),
    {
      label: 'GitHub',
      href: 'https://github.com/thebennies/StravaChroma',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="flex-shrink-0"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>`,
    },
    { label: 'Contrib', href: 'https://github.com/thebennies/StravaChroma/graphs/contributors', icon: `<i data-lucide="users" class="w-3 h-3 flex-shrink-0"></i>` },
    { label: 'Log',    href: 'https://github.com/thebennies/StravaChroma/commits/main/',       icon: `<i data-lucide="scroll-text" class="w-3 h-3 flex-shrink-0"></i>` },
  ].forEach(({ label, href, icon, onClick }, i, arr) => {
    const a = document.createElement(href ? 'a' : 'button');
    if (href) {
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.setAttribute('aria-label', `${label} (opens in new tab)`);
    }
    a.className = 'flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors cursor-pointer bg-transparent border-0 p-0';
    a.innerHTML = `${icon}${label}`;
    if (onClick) a.addEventListener('click', onClick);
    footerLinks.appendChild(a);
    if (i < arr.length - 1) {
      const sep = document.createElement('span');
      sep.className = 'text-xs text-text-muted';
      sep.textContent = '·';
      footerLinks.appendChild(sep);
    }
  });

  const copyright = document.createElement('p');
  copyright.className = 'text-xs text-text-muted';
  copyright.textContent = 'Copyright adalah Hak Cipta';

  const versionBadge = document.createElement('p');
  versionBadge.className = 'text-xs text-text-muted';
  versionBadge.textContent = `v${APP_VERSION}`;

  footer.appendChild(avatarLink);
  footer.appendChild(footerLinks);
  footer.appendChild(copyright);
  footer.appendChild(versionBadge);
  dropZone.appendChild(footer);

  // Hidden file input — remove any orphan from a previous buildUploadPrompt call
  document.getElementById('file-input')?.remove();
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/png';
  fileInput.style.display = 'none';
  fileInput.id = 'file-input';
  document.body.appendChild(fileInput);

  createIcons({ icons: { Users, ScrollText, BookOpen, ImageUp } });

  // Toggle simple mode handler
  toggleBtn.addEventListener('click', () => {
    isSimpleMode = !isSimpleMode;
    try {
      localStorage.setItem(SIMPLE_MODE_KEY, String(isSimpleMode));
    } catch { /* ignore */ }

    toggleBtn.textContent = isSimpleMode ? 'Full View' : 'Simple View';
    toggleBtn.setAttribute('aria-label', isSimpleMode ? 'Show full landing page view' : 'Show simplified landing page view');

    titleMain.style.display = isSimpleMode ? 'none' : '';
    titleSub.style.display = isSimpleMode ? 'none' : '';
    sampleSection.style.display = isSimpleMode ? 'none' : '';
    line1.style.display = isSimpleMode ? 'none' : '';
    line2.style.display = isSimpleMode ? 'none' : '';
    featureGrid.style.display = isSimpleMode ? 'none' : '';
    orDivider.style.display = isSimpleMode ? 'none' : '';
    updateDemoBtnStyle();
    avatarImg.style.filter = isSimpleMode ? 'grayscale(100%)' : '';
    avatarImg.style.opacity = isSimpleMode ? '0.2' : '';
    updateUploadIcon();
  });

  return { dropZone, inner, fileInput, demoBtn };
}

export function hideUploadPrompt(dropZone) {
  dropZone.style.display = 'none';
}

export function showUploadPrompt(dropZone) {
  dropZone.style.display = '';
}

/**
 * File size and memory limits
 */
const MEMORY_LIMITS = {
  WARNING_MB: 20,
  HARD_LIMIT_MB: 100,
  MAX_PIXELS: 50 * 1000000, // 50 megapixels
  WARNING_PIXELS: 20 * 1000000 // 20 megapixels
};

/**
 * Validates the file and extracts pixel data.
 * Calls onSuccess(file, pixelData, width, height) or shows toast on error.
 */
export async function processFile(file, onSuccess) {
  if (!file || file.type !== 'image/png') {
    toast.error('Please upload a PNG file.');
    return;
  }

  if (file.size > MEMORY_LIMITS.HARD_LIMIT_MB * 1024 * 1024) {
    toast.error(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Please use an image under ${MEMORY_LIMITS.HARD_LIMIT_MB} MB.`);
    return;
  }

  const fileMB = file.size / (1024 * 1024);
  if (fileMB > MEMORY_LIMITS.WARNING_MB) {
    toast.warning('Large file — processing may take a while...');
  }

  let dimensions;
  try {
    dimensions = await getImageDimensions(file);
  } catch {
    toast.error('Could not read image dimensions.');
    return;
  }

  const { width, height } = dimensions;
  const pixelCount = width * height;

  // Check pixel count limits
  if (pixelCount > MEMORY_LIMITS.MAX_PIXELS) {
    const mp = (pixelCount / 1000000).toFixed(1);
    toast.error(`Image too large (${mp}MP). Maximum is ${MEMORY_LIMITS.MAX_PIXELS / 1000000} megapixels.`);
    return;
  }

  if (pixelCount > MEMORY_LIMITS.WARNING_PIXELS) {
    const mp = (pixelCount / 1000000).toFixed(1);
    toast.warning(`Large image (${mp}MP) — processing may be slow.`);
  }

  // Check memory constraints
  const memoryCheck = checkMemoryConstraints(fileMB, width, height);
  if (!memoryCheck.allowed) {
    toast.error(memoryCheck.error);
    return;
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch (err) {
    console.error('Failed to decode image:', err);
    toast.error('Could not read file. It may be corrupted or not a valid PNG.');
    return;
  }

  // Verify decoded dimensions match
  if (bitmap.width !== width || bitmap.height !== height) {
    console.warn('Dimension mismatch between check and decode');
  }

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const ctx = tempCanvas.getContext('2d');
  
  try {
    ctx.drawImage(bitmap, 0, 0);
  } finally {
    bitmap.close();
  }

  const imageData = ctx.getImageData(0, 0, width, height);
  const pixelData = imageData.data;

  // Check for alpha channel — warn if no transparency
  let hasTransparency = false;
  for (let i = 3; i < pixelData.length; i += 4) {
    if (pixelData[i] < 255) { hasTransparency = true; break; }
  }
  if (!hasTransparency) {
    toast.warning('This image has no transparency. Results may look unexpected.');
  }

  onSuccess(file, pixelData, width, height);
}

/**
 * Get image dimensions without fully decoding
 */
function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: img.width, height: img.height });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };
    
    img.src = objectUrl;
  });
}

/**
 * Sets up drag-over styling on a target element.
 */
export function setupDragHighlight(target, inner) {
  target.addEventListener('dragover', (e) => {
    e.preventDefault();
    inner.classList.add('border-text-secondary', 'bg-surface-variant/50');
    inner.classList.remove('border-border');
  });

  target.addEventListener('dragleave', (e) => {
    if (!target.contains(e.relatedTarget)) {
      inner.classList.remove('border-text-secondary', 'bg-surface-variant/50');
      inner.classList.add('border-border');
    }
  });

  target.addEventListener('drop', (e) => {
    e.preventDefault();
    inner.classList.remove('border-primary', 'bg-primary/10');
    inner.classList.add('border-border');
  });
}
