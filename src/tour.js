const preferenceKey = 'kifisia-tour-hidden';

export function shouldShowTour(storage) {
  try { return storage?.getItem(preferenceKey) !== 'yes'; } catch { return true; }
}

export function hideTourForever(storage) {
  try { storage?.setItem(preferenceKey, 'yes'); } catch { /* Tour remains skippable if storage is unavailable. */ }
}

const steps = [
  { target: '#layers-heading', title: 'Choose map layers', copy: 'Open a group and switch on the topics you want to explore. Check each layer for its source and any available date.', sidebar: true },
  { target: '.place-search', title: 'Find a place', copy: 'Search for a street or place, or jump to Kifisia, Nea Erythraia or Ekali.', sidebar: true },
  { target: '#map', title: 'Explore the 3D map', copy: 'Drag to move, scroll or pinch to zoom, and select a mapped feature for details.' },
  { target: '#map-legend', title: 'Read the active legend', copy: 'The legend follows the layers you turn on. It shows their symbols, transparency and data sources.', legend: true },
  { target: '.map-legend__basemaps', title: 'Choose a base map', copy: 'Switch between Esri imagery and the OpenStreetMap street view beneath your selected layers.', legend: true },
  { target: '.identity__controls', title: 'Set your view', copy: 'Choose Greek or English and a light or dark interface. Open this tour again with the Tour button.' },
];

export function initTour() {
  const card = document.querySelector('#tour-card');
  const spotlight = document.querySelector('#tour-spotlight');
  const launch = document.querySelector('#tour-launch');
  const title = document.querySelector('#tour-title');
  const copy = document.querySelector('#tour-copy');
  const progress = document.querySelector('#tour-progress');
  const progressBar = document.querySelector('#tour-progress-bar');
  const back = document.querySelector('#tour-back');
  const next = document.querySelector('#tour-next');
  const layersButton = document.querySelector('#mobile-layers-toggle');
  const app = document.querySelector('.app');
  const legend = document.querySelector('#map-legend');
  let stepIndex = -1;
  let frame = 0;
  let layersWereOpen = false;
  let storage;
  try { storage = localStorage; } catch { storage = null; }

  function compact() { return matchMedia('(max-width: 900px), (max-height: 600px) and (pointer: coarse)').matches; }

  function position() {
    if (stepIndex < 0) return;
    const target = document.querySelector(steps[stepIndex].target);
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const inset = 7;
    const left = Math.max(4, rect.left - inset);
    const top = Math.max(4, rect.top - inset);
    Object.assign(spotlight.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${Math.max(0, Math.min(innerWidth - left - 4, rect.width + inset * 2))}px`,
      height: `${Math.max(0, Math.min(innerHeight - top - 4, rect.height + inset * 2))}px`,
    });
    if (compact()) {
      card.style.left = '12px';
      card.style.right = '12px';
      card.style.top = rect.top > innerHeight * 0.48 ? '12px' : 'auto';
      card.style.bottom = rect.top > innerHeight * 0.48 ? 'auto' : '12px';
    } else {
      const width = card.offsetWidth;
      const left = rect.right + width + 24 < innerWidth ? rect.right + 18 : Math.max(16, rect.left - width - 18);
      card.style.left = `${left}px`;
      card.style.right = 'auto';
      card.style.top = `${Math.max(16, Math.min(rect.top, innerHeight - card.offsetHeight - 16))}px`;
      card.style.bottom = 'auto';
    }
  }

  function queuePosition() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(position);
  }

  function show(index) {
    if (stepIndex < 0) layersWereOpen = app.classList.contains('layers-open');
    stepIndex = index;
    const step = steps[index];
    if (compact()) {
      if (step.sidebar !== app.classList.contains('layers-open')) layersButton.click();
    }
    if (step.legend) legend.open = true;
    card.hidden = false;
    spotlight.hidden = false;
    title.textContent = step.title;
    copy.textContent = step.copy;
    progress.textContent = `${String(index + 1).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}`;
    progressBar.style.width = `${(index + 1) / steps.length * 100}%`;
    back.hidden = index === 0;
    next.textContent = index === steps.length - 1 ? 'Finish' : 'Next';
    const target = document.querySelector(step.target);
    if (target && step.target !== '#map') target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
    requestAnimationFrame(() => { queuePosition(); title.focus({ preventScroll: true }); });
  }

  function close() {
    stepIndex = -1;
    cancelAnimationFrame(frame);
    card.hidden = true;
    spotlight.hidden = true;
    if (compact() && app.classList.contains('layers-open') !== layersWereOpen) layersButton.click();
    launch.focus({ preventScroll: true });
  }

  launch.addEventListener('click', () => show(0));
  document.querySelector('#tour-skip').addEventListener('click', close);
  document.querySelector('#tour-never').addEventListener('click', () => { hideTourForever(storage); close(); });
  back.addEventListener('click', () => show(Math.max(0, stepIndex - 1)));
  next.addEventListener('click', () => stepIndex === steps.length - 1 ? close() : show(stepIndex + 1));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && stepIndex >= 0) { event.preventDefault(); close(); } });
  window.addEventListener('resize', queuePosition);
  document.addEventListener('scroll', queuePosition, true);
  if (shouldShowTour(storage)) requestAnimationFrame(() => show(0));
}
