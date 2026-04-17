import { createIcons, BookOpen } from 'lucide';

/**
 * Builds the top-level DOM skeleton.
 * Returns references to key container nodes.
 */
export function buildLayout(isMobile, { onStartOver, onDocs } = {}) {
  const app = document.getElementById('app');
  app.innerHTML = '';

  const layout = isMobile ? buildMobileLayout(app, { onStartOver, onDocs }) : buildDesktopLayout(app, { onStartOver, onDocs });
  createIcons({ icons: { BookOpen } });
  return layout;
}

function buildDesktopLayout(app, { onStartOver, onDocs } = {}) {
  app.className = 'flex h-screen w-screen overflow-hidden relative bg-bg';

  // Left pane — canvas
  const canvasPane = document.createElement('div');
  canvasPane.id = 'canvas-pane';
  canvasPane.className = 'flex-1 relative overflow-hidden bg-bg z-10';

  // Right sidebar
  const sidebar = document.createElement('div');
  sidebar.id = 'sidebar';
  sidebar.className = [
    'w-[480px] flex-shrink-0 z-10',
    'bg-surface border-l border-border',
    'flex flex-col overflow-y-auto',
  ].join(' ');

  // Sidebar header
  const header = document.createElement('div');
  header.className = 'px-5 py-5 border-b border-border';

  const titleRow = document.createElement('div');
  titleRow.className = 'flex items-center gap-3';

  const logoIcon = document.createElement('button');
  logoIcon.className = 'w-10 h-10 rounded-xl flex-shrink-0 cursor-pointer bg-transparent border-0 p-0';
  logoIcon.title = 'Start over';
  logoIcon.setAttribute('aria-label', 'Start over');
  const logoImg = document.createElement('img');
  logoImg.src = import.meta.env.BASE_URL + 'favicon.png';
  logoImg.alt = 'StravaChroma';
  logoImg.className = 'w-10 h-10 rounded-xl';
  logoIcon.appendChild(logoImg);
  if (onStartOver) {
    logoIcon.addEventListener('click', () => {
      if (confirm('Start over? Your current work will be lost.')) onStartOver();
    });
  }

  const titleText = document.createElement('button');
  titleText.className = 'cursor-pointer bg-transparent border-0 p-0 text-left';
  titleText.title = 'Start over';
  titleText.setAttribute('aria-label', 'Start over');
  const title = document.createElement('h1');
  title.className = 'text-lg font-bold text-text-primary leading-tight';
  title.innerHTML = 'Strava<span class="text-gradient">Chroma</span>';
  const subtitle = document.createElement('p');
  subtitle.className = 'text-xs text-text-secondary mt-0.5';
  subtitle.textContent = 'Your routes, your colors';
  titleText.appendChild(title);
  titleText.appendChild(subtitle);

  const docsBtn = document.createElement('button');
  docsBtn.className = [
    'ml-auto w-8 h-8 flex items-center justify-center flex-shrink-0',
    'text-text-muted hover:text-text-primary transition-colors duration-150 cursor-pointer',
  ].join(' ');
  docsBtn.title = 'Documentation';
  docsBtn.setAttribute('aria-label', 'Documentation');
  docsBtn.innerHTML = '<i data-lucide="book-open" class="w-4 h-4"></i><span class="sr-only">Docs</span>';
  if (onDocs) {
    docsBtn.addEventListener('click', onDocs);
  }

  titleRow.appendChild(logoIcon);
  titleRow.appendChild(titleText);
  titleRow.appendChild(docsBtn);
  header.appendChild(titleRow);
  sidebar.appendChild(header);

  // Controls container
  const controlsContainer = document.createElement('div');
  controlsContainer.id = 'controls-container';
  controlsContainer.className = 'flex-1 overflow-y-auto';
  sidebar.appendChild(controlsContainer);

  // Action buttons at the bottom
  const actions = document.createElement('div');
  actions.id = 'actions';
  actions.className = 'p-4 border-t border-border';
  sidebar.appendChild(actions);

  sidebar.style.display = 'none';

  app.appendChild(canvasPane);
  app.appendChild(sidebar);

  function showFullLayout() {
    sidebar.style.display = '';
  }

  return { canvasPane, sidebar, controlsContainer, actions, isMobile: false, showFullLayout };
}

function buildMobileLayout(app, { onStartOver, onDocs } = {}) {
  app.className = 'flex flex-col h-screen w-screen overflow-hidden relative bg-bg';

  // Top bar
  const topBar = document.createElement('div');
  topBar.id = 'top-bar';
  topBar.className = [
    'flex-shrink-0 flex items-center gap-3 z-10',
    'px-4 py-3 bg-surface border-b border-border',
  ].join(' ');

  const logoIcon = document.createElement('button');
  logoIcon.className = 'w-8 h-8 rounded-lg flex-shrink-0 cursor-pointer bg-transparent border-0 p-0';
  logoIcon.title = 'Start over';
  logoIcon.setAttribute('aria-label', 'Start over');
  const logoImg = document.createElement('img');
  logoImg.src = import.meta.env.BASE_URL + 'favicon.png';
  logoImg.alt = 'StravaChroma';
  logoImg.className = 'w-8 h-8 rounded-lg';
  logoIcon.appendChild(logoImg);
  if (onStartOver) {
    logoIcon.addEventListener('click', () => {
      if (confirm('Start over? Your current work will be lost.')) onStartOver();
    });
  }

  const title = document.createElement('button');
  title.className = 'text-base font-bold text-text-primary cursor-pointer bg-transparent border-0 p-0';
  title.title = 'Start over';
  title.setAttribute('aria-label', 'Start over');
  if (onStartOver) {
    title.addEventListener('click', () => {
      if (confirm('Start over? Your current work will be lost.')) onStartOver();
    });
  }
  title.innerHTML = 'Strava<span class="text-gradient">Chroma</span>';

  const docsBtn = document.createElement('button');
  docsBtn.className = [
    'ml-auto w-8 h-8 flex items-center justify-center flex-shrink-0',
    'text-text-muted hover:text-text-primary transition-colors duration-150 cursor-pointer',
  ].join(' ');
  docsBtn.title = 'Documentation';
  docsBtn.setAttribute('aria-label', 'Documentation');
  docsBtn.innerHTML = '<i data-lucide="book-open" class="w-4 h-4"></i><span class="sr-only">Docs</span>';
  if (onDocs) {
    docsBtn.addEventListener('click', onDocs);
  }

  topBar.appendChild(logoIcon);
  topBar.appendChild(title);
  topBar.appendChild(docsBtn);

  // Canvas area
  const canvasPane = document.createElement('div');
  canvasPane.id = 'canvas-pane';
  canvasPane.className = 'flex-1 relative overflow-hidden bg-bg min-h-0 z-10';

  // Controls section (collapsible)
  const controlsWrapper = document.createElement('div');
  controlsWrapper.id = 'controls-wrapper';
  controlsWrapper.className = 'flex-shrink-0 bg-surface border-t border-border z-20 flex flex-col';
  controlsWrapper.style.height = '50vh';

  const controlsContainer = document.createElement('div');
  controlsContainer.id = 'controls-container';
  controlsContainer.className = 'overflow-y-auto flex-1 min-h-0';
  controlsWrapper.appendChild(controlsContainer);

  topBar.style.display = 'none';
  controlsWrapper.style.display = 'none';

  app.appendChild(topBar);
  app.appendChild(canvasPane);
  app.appendChild(controlsWrapper);

  function showFullLayout() {
    topBar.style.display = '';
    controlsWrapper.style.display = '';
  }

  return { canvasPane, controlsContainer, actions: null, isMobile: true, showFullLayout };
}
