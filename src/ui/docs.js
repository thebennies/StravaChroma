import { COLORWAYS } from '../constants.js';
import { APP_VERSION } from '../version.js';

const SCROLL_KEY = 'docs-scroll-y';

const ICONS = {
  help: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>',
  colorways: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>',
  changelog: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
  about: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  troubleshooting: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
};

// Display metadata for each colorway group — update descriptions when adding new groups
const GROUP_META = {
  Mono:       { label: 'Mono',               description: 'Single-color tints applied uniformly across all layers' },
  Running:    { label: 'Running',             description: 'Running shoe brand palettes (Adidas, Asics, Brooks, Hoka, NB, Nike, ON, Puma, Salomon, Saucony)' },
  Sneakers:   { label: 'Sneakers',            description: 'Iconic sneaker colorways and silhouette-inspired palettes' },
  Kopi:       { label: 'Kopi',               description: 'Southeast Asian kopi shop and coffee brand-inspired palettes' },
  Brand:      { label: 'Brand',              description: 'Popular brand identity and logo colors' },
  Luxury:     { label: 'Luxury',             description: 'Premium and luxury fashion house palettes' },
  EPL:        { label: 'EPL',               description: 'English Premier League club colors' },
  NBA:        { label: 'NBA',               description: 'NBA team colors' },
  Comics:     { label: 'Comics',             description: 'Comic book and graphic novel-inspired colorways' },
  TMNT:       { label: 'TMNT',              description: 'Teenage Mutant Ninja Turtles character palettes' },
  MechKeeb:   { label: 'Mechanical Keyboards', description: 'Popular mechanical keyboard keycap colorway designs' },
  IDE:        { label: 'IDE Themes',         description: 'Code editor and IDE theme-inspired palettes' },
};

const colorwayCount = COLORWAYS.length;
const groupCounts = COLORWAYS.reduce((acc, c) => {
  acc[c.group] = (acc[c.group] || 0) + 1;
  return acc;
}, {});
const groupOrder = [...new Set(COLORWAYS.map(c => c.group))];

/**
 * Builds the docs page with Help, Troubleshooting, Changelog, and About sections.
 * Returns a container element.
 */
export function buildDocsPage({ onClose } = {}) {
  const container = document.createElement('div');
  container.className = 'h-screen w-screen bg-bg text-text-primary overflow-y-auto';

  // Restore scroll position
  const savedScroll = sessionStorage.getItem(SCROLL_KEY);
  if (savedScroll) {
    requestAnimationFrame(() => { container.scrollTop = parseInt(savedScroll, 10); });
  }
  container.addEventListener('scroll', () => {
    sessionStorage.setItem(SCROLL_KEY, container.scrollTop);
  }, { passive: true });

  // Fixed close button
  const closeBtn = document.createElement('button');
  closeBtn.className = [
    'fixed top-4 right-4 z-50',
    'w-10 h-10 flex items-center justify-center',
    'text-text-muted hover:text-text-primary',
    'transition-colors duration-150 cursor-pointer',
  ].join(' ');
  closeBtn.title = 'Close documentation';
  closeBtn.setAttribute('aria-label', 'Close documentation');
  closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg><span class="sr-only">Close</span>';
  if (onClose) {
    closeBtn.addEventListener('click', () => {
      sessionStorage.removeItem(SCROLL_KEY);
      onClose();
    });
  }
  container.appendChild(closeBtn);

  // Content wrapper
  const content = document.createElement('div');
  content.className = 'max-w-2xl mx-auto px-6 py-16';

  // Header
  const header = document.createElement('header');
  header.className = 'mb-8 text-center';
  const title = document.createElement('h1');
  title.className = 'text-3xl font-bold mb-2';
  title.innerHTML = 'Strava<span class="text-gradient">Chroma</span> Docs';
  const subtitle = document.createElement('p');
  subtitle.className = 'text-text-secondary';
  subtitle.textContent = 'Documentation and help center';
  header.appendChild(title);
  header.appendChild(subtitle);
  content.appendChild(header);

  // Section definitions
  const sections = [
    { id: 'help',            label: 'Help',               icon: ICONS.help },
    { id: 'troubleshooting', label: 'Troubleshooting',    icon: ICONS.troubleshooting },
    { id: 'colorways',       label: 'Colorway Statistics', icon: ICONS.colorways },
    { id: 'changelog',       label: 'Changelog',           icon: ICONS.changelog },
    { id: 'about',           label: 'About',               icon: ICONS.about },
  ];

  // TOC
  const toc = document.createElement('nav');
  toc.setAttribute('aria-label', 'Table of contents');
  toc.className = 'flex gap-2 mb-12 overflow-x-auto pb-1 scrollbar-none';
  sections.forEach(({ id, label, icon }) => {
    const link = document.createElement('a');
    link.href = `#${id}`;
    link.className = [
      'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm text-text-secondary whitespace-nowrap flex-shrink-0',
      'bg-surface border border-border hover:text-text-primary hover:border-primary transition-colors duration-150',
    ].join(' ');
    link.innerHTML = `${icon}<span>${label}</span>`;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(id);
      if (target) {
        const offset = target.getBoundingClientRect().top - container.getBoundingClientRect().top;
        container.scrollTo({ top: container.scrollTop + offset - 24, behavior: 'smooth' });
        history.replaceState(null, '', `#${id}`);
      }
    });
    toc.appendChild(link);
  });
  content.appendChild(toc);

  // Help Section
  content.appendChild(buildSection('Help', 'help', ICONS.help, [
    buildSubsection('Getting Started', `
      Upload a PNG of your Strava activity share image. StravaChroma analyzes it locally in your browser, detects three color layers, and lets you restyle them however you like. Hit the demo button on the home page to try it without your own image.
    `),
    buildSubsection('Uploading an Image', `
      Drag and drop a PNG onto the canvas, or click to browse. Files up to 100 MB and 50 megapixels are supported. Larger files may take a moment to process. Your image is never sent to a server.
    `),
    buildSubsection('Colorways', buildColorwaysHelpBlurb()),
    buildSubsection('Manual Adjustments', `
      The Manual tab (or sidebar on desktop) gives you HSL sliders for each layer:
      • Map – the route line and map background
      • Data – distance, time, pace stats
      • Label – text labels and headings

      Click the number next to any slider to type a precise value. Each layer also has a quick-select preset dropdown. The action buttons at the top let you Shuffle all layers to random hues, Cycle colors between layers, or Reset back to Strava defaults.
    `),
    buildSubsection('Canvas Controls', buildShortcutsTable()),
    buildSubsection('Background', `
      Four options in the Actions panel:
      • Auto – detects checkerboard transparency and picks dark or light accordingly
      • Dark – solid black
      • Light – solid white
      • Image – upload your own background (tap the clear button to remove it)
    `),
    buildSubsection('Saving Your Image', `
      Tap "Save" (mobile) or "Save Image" (desktop) to download a full-resolution PNG. On supported mobile browsers the system share sheet will open instead, letting you send or save directly from there.
    `),
  ]));

  // Troubleshooting Section
  content.appendChild(buildSection('Troubleshooting', 'troubleshooting', ICONS.troubleshooting, [
    buildSubsection('Wrong layer is getting colored', `
      The layer classifier works on saturation and connected-component size. Highly stylized screenshots — custom map tiles, unusual fonts, or heavy overlays — can confuse it. Try adjusting all three layers manually using the sliders to find the right combination.
    `),
    buildSubsection('Image looks blurry in the editor', `
      The canvas preview renders at 50% resolution for performance. The exported file is always at full resolution — use Save Image to get the full-quality version.
    `),
    buildSubsection('Export fails or times out', `
      Very large images (20+ megapixels) can take several seconds to export. If it fails, the app will retry automatically up to twice. If it keeps failing, try refreshing the page — your session is saved and will be restored.
    `),
    buildSubsection('App crashed or the image disappeared', `
      The image processing runs in a background Web Worker. If the worker crashes, the app restarts it automatically. Your source image is saved in IndexedDB, so refreshing the page will restore your session.
    `),
    buildSubsection('PNG-only — my file won\'t upload', `
      Only PNG files are supported. Strava share images are PNGs by default. If you have a JPEG, convert it to PNG first (e.g. using Preview on Mac or any online converter).
    `),
  ]));

  // Colorway Statistics Section
  content.appendChild(buildColorwaysStatsSection());

  // Changelog Section
  content.appendChild(buildSection('Changelog', 'changelog', ICONS.changelog, [
    buildSubsection(`v${APP_VERSION}`, `
      • CalVer versioning — dates instead of arbitrary numbers
      • Colorway search — Cmd/Ctrl+K to find palettes fast
      • Colorway favorites — heart your go-to palettes
      • Drop shadow effect — polish your exports
      • Group selection modal — curate your sidebar
      • New colorways — Kopi (coffee) & Comics/TMNT themes
      • Pink primary palette — fresh coat of paint
      • Mobile tab reorder — Colorways now default on small screens
    `),
    buildSubsection('v2026.04.0', `
      Initial release of StravaChroma.
      • Automatic layer detection (map, data, labels)
      • Color adjustment with HSL sliders
      • ${colorwayCount} preset colorways across ${groupOrder.length} groups
      • Custom background support
      • Mobile and desktop layouts
      • Session persistence via IndexedDB
    `),
  ]));

  // About Section
  content.appendChild(buildSection('About', 'about', ICONS.about, [
    buildSubsection('What is StravaChroma?', `
      StravaChroma is a free, browser-based tool for athletes who want to personalize their Strava activity screenshots. Instead of the default orange palette, you can restyle your maps to match your kit, brand, or aesthetic — no account, no installs, no uploads required.
    `),
    buildSubsection('How it works', `
      When you load an image, a Web Worker analyzes every pixel and classifies it into one of three layers: Map, Data, or Label. Color adjustments are applied non-destructively to those masks in real time. Your original image is never modified — the export composites everything fresh at full resolution.
    `),
    buildSubsection('Privacy', `
      Everything runs in your browser. Your images are never sent to any server. The only persistent storage used is IndexedDB, which holds your current session so you don't lose work on an accidental refresh. Closing the tab clears it.
    `),
    buildSubsection('Open Source', buildOpenSourceLinks()),
    buildSubsection('Maker', buildDeveloperCard()),
  ]));

  // Docs footer with version
  const docsFooter = document.createElement('footer');
  docsFooter.className = 'max-w-2xl mx-auto px-6 pb-12 text-center';
  const versionLine = document.createElement('p');
  versionLine.className = 'text-xs text-text-muted';
  versionLine.textContent = `v${APP_VERSION}`;
  docsFooter.appendChild(versionLine);
  content.appendChild(docsFooter);

  container.appendChild(content);

  // Deep link to hash on open (double rAF ensures layout is computed)
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const hash = location.hash.slice(1);
    if (hash) {
      const target = document.getElementById(hash);
      if (target) {
        const offset = target.getBoundingClientRect().top - container.getBoundingClientRect().top;
        container.scrollTo({ top: container.scrollTop + offset - 24, behavior: 'smooth' });
      }
    }
  }));

  // Update URL hash as sections scroll into view
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        history.replaceState(null, '', `#${entry.target.id}`);
      }
    });
  }, { root: container, rootMargin: '-30% 0px -60% 0px', threshold: 0 });

  sections.forEach(({ id }) => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });

  container.addEventListener('scrollend', () => {}, { passive: true }); // keep observer alive

  return container;
}

function buildSection(title, id, icon, subsections) {
  const section = document.createElement('section');
  section.className = 'mb-12';
  section.id = id;

  const heading = document.createElement('h2');
  heading.className = 'flex items-center gap-2 text-xl font-bold mb-6 pb-2 border-b border-border text-text-primary';
  heading.innerHTML = `<span class="text-text-muted">${icon}</span>${title}`;
  section.appendChild(heading);

  subsections.forEach(sub => section.appendChild(sub));

  return section;
}

function buildSubsection(title, contentArg) {
  const subsection = document.createElement('div');
  subsection.className = 'mb-6';

  const heading = document.createElement('h3');
  heading.className = 'text-base font-semibold mb-2 text-text-primary';
  heading.textContent = title;
  subsection.appendChild(heading);

  if (typeof contentArg === 'string') {
    const text = document.createElement('div');
    text.className = 'text-sm text-text-secondary leading-relaxed whitespace-pre-line';
    text.textContent = contentArg;
    subsection.appendChild(text);
  } else {
    // DOM element passed directly (e.g. shortcuts table)
    subsection.appendChild(contentArg);
  }

  return subsection;
}

function buildDeveloperCard() {
  const card = document.createElement('div');
  card.className = 'flex items-center gap-4';

  const avatarLink = document.createElement('a');
  avatarLink.href = 'https://github.com/thebennies';
  avatarLink.target = '_blank';
  avatarLink.rel = 'noopener noreferrer';
  avatarLink.className = 'flex-shrink-0';

  const avatarWrap = document.createElement('div');
  avatarWrap.className = 'rounded-full overflow-hidden border-2 border-border';
  avatarWrap.style.cssText = 'width: 3rem; height: 3rem;';

  const avatarImg = document.createElement('img');
  avatarImg.src = import.meta.env.BASE_URL + 'thebennies.png';
  avatarImg.alt = 'thebennies';
  avatarImg.className = 'w-full h-full object-cover';
  avatarWrap.appendChild(avatarImg);
  avatarLink.appendChild(avatarWrap);

  const info = document.createElement('div');

  const name = document.createElement('a');
  name.href = 'https://github.com/thebennies';
  name.target = '_blank';
  name.rel = 'noopener noreferrer';
  name.className = 'text-sm font-semibold text-text-primary hover:text-primary transition-colors';
  name.textContent = 'thebennies';

  const bio = document.createElement('p');
  bio.className = 'text-xs text-text-secondary mt-0.5';
  bio.textContent = 'Runner. Keyboard warrior. Lives in the Shell';

  info.appendChild(name);
  info.appendChild(bio);
  card.appendChild(avatarLink);
  card.appendChild(info);
  return card;
}

function buildOpenSourceLinks() {
  const container = document.createElement('div');
  container.className = 'text-sm text-text-secondary leading-relaxed space-y-2';

  const p = document.createElement('p');
  p.className = 'mb-3';
  p.textContent = 'StravaChroma is open source. Contributions, bug reports, and colorway suggestions are all welcome.';

  const links = document.createElement('div');
  links.className = 'flex flex-wrap gap-3';

  [
    { label: 'GitHub Repository', href: 'https://github.com/thebennies/StravaChroma' },
    { label: 'Contributors', href: 'https://github.com/thebennies/StravaChroma/graphs/contributors' },
    { label: 'Changelog', href: 'https://github.com/thebennies/StravaChroma/commits/main/' },
  ].forEach(({ label, href }) => {
    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className = 'inline-block text-primary hover:underline transition-colors';
    a.textContent = label;
    links.appendChild(a);
  });

  container.appendChild(p);
  container.appendChild(links);
  return container;
}

function buildColorwaysHelpBlurb() {
  const container = document.createElement('div');
  container.className = 'text-sm text-text-secondary leading-relaxed';

  const intro = document.createElement('p');
  intro.className = 'mb-2';
  intro.textContent = `The Colorways tab has ${colorwayCount} presets organized into ${groupOrder.length} groups:`;
  container.appendChild(intro);

  const list = document.createElement('ul');
  list.className = 'space-y-0.5 mb-2 pl-1';
  groupOrder.forEach(g => {
    const meta = GROUP_META[g] || { label: g, description: '' };
    const li = document.createElement('li');
    li.className = 'before:content-["•"] before:mr-2 before:text-text-muted';
    li.textContent = `${meta.label} (${groupCounts[g] || 0})${meta.description ? ' – ' + meta.description : ''}`;
    list.appendChild(li);
  });
  container.appendChild(list);

  const tip = document.createElement('p');
  tip.textContent = 'Use the prev/next arrows to browse, the group jump button to skip between categories, or hit Shuffle for a random pick.';
  container.appendChild(tip);
  return container;
}

function buildColorwaysStatsSection() {
  const section = document.createElement('section');
  section.className = 'mb-12';
  section.id = 'colorways';

  const heading = document.createElement('h2');
  heading.className = 'flex items-center gap-2 text-xl font-bold mb-6 pb-2 border-b border-border text-text-primary';
  heading.innerHTML = `<span class="text-text-muted">${ICONS.colorways}</span>Colorway Statistics`;
  section.appendChild(heading);

  // Summary card
  const summary = document.createElement('div');
  summary.className = 'flex items-center gap-4 mb-6 p-4 rounded-lg bg-surface border border-border';
  const totalNum = document.createElement('span');
  totalNum.className = 'text-4xl font-bold text-gradient';
  totalNum.textContent = colorwayCount;
  const totalLabel = document.createElement('div');
  totalLabel.className = 'text-sm text-text-secondary leading-tight';
  totalLabel.innerHTML = `<span class="block text-text-primary font-semibold">Total Colorways</span>across ${groupOrder.length} groups`;
  summary.appendChild(totalNum);
  summary.appendChild(totalLabel);
  section.appendChild(summary);

  // Group breakdown table
  const maxCount = Math.max(...groupOrder.map(g => groupCounts[g] || 0));
  const table = document.createElement('div');
  table.className = 'space-y-2';

  groupOrder.forEach(g => {
    const count = groupCounts[g] || 0;
    const pct = Math.round((count / maxCount) * 100);
    const meta = GROUP_META[g] || { label: g, description: '' };

    const row = document.createElement('div');
    row.className = 'mb-3';

    const header = document.createElement('div');
    header.className = 'flex items-center justify-between mb-1';

    const name = document.createElement('span');
    name.className = 'text-sm font-medium text-text-primary';
    name.textContent = meta.label;

    const countBadge = document.createElement('span');
    countBadge.className = 'text-xs text-text-muted tabular-nums';
    countBadge.textContent = count;

    header.appendChild(name);
    header.appendChild(countBadge);

    const barTrack = document.createElement('div');
    barTrack.className = 'h-1.5 bg-surface rounded-full overflow-hidden border border-border';
    const barFill = document.createElement('div');
    barFill.className = 'h-full bg-primary rounded-full transition-all';
    barFill.style.width = `${pct}%`;
    barTrack.appendChild(barFill);

    const desc = document.createElement('p');
    desc.className = 'text-xs text-text-muted mt-1';
    desc.textContent = meta.description || '';

    row.appendChild(header);
    row.appendChild(barTrack);
    if (meta.description) row.appendChild(desc);
    table.appendChild(row);
  });

  section.appendChild(table);
  return section;
}

function buildShortcutsTable() {
  const rows = [
    ['Desktop', 'Scroll wheel', 'Zoom in / out'],
    ['Desktop', 'Click + drag', 'Pan'],
    ['Desktop', 'Double-click', 'Fit image to canvas'],
    ['Mobile', 'Pinch', 'Zoom in / out'],
    ['Mobile', 'Two-finger drag', 'Pan'],
    ['Mobile', 'Double-tap', 'Fit image to canvas'],
  ];

  const wrapper = document.createElement('div');
  wrapper.className = 'overflow-x-auto -mx-1';

  const table = document.createElement('table');
  table.className = 'w-full text-sm border-collapse';

  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr class="text-left text-xs uppercase tracking-wide text-text-muted border-b border-border">
      <th class="pb-2 pr-4 font-medium">Platform</th>
      <th class="pb-2 pr-4 font-medium">Gesture / Key</th>
      <th class="pb-2 font-medium">Action</th>
    </tr>`;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  rows.forEach(([platform, gesture, action]) => {
    const tr = document.createElement('tr');
    tr.className = 'border-b border-border last:border-0';
    tr.innerHTML = `
      <td class="py-2 pr-4 text-text-muted">${platform}</td>
      <td class="py-2 pr-4"><code class="text-xs bg-surface px-1.5 py-0.5 rounded text-text-primary">${gesture}</code></td>
      <td class="py-2 text-text-secondary">${action}</td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrapper.appendChild(table);
  return wrapper;
}
