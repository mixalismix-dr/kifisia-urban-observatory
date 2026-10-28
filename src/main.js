import * as maplibregl from 'maplibre-gl';
import { createBusLayer } from './bus-layer.js';
import { createGreeneryLayer } from './greenery-layer.js';
import { createTrainLayer } from './train-layer.js';
import { railPath, estimatedTrains } from './rail-estimates.js';
import { createTrafficLayer } from './traffic-layer.js';
import { setupSunPreview } from './sun-preview.js';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';

maplibregl.setWorkerUrl(workerUrl);

const places = {
  kifisia: [23.8082244, 38.0736082],
  'nea-erythraia': [23.8173613, 38.0882121],
  ekali: [23.8425642, 38.1068395],
};
const stories = {
  alsos: {
    title: 'Άλσος Κηφισιάς', era: 'A park since 1901', point: [23.810459, 38.072806],
    copy: 'The municipality dates the creation of the park to 1901. It became one of Greece’s early planned green spaces, beside the railway station.',
    source: 'https://www.kifissia.gr/sites/default/files/arxia/touristikos%20odigos%20kifissias%20el.pdf',
    photo: 'alsos.jpg', alt: 'Aerial view of Άλσος Κηφισιάς',
    photoPage: 'https://commons.wikimedia.org/wiki/File:Άλσος_Κηφισιάς_4106.jpg', photoYear: '2022',
  },
  goulandris: {
    title: 'Goulandris Museum', era: 'Founded in 1964', point: [23.8146485, 38.0743683],
    copy: 'Angelos and Niki Goulandris founded the natural history museum in 1964. It began with botany and later expanded into zoology, paleontology and geology.',
    source: 'https://www.gnhm.gr/en/the-museum/founders-and-history/',
    photo: 'goulandris.jpg', alt: 'Exterior of the Goulandris Natural History Museum',
    photoPage: 'https://commons.wikimedia.org/wiki/File:Μουσείο_Γουλανδρή_7886.jpg', photoYear: '2015',
  },
  kazouli: {
    title: 'Villa Kazouli', era: '19th-century villa', point: [23.8102896, 38.0675885],
    copy: 'The municipality identifies Villa Kazouli as a 19th-century architectural landmark at the southern entrance to Kifisia.',
    source: 'https://kifissia.gr/axiotheata/',
    photo: 'kazouli.jpg', alt: 'South wing of Villa Kazouli',
    photoPage: 'https://commons.wikimedia.org/wiki/File:Βίλα_Καζούλη_7942.jpg', photoYear: '2015',
  },
};
const searchInput = document.querySelector('#place-search-input');
const searchResults = document.querySelector('#place-search-results');
const searchNote = document.querySelector('#place-search-note');
const searchKey = (value) => value.toLocaleLowerCase('el').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ς/g, 'σ');
let searchItems = [];
let searchPopup;
fetch(`${import.meta.env.BASE_URL}data/kifisia-search.json`)
  .then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
  .then((items) => { searchItems = items.map((item) => ({ ...item, key: searchKey(item.name) })); searchInput.dispatchEvent(new Event('input')); })
  .catch(() => { searchNote.textContent = 'Place search unavailable'; });
searchInput.addEventListener('input', () => {
  searchResults.replaceChildren();
  const query = searchKey(searchInput.value.trim());
  if (query.length < 2) return;
  const matches = searchItems.filter((item) => item.key.includes(query)).slice(0, 7);
  for (const item of matches) {
    const row = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    const title = document.createElement('span');
    title.textContent = item.name;
    const kind = document.createElement('span');
    kind.textContent = item.kind;
    button.append(title, kind);
    button.addEventListener('click', () => {
      searchInput.value = item.name;
      searchResults.replaceChildren();
      searchPopup?.remove();
      map.flyTo({ center: item.point, zoom: 17, pitch: 52, duration: 900 });
      searchPopup = new maplibregl.Popup({ closeOnClick: true, offset: 12 })
        .setLngLat(item.point).setDOMContent(selectionDetails(item.name, item.kind, 'Mapped location; verify exact access and address locally')).addTo(map);
    });
    row.append(button);
    searchResults.append(row);
  }
  if (!matches.length) {
    const row = document.createElement('li');
    row.textContent = 'No mapped match';
    searchResults.append(row);
  }
});
searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') { event.preventDefault(); searchResults.querySelector('button')?.click(); }
  if (event.key === 'Escape') { searchResults.replaceChildren(); searchInput.blur(); }
});
const localBounds = [[23.71, 38.02], [23.94, 38.16]];

const status = document.querySelector('#map-status');
const selection = document.querySelector('#selection-content');
let busModelLayer;
let greeneryLayer;
let trainModelLayer;
let trafficModelLayer;
let railNetworkVisible = false;
const kifissiaStation = [23.808219792, 38.073395087];
const emptyFeatures = () => ({ type: 'FeatureCollection', features: [] });
const layerVisibility = (toggle) => document.querySelector(`#${toggle}`).checked ? 'visible' : 'none';
const layerPanel = document.querySelector('#layers-heading').closest('section');
function updateLayerCounts() {
  for (const group of layerPanel.querySelectorAll('.layer-group')) {
    const active = group.querySelectorAll('.layer input[type="checkbox"]:checked').length;
    group.querySelector('.layer-group__count').textContent = `${active} active`;
  }
}
layerPanel.addEventListener('change', updateLayerCounts);
updateLayerCounts();
const map = new maplibregl.Map({
  container: 'map',
  style: 'https://tiles.openfreemap.org/styles/positron',
  center: places.kifisia,
  zoom: 15.1,
  pitch: 52,
  bearing: -22,
  maxBounds: localBounds,
  attributionControl: false,
  canvasContextAttributes: { antialias: true },
});

map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-right');
map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

map.on('load', async () => {
  map.setPaintProperty('park', 'fill-color', '#b6cbb0');
  map.setPaintProperty('landcover_wood', 'fill-color', '#a9c2a8');
  const labelLayer = map.getStyle().layers.find((layer) => layer.type === 'symbol')?.id;
  map.addSource('satellite', {
    type: 'raster',
    tiles: ['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    tileSize: 256,
    attribution: 'Esri, Maxar, Earthstar Geographics, and the GIS User Community',
  });
  map.addLayer({ id: 'satellite', type: 'raster', source: 'satellite', layout: { visibility: document.querySelector('#basemap-select').value === 'satellite' ? 'visible' : 'none' } }, labelLayer);
  map.addLayer({
    id: 'kifisia-buildings',
    type: 'fill-extrusion',
    source: 'openmaptiles',
    'source-layer': 'building',
    filter: ['!=', ['get', 'hide_3d'], true],
    minzoom: 13,
    layout: { visibility: layerVisibility('buildings-toggle') },
    paint: {
      'fill-extrusion-color': '#d0a681',
      'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 0],
      'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
      'fill-extrusion-opacity': 0.82,
    },
  }, labelLayer);
  map.addSource('copernicus-buildings', { type: 'geojson', data: emptyFeatures(), attribution: 'Copernicus Urban Atlas 2021 Building Block Height · Athens GIS' });
  map.addLayer({ id: 'copernicus-buildings', type: 'fill-extrusion', source: 'copernicus-buildings', minzoom: 14,
    layout: { visibility: 'none' },
    paint: { 'fill-extrusion-color': ['step', ['get', 'height_m'], '#c9d0b2', 8, '#d3bb8e', 15, '#b78b68', 25, '#627b91'],
      'fill-extrusion-height': ['get', 'height_m'], 'fill-extrusion-opacity': 0.86 },
  }, labelLayer);
  setupSunPreview(map);

  const localData = (name) => `${import.meta.env.BASE_URL}data/kifisia-${name}.geojson`;
  map.addSource('building-types', { type: 'geojson', data: localData('building-types'), attribution: '© OpenStreetMap contributors · Geofabrik extract, 26 Oct 2026' });
  map.addLayer({
    id: 'building-types', type: 'fill-extrusion', source: 'building-types', minzoom: 13,
    layout: { visibility: layerVisibility('types-toggle') },
    paint: {
      'fill-extrusion-color': ['match', ['get', 'category'],
        'Residential', '#b88272', 'Civic & health', '#627fa2', 'Business', '#c49b4a',
        'Worship', '#9a77a8', 'Industrial', '#848f91', 'Ancillary', '#8ca6a0', '#d0a681'],
      'fill-extrusion-height': ['get', 'height_m'], 'fill-extrusion-opacity': 0.92,
    },
  }, labelLayer);
  map.addSource('land-cover', { type: 'geojson', data: localData('land-cover-2021'), attribution: 'Athens GIS · 2021 land cover' });
  map.addLayer({
    id: 'land-cover', type: 'fill', source: 'land-cover', layout: { visibility: layerVisibility('landuse-toggle') },
    paint: { 'fill-color': ['match', ['get', 'class_2021'],
      ['Forests', 'Green urban areas (Public access)', 'Green urban areas (Unknown access conditions)'], '#6e9e70',
      ['Herbaceous vegetation associations (natural grassland, moors...)', 'Pastures'], '#a4b77f',
      ['Sports and leisure facilities'], '#8eb5aa',
      ['Industrial, commercial, public, military and private units'], '#b9a8a0',
      ['Open spaces with little or no vegetation (beaches, dunes, bare rocks, glaciers)', 'Land without current use'], '#c8c4a6',
      '#e5d0b4'], 'fill-opacity': 0.66, 'fill-outline-color': '#ffffff55' },
  }, 'kifisia-buildings');

  map.addSource('dsm', {
    type: 'image', url: `${import.meta.env.BASE_URL}data/kifisia-dsm.png`,
    coordinates: [[23.7677541, 38.1225421], [23.8844208, 38.1225421], [23.8844208, 38.0605977], [23.7677541, 38.0605977]],
  });
  map.addLayer({ id: 'dsm', type: 'raster', source: 'dsm', layout: { visibility: layerVisibility('dsm-toggle') }, paint: { 'raster-opacity': 0.67 } }, 'kifisia-buildings');
  map.addSource('contours', { type: 'geojson', data: localData('contours'), attribution: 'Copernicus DEM GLO-30 · DSM, 20 m derived contours' });
  map.addLayer({ id: 'contours', type: 'line', source: 'contours', layout: { visibility: layerVisibility('contours-toggle') }, paint: { 'line-color': '#5e5a46', 'line-width': 1.1, 'line-opacity': 0.72 } }, labelLayer);

  map.addSource('tree-cover', {
    type: 'image',
    url: `${import.meta.env.BASE_URL}data/kifisia-tree-cover.png`,
    coordinates: [
      [23.7677541, 38.1225421], [23.8844901, 38.1225421],
      [23.8844901, 38.0604421], [23.7677541, 38.0604421],
    ],
  });
  map.addLayer({ id: 'tree-cover', type: 'raster', source: 'tree-cover', layout: { visibility: layerVisibility('trees-toggle') }, paint: { 'raster-opacity': 0.72 } }, 'kifisia-buildings');
  map.addSource('ndvi', { type: 'image', url: `${import.meta.env.BASE_URL}data/kifisia-ndvi.png`,
    coordinates: [[23.7677541, 38.1225421], [23.8844901, 38.1225421], [23.8844901, 38.0604421], [23.7677541, 38.0604421]] });
  map.addLayer({ id: 'ndvi', type: 'raster', source: 'ndvi', layout: { visibility: layerVisibility('ndvi-toggle') },
    paint: { 'raster-opacity': 0.78, 'raster-resampling': 'nearest' } }, 'kifisia-buildings');

  map.addSource('flood-100', { type: 'geojson', data: localData('flood-100'), attribution: 'Attica Water Directorate · flood-risk plan, first revision' });
  map.addLayer({
    id: 'flood-100', type: 'fill', source: 'flood-100',
    layout: { visibility: layerVisibility('flood-toggle') },
    paint: { 'fill-color': '#277fa6', 'fill-opacity': 0.38, 'fill-outline-color': '#18688e' },
  }, 'kifisia-buildings');

  for (const [name, toggle, type, paint] of [
    ['sports', 'sports-toggle', 'fill', { 'fill-color': '#b86a53', 'fill-opacity': 0.72, 'fill-outline-color': '#713e38' }],
    ['parks', 'parks-toggle', 'fill', { 'fill-color': '#4d9868', 'fill-opacity': 0.46, 'fill-outline-color': '#25704d' }],
    ['public-spaces', 'public-toggle', 'fill', { 'fill-color': ['match', ['get', 'category'], 'Park', '#4d9868', 'Playground', '#dca953', '#86a97e'], 'fill-opacity': 0.42, 'fill-outline-color': '#37654b' }],
    ['playgrounds', 'playgrounds-toggle', 'fill', { 'fill-color': '#dca953', 'fill-opacity': 0.75, 'fill-outline-color': '#a66a21' }],
    ['arch-sites', 'heritage-toggle', 'fill', { 'fill-color': '#9b6b91', 'fill-opacity': 0.73, 'fill-outline-color': '#6f4267' }],
    ['rivers', 'water-toggle', 'line', { 'line-color': '#348fbb', 'line-width': 3, 'line-opacity': 0.9 }],
  ]) {
    map.addSource(name, { type: 'geojson', data: localData(name), attribution: name === 'sports' ? '© OpenStreetMap contributors · Geofabrik extract, 26 Oct 2026' : 'Athens GIS open data' });
    map.addLayer({ id: name, type, source: name, layout: { visibility: layerVisibility(toggle) }, paint }, labelLayer);
  }
  map.addSource('parcels', { type: 'geojson', data: emptyFeatures(), attribution: 'Πηγή δεδομένων: Ν.Π.Δ. ΕΛΛΗΝΙΚΟ ΚΤΗΜΑΤΟΛΟΓΙΟ · 22 Oct 2026' });
  map.addLayer({ id: 'parcels-fill', type: 'fill', source: 'parcels', minzoom: 16,
    layout: { visibility: layerVisibility('parcels-toggle') }, paint: { 'fill-color': '#765d8d', 'fill-opacity': 0.035 } }, labelLayer);
  map.addLayer({ id: 'parcels-outline', type: 'line', source: 'parcels', minzoom: 16,
    layout: { visibility: layerVisibility('parcels-toggle') }, paint: { 'line-color': '#765d8d', 'line-width': 1.2, 'line-opacity': 0.8 } }, labelLayer);
  for (const [name, toggle, color, radius] of [
    ['civic-pois', 'civic-toggle', '#4d5e81', 5],
    ['landmarks', 'landmarks-toggle', '#9b5471', 7],
  ]) {
    map.addSource(name, { type: 'geojson', data: localData(name), attribution: 'Athens GIS / OpenStreetMap contributors' });
    map.addLayer({ id: name, type: 'circle', source: name, minzoom: 11,
      layout: { visibility: layerVisibility(toggle) },
      paint: { 'circle-color': color, 'circle-radius': radius, 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 },
    });
  }

  map.addLayer({
    id: 'walking-paths', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation',
    filter: ['all', ['==', ['get', 'class'], 'path'], ['in', ['get', 'subclass'], ['literal', ['path', 'footway', 'steps', 'pedestrian']]]],
    layout: { visibility: layerVisibility('walking-toggle'), 'line-cap': 'round' },
    paint: { 'line-color': '#a46a3f', 'line-width': 2.6, 'line-dasharray': [2, 1.4] },
  }, labelLayer);

  map.addLayer({
    id: 'main-roads', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation',
    filter: ['in', ['get', 'class'], ['literal', ['trunk', 'primary', 'secondary', 'tertiary']]],
    layout: { visibility: layerVisibility('roads-toggle'), 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#b06334', 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1.5, 16, 4], 'line-opacity': 0.84 },
  }, labelLayer);
  map.addLayer({
    id: 'cycleways', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation',
    filter: ['all', ['==', ['get', 'class'], 'path'], ['==', ['get', 'subclass'], 'cycleway']],
    layout: { visibility: layerVisibility('bike-toggle'), 'line-cap': 'round' },
    paint: { 'line-color': '#198e94', 'line-width': 4, 'line-dasharray': [2, 1] },
  }, labelLayer);
  map.addSource('cycleways-centre', { type: 'geojson', data: `${import.meta.env.BASE_URL}data/kifisia-cycleways-centre.geojson`, attribution: '© OpenStreetMap contributors' });
  map.addLayer({
    id: 'cycleways-centre', type: 'line', source: 'cycleways-centre', layout: { visibility: layerVisibility('bike-toggle'), 'line-cap': 'round' },
    paint: { 'line-color': '#198e94', 'line-width': 4, 'line-dasharray': [2, 1] },
  }, labelLayer);

  for (const [name, toggle] of [['works', 'works-toggle'], ['closures', 'closures-toggle']]) {
    const source = `municipal-${name}`;
    map.addSource(source, { type: 'geojson', data: emptyFeatures(), attribution: 'Municipality of Kifisia · public My Maps KML' });
    map.addLayer({ id: `${source}-points`, type: 'circle', source, filter: ['==', ['geometry-type'], 'Point'],
      layout: { visibility: layerVisibility(toggle) },
      paint: { 'circle-radius': 7, 'circle-color': name === 'works' ? '#be7945' : ['match', ['get', 'dateStatus'], 'current', '#a33c43', 'past', '#88948f', '#bc9a4b'],
        'circle-stroke-color': '#fffaf0', 'circle-stroke-width': 2 },
    });
    if (name === 'works') map.addLayer({ id: `${source}-lines`, type: 'line', source,
      filter: ['==', ['geometry-type'], 'LineString'], layout: { visibility: layerVisibility(toggle) },
      paint: { 'line-color': '#be7945', 'line-width': 4 },
    });
  }
  map.addSource('municipal-places', { type: 'geojson', data: emptyFeatures(), attribution: 'Municipality of Kifisia · published playgrounds and sports map' });
  map.addLayer({ id: 'municipal-places', type: 'circle', source: 'municipal-places',
    layout: { visibility: layerVisibility('municipal-places-toggle') },
    paint: { 'circle-radius': 7, 'circle-color': ['match', ['get', 'category'], 'Playground', '#dca953', 'Sports facility', '#b86a53', '#4d9868'],
      'circle-stroke-color': '#fffaf0', 'circle-stroke-width': 2 },
  });

  map.addSource('metro-line1', { type: 'geojson', data: localData('metro-line1'), attribution: 'Athens GIS · CC BY 4.0' });
  map.addLayer({ id: 'metro-line1', type: 'line', source: 'metro-line1',
    layout: { visibility: 'none' },
    paint: { 'line-color': '#a0444d', 'line-width': 4, 'line-opacity': 0.88 },
  }, labelLayer);
  map.addSource('metro-stations', { type: 'geojson', data: localData('metro-stations'), attribution: 'Athens GIS · CC BY 4.0' });
  map.addLayer({ id: 'metro-stations', type: 'circle', source: 'metro-stations',
    layout: { visibility: 'none' },
    paint: { 'circle-color': '#f8f6ec', 'circle-radius': 6, 'circle-stroke-color': '#a0444d', 'circle-stroke-width': 2.5 },
  });
  const trainIcon = document.createElement('button');
  trainIcon.type = 'button';
  trainIcon.className = 'rail-station-marker';
  trainIcon.setAttribute('aria-label', 'Kifissia Metro Line 1 station; view route and stops');
  trainIcon.innerHTML = '<svg class="rail-station-marker__icon" viewBox="0 0 40 24" aria-hidden="true"><path d="M2 4h15v13H2zM23 4h15v13H23zM17 12h6M1 22h38" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5 7h4v4H5zM11 7h4v4h-4zM26 7h4v4h-4zM32 7h4v4h-4z" fill="currentColor"/><circle cx="6" cy="19" r="1.7" fill="currentColor"/><circle cx="13" cy="19" r="1.7" fill="currentColor"/><circle cx="27" cy="19" r="1.7" fill="currentColor"/><circle cx="34" cy="19" r="1.7" fill="currentColor"/></svg><span class="rail-station-marker__name">M1 Kifissia</span>';
  const trainMarker = new maplibregl.Marker({ element: trainIcon, anchor: 'bottom' })
    .setLngLat(kifissiaStation).addTo(map);
  trainMarker.getElement().hidden = true;
  trainIcon.addEventListener('click', (event) => {
    event.stopPropagation();
    clearBusSelection();
    showRailStation(kifissiaStation, 'KIFISSIA');
  });
  void loadTrainModel();
  document.querySelector('#metro-toggle').addEventListener('change', (event) => {
    if (map.getLayer('train-model-hit')) map.setLayoutProperty('train-model-hit', 'visibility', event.target.checked ? 'visible' : 'none');
    if (trainModelLayer) { trainModelLayer.visible = event.target.checked; map.triggerRepaint(); }
    if (!event.target.checked) railPopup?.remove();
  });
  document.querySelector('#rail-network-button').addEventListener('click', (event) => {
    railNetworkVisible = !railNetworkVisible;
    for (const id of ['metro-line1', 'metro-stations']) map.setLayoutProperty(id, 'visibility', railNetworkVisible ? 'visible' : 'none');
    trainMarker.getElement().hidden = !railNetworkVisible;
    event.currentTarget.setAttribute('aria-pressed', String(railNetworkVisible));
    event.currentTarget.textContent = railNetworkVisible ? 'Hide rail network' : 'Show rail network ↗';
    if (railNetworkVisible) map.fitBounds([[23.778, 38.041], [23.815, 38.079]], { padding: 60, maxZoom: 14.5, pitch: 45, duration: 900 });
  });

  map.addSource('bus-network', { type: 'geojson', data: localData('bus-network'), attribution: 'OASA GTFS via athens-transit-rt · 8 Jul 2026' });
  map.addLayer({ id: 'bus-network', type: 'line', source: 'bus-network', layout: { visibility: 'none' },
    paint: { 'line-color': '#3085a1', 'line-width': 2, 'line-opacity': 0.66 } }, labelLayer);
  document.querySelector('#bus-network-button').addEventListener('click', (event) => {
    const visible = event.currentTarget.getAttribute('aria-pressed') !== 'true';
    map.setLayoutProperty('bus-network', 'visibility', visible ? 'visible' : 'none');
    event.currentTarget.setAttribute('aria-pressed', String(visible));
    event.currentTarget.textContent = visible ? 'Hide bus network' : 'Show bus network ↗';
    if (visible) map.fitBounds([[23.77, 38.059], [23.885, 38.123]], { padding: 45, maxZoom: 14, pitch: 45, duration: 900 });
  });

  map.addSource('selected-route', { type: 'geojson', data: emptyFeatures(), attribution: 'OASA GTFS via athens-transit-rt' });
  map.addLayer({
    id: 'selected-route-whole', type: 'line', source: 'selected-route', filter: ['==', ['get', 'kind'], 'whole'],
    paint: { 'line-color': '#355d72', 'line-width': 4, 'line-opacity': 0.58 },
  }, labelLayer);
  map.addLayer({
    id: 'selected-route-ahead', type: 'line', source: 'selected-route', filter: ['==', ['get', 'kind'], 'ahead'],
    paint: { 'line-color': '#22a7d0', 'line-width': 6, 'line-opacity': 0.96 },
  }, labelLayer);
  map.addSource('selected-route-stops', { type: 'geojson', data: emptyFeatures(), attribution: 'OASA GTFS via athens-transit-rt' });
  map.addLayer({
    id: 'selected-route-stops', type: 'circle', source: 'selected-route-stops',
    paint: { 'circle-radius': 5, 'circle-color': '#fff9e9', 'circle-stroke-color': '#176a89', 'circle-stroke-width': 2 },
  });

  map.addSource('bus-stops', { type: 'geojson', data: `${import.meta.env.BASE_URL}data/kifisia-bus-stops.geojson`, attribution: 'OASA stops via Athens GIS' });
  map.addLayer({
    id: 'bus-stops', type: 'circle', source: 'bus-stops', minzoom: 12,
    layout: { visibility: layerVisibility('stops-toggle') },
    paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 3, 16, 6], 'circle-color': '#f5f5ee', 'circle-stroke-color': '#214e74', 'circle-stroke-width': 2 },
  });
  map.addSource('traffic-lights', { type: 'geojson', data: localData('traffic-lights'), attribution: 'Athens GIS · mapped traffic signals' });
  map.addLayer({ id: 'traffic-lights', type: 'circle', source: 'traffic-lights', minzoom: 13,
    layout: { visibility: layerVisibility('signals-toggle') },
    paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 4, 17, 7],
      'circle-color': '#d6a84f', 'circle-stroke-color': '#694d29', 'circle-stroke-width': 1.5 } }, labelLayer);
  map.addSource('live-buses', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, attribution: 'OASA telematics via community feed' });
  map.addLayer({
    id: 'live-buses', type: 'circle', source: 'live-buses', layout: { visibility: layerVisibility('buses-toggle') },
    paint: { 'circle-radius': 10, 'circle-color': '#fff', 'circle-stroke-color': '#214e74', 'circle-stroke-width': 2 },
  });
  try {
    const busImage = await map.loadImage(`${import.meta.env.BASE_URL}bus-3d.png`);
    map.addImage('bus-3d', busImage.data);
    map.addLayer({
      id: 'live-bus-icon', type: 'symbol', source: 'live-buses',
      filter: ['has', 'heading'],
      layout: { visibility: layerVisibility('buses-toggle'), 'icon-image': 'bus-3d',
        'icon-size': ['interpolate', ['linear'], ['zoom'], 11, 0.08, 16, 0.22],
        'icon-anchor': 'center', 'icon-rotation-alignment': 'map', 'icon-pitch-alignment': 'viewport',
        'icon-rotate': ['get', 'heading'], 'icon-allow-overlap': true },
    });
    map.setFilter('live-buses', ['!', ['has', 'heading']]);
  } catch (error) {
    console.warn('Bus icon unavailable; showing position dots.', error);
  }
  map.addLayer({
    id: 'live-bus-labels', type: 'symbol', source: 'live-buses', layout: { visibility: layerVisibility('buses-toggle'), 'text-field': ['get', 'line'], 'text-size': 11, 'text-offset': [0, -3] },
    paint: { 'text-color': '#173a56', 'text-halo-color': '#fff', 'text-halo-width': 1.5 },
  });
  try {
    busModelLayer = createBusLayer(map);
    map.addLayer(busModelLayer, 'live-bus-labels');
    if (map.getLayer('live-bus-icon')) map.setLayoutProperty('live-bus-icon', 'visibility', 'none');
    busModelLayer.visible = document.querySelector('#buses-toggle').checked;
  } catch (error) {
    busModelLayer = null;
    console.warn('3D buses unavailable; showing directional map icons.', error);
  }
  try {
    trafficModelLayer = createTrafficLayer(map);
    map.addLayer(trafficModelLayer, 'live-bus-labels');
    if (document.querySelector('#traffic-toggle').checked) void loadTraffic();
  } catch (error) {
    document.querySelector('#traffic-status').textContent = 'Illustrative car layer unavailable.';
    console.warn('Illustrative traffic unavailable.', error);
  }
  map.addLayer({
    id: 'live-bus-hit', type: 'circle', source: 'live-buses',
    layout: { visibility: layerVisibility('buses-toggle') },
    paint: { 'circle-radius': 17, 'circle-opacity': 0, 'circle-stroke-opacity': 0 },
  }, 'live-bus-labels');
  if (document.querySelector('#buses-toggle').checked) refreshBuses();

  void loadGreenery();

  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/kifisia-boundary.geojson`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const boundary = await response.json();
    if (boundary?.features?.[0]?.geometry == null) throw new Error('Missing boundary geometry');
    map.addSource('municipality', { type: 'geojson', data: boundary });
    map.addLayer({
      id: 'municipality-halo', type: 'line', source: 'municipality',
      layout: { visibility: layerVisibility('boundary-toggle') },
      paint: { 'line-color': '#fff9e9', 'line-width': 5, 'line-opacity': 0.9 },
    });
    map.addLayer({
      id: 'municipality-line', type: 'line', source: 'municipality',
      layout: { visibility: layerVisibility('boundary-toggle') },
      paint: { 'line-color': '#254d3d', 'line-width': 2.2, 'line-dasharray': [3, 2] },
    });
    status.textContent = 'Kifisia municipality · open data';
    document.querySelector('#reset-view').addEventListener('click', () => {
      clearBusSelection();
      const bounds = new maplibregl.LngLatBounds();
      for (const ring of boundary.features[0].geometry.coordinates) {
        for (const point of ring) bounds.extend(point);
      }
      map.fitBounds(bounds, { padding: 48, pitch: 38, bearing: -22, duration: 1100 });
      document.querySelectorAll('.place').forEach((button) => button.classList.remove('is-active'));
    });
  } catch (error) {
    status.textContent = `Boundary unavailable: ${error.message}`;
  }
});

map.on('error', (event) => {
  if (event.error) status.textContent = `Map data unavailable: ${event.error.message}`;
});

async function loadGreenery() {
  const label = document.querySelector('#greenery-status');
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/kifisia-canopy-forms.geojson`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.features?.length) throw new Error('No canopy forms in dataset');
    map.addSource('canopy-forms', { type: 'geojson', data, attribution: 'Meta / WRI CHMv2 · CC BY 4.0; Copernicus Tree Cover Density 2024' });
    greeneryLayer = createGreeneryLayer(map, data.features);
    map.addLayer(greeneryLayer, 'kifisia-buildings');
    map.addLayer({ id: 'canopy-forms-hit', type: 'circle', source: 'canopy-forms', minzoom: 14,
      layout: { visibility: layerVisibility('greenery-toggle') },
      paint: { 'circle-radius': 10, 'circle-opacity': 0.01, 'circle-stroke-opacity': 0 },
    });
    greeneryLayer.visible = document.querySelector('#greenery-toggle').checked;
    label.textContent = 'Meta/WRI CHMv2 · 2019 local imagery · Copernicus cover 2024 · representative forms, approximate heights · zoom in';
  } catch (error) {
    label.textContent = `3D greenery unavailable: ${error.message}`;
  }
}

async function loadTrainModel() {
  try {
    const [line, stations] = await Promise.all(['metro-line1', 'metro-stations'].map((name) =>
      fetchJson(`${import.meta.env.BASE_URL}data/kifisia-${name}.geojson`)));
    const path = railPath(line, stations);
    map.addSource('train-anchor', { type: 'geojson', data: emptyFeatures() });
    trainModelLayer = createTrainLayer(map);
    map.addLayer(trainModelLayer, 'metro-stations');
    map.addLayer({ id: 'train-model-hit', type: 'circle', source: 'train-anchor', minzoom: 13,
      layout: { visibility: layerVisibility('metro-toggle') },
      paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 15, 20, 18, 42], 'circle-opacity': 0, 'circle-stroke-opacity': 0 },
    });
    trainModelLayer.visible = document.querySelector('#metro-toggle').checked;
    const update = () => {
      const trains = estimatedTrains(path);
      trainModelLayer.setTrains(trains);
      map.getSource('train-anchor').setData({ type: 'FeatureCollection', features: trains.map((train) => ({
        type: 'Feature', geometry: { type: 'Point', coordinates: train.coordinate },
        properties: { id: train.id, direction: train.direction, nextStation: train.nextStation },
      })) });
      document.querySelector('#train-status').textContent = `${trains.length} indicative trains on the Kifissia–Iraklio section · STASY frequency bands and station times. Positions are estimates, not live observations.`;
    };
    update();
    setInterval(update, 1000);
  } catch (error) {
    document.querySelector('#train-status').textContent = `Train estimates unavailable: ${error.message}`;
    console.warn('Estimated trains unavailable.', error);
  }
}

let trafficData;
async function loadTraffic() {
  if (!trafficModelLayer) return;
  trafficModelLayer.visible = document.querySelector('#traffic-toggle').checked;
  if (!trafficModelLayer.visible) {
    if (map.getLayer('kifisias-traffic')) map.setLayoutProperty('kifisias-traffic', 'visibility', 'none');
    map.triggerRepaint();
    return;
  }
  if (!trafficData) {
    try {
      trafficData = await fetchJson(`${import.meta.env.BASE_URL}data/kifisia-traffic-roads.geojson`);
      trafficModelLayer.setRoads(trafficData);
      map.addSource('kifisias-traffic', { type: 'geojson',
        data: { type: 'FeatureCollection', features: trafficData.features.filter((feature) => feature.properties.name === 'Κηφισίας') },
        attribution: 'OSM roads · Attica Traffic Police bulletin' });
      map.addLayer({ id: 'kifisias-traffic', type: 'line', source: 'kifisias-traffic',
        layout: { visibility: 'visible', 'line-cap': 'round' },
        paint: { 'line-color': '#89918f', 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 2, 16, 5], 'line-opacity': 0.5 },
      }, 'estimated-traffic');
    } catch (error) {
      document.querySelector('#traffic-status').textContent = `Illustrative traffic unavailable: ${error.message}`;
      return;
    }
  }
  let status = 'Police bulletin unavailable; cars use road-class estimates.';
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/kifisia-traffic-bulletin.json`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bulletin = await response.json();
    trafficModelLayer.setBulletin(bulletin);
    const updated = new Date(bulletin.updatedAt);
    if (!trafficModelLayer.bulletinIsFresh()) {
      status = `Police bulletin last updated ${updated.toLocaleString('en-GB', { timeZone: 'Europe/Athens' })} Athens time; too old to use.`;
    } else {
      const level = Math.max(bulletin.directions.northbound, bulletin.directions.southbound);
      const names = [null, 'clear', 'increased', 'very high'];
      map.setPaintProperty('kifisias-traffic', 'line-color', [null, '#2798bf', '#e9a23b', '#d5483a'][level]);
      map.setPaintProperty('kifisias-traffic', 'line-opacity', 0.9);
      map.setLayoutProperty('kifisias-traffic', 'visibility', 'visible');
      status = `Kifisias Avenue: north ${names[bulletin.directions.northbound]}, south ${names[bulletin.directions.southbound]} · police bulletin ${updated.toLocaleString('en-GB', { timeZone: 'Europe/Athens' })} Athens time. Avenue color and car speed use the more congested direction.`;
    }
  } catch (error) {
    trafficModelLayer.setBulletin(null);
    status = `Police bulletin unavailable (${error.message}); cars use road-class estimates.`;
  }
  if (!trafficModelLayer.bulletinIsFresh()) {
    map.setPaintProperty('kifisias-traffic', 'line-color', '#89918f');
    map.setPaintProperty('kifisias-traffic', 'line-opacity', 0.5);
  }
  trafficModelLayer.refresh();
  document.querySelector('#traffic-status').textContent = `${status} Gray avenue line means no recent bulletin. Other roads: estimated cars. No tracked car positions or traffic counts. Zoom 15+ for cars.`;
}
document.querySelector('#traffic-toggle').addEventListener('change', loadTraffic);
setInterval(() => { if (document.querySelector('#traffic-toggle').checked) void loadTraffic(); }, 10 * 60 * 1000);

function selectionDetails(title, detail, note) {
  const content = document.createElement('div');
  for (const [tag, className, value] of [['strong', 'selection__title', title], ['p', 'selection__detail', detail], ['p', 'selection__note', note]]) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = value;
    content.append(element);
  }
  return content;
}
function showSelection(title, detail, note) { selection.replaceChildren(selectionDetails(title, detail, note)); }

let buildingPopup;
function showBuilding(event, title, detail, note) {
  showSelection(title, detail, note);
  buildingPopup = new maplibregl.Popup({ className: 'building-popup', closeOnClick: false, maxWidth: '260px', offset: 12 })
    .setLngLat(event.lngLat)
    .setDOMContent(selectionDetails(title, detail, note))
    .addTo(map);
}

const municipalMaps = {
  works: '1M_gOxsDf7y683X9rL5yVtWjA2m77TKA',
  closures: '1f0j6totjS4ADJ_oxDgHQsXPUhYCPaRI',
};
async function loadMunicipalPlaces() {
  const status = document.querySelector('#municipal-places-status');
  status.textContent = 'Loading the municipality’s published facilities…';
  try {
    const response = await fetch('https://www.google.com/maps/d/kml?mid=12FXf5h2zso1dlE1_LVr4zNFh2_LoKLk&forcekml=1');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const xml = new DOMParser().parseFromString(await response.text(), 'application/xml');
    if (xml.getElementsByTagName('parsererror').length) throw new Error('Invalid KML');
    const features = [...xml.getElementsByTagName('Placemark')].flatMap((mark) => {
      const raw = mark.getElementsByTagName('Point')[0]?.getElementsByTagName('coordinates')[0]?.textContent?.trim();
      const coordinates = raw?.split(',').slice(0, 2).map(Number);
      if (!coordinates || coordinates.length !== 2 || coordinates.some((value) => !Number.isFinite(value))) return [];
      const name = mark.getElementsByTagName('name')[0]?.textContent?.trim() || 'Municipal facility';
      const category = name.includes('Παιδική Χαρά') ? 'Playground' : name.startsWith('Πάρκο') ? 'Park' : 'Sports facility';
      return [{ type: 'Feature', geometry: { type: 'Point', coordinates }, properties: { name, category } }];
    });
    if (!features.length) throw new Error('No facility points in published map');
    map.getSource('municipal-places').setData({ type: 'FeatureCollection', features });
    status.textContent = `${features.length} municipal facility points · source may change; verify access locally`;
  } catch (error) {
    map.getSource('municipal-places')?.setData(emptyFeatures());
    status.textContent = `Municipal facilities unavailable: ${error.message}`;
  }
}
function municipalFeatures(kml, name) {
  const xml = new DOMParser().parseFromString(kml, 'application/xml');
  if (xml.getElementsByTagName('parsererror').length) throw new Error('Invalid KML');
  const today = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Athens', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
  const dayNumber = (value) => {
    const [day, month, year] = value.split('/').map(Number);
    return Date.UTC(year, month - 1, day);
  };
  const features = [];
  for (const mark of xml.getElementsByTagName('Placemark')) {
    const geometry = mark.getElementsByTagName('Point')[0] || mark.getElementsByTagName('LineString')[0];
    const raw = geometry?.getElementsByTagName('coordinates')[0]?.textContent?.trim();
    if (!raw) continue;
    const points = raw.split(/\s+/).map((pair) => pair.split(',').slice(0, 2).map(Number));
    if (points.some(([lon, lat]) => !Number.isFinite(lon) || !Number.isFinite(lat))) continue;
    const title = mark.getElementsByTagName('name')[0]?.textContent?.trim() || 'Untitled notice';
    const html = mark.getElementsByTagName('description')[0]?.textContent || '';
    const description = new DOMParser().parseFromString(html.replace(/<br\s*\/?\s*>/gi, '\n'), 'text/html').body.textContent.trim().replace(/\s+/g, ' ');
    const category = [...mark.parentElement.children].find((child) => child.localName === 'name')?.textContent || 'Municipal work';
    const dates = title.match(/\d{1,2}\/\d{1,2}\/20\d{2}/g) || [];
    const dateStatus = !dates.length ? 'unverified'
      : dayNumber(dates.at(-1)) < dayNumber(today) ? 'past'
        : dayNumber(dates[0]) > dayNumber(today) ? 'upcoming' : 'current';
    features.push({ type: 'Feature', properties: { name: title, description, category, dateStatus },
      geometry: { type: geometry.localName, coordinates: geometry.localName === 'Point' ? points[0] : points } });
  }
  if (!features.length && name === 'works') throw new Error('No work features in published map');
  return features;
}
async function loadMunicipal(name) {
  const status = document.querySelector(`#${name}-status`);
  status.textContent = 'Loading the municipality’s published map…';
  try {
    const response = await fetch(`https://www.google.com/maps/d/kml?mid=${municipalMaps[name]}&forcekml=1`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const features = municipalFeatures(await response.text(), name);
    map.getSource(`municipal-${name}`).setData({ type: 'FeatureCollection', features });
    const checked = new Date().toLocaleTimeString('en-GB', { timeZone: 'Europe/Athens', hour: '2-digit', minute: '2-digit' });
    const current = features.filter((feature) => feature.properties.dateStatus === 'current').length;
    status.textContent = name === 'works'
      ? `${features.length} published features · checked ${checked} Athens time · verify project status at source`
      : `${current} current-date notices · ${features.length - current} past or undated · checked ${checked} Athens time`;
  } catch (error) {
    map.getSource(`municipal-${name}`)?.setData(emptyFeatures());
    status.textContent = `Municipal ${name} unavailable: ${error.message}`;
  }
}

const staticLines = new Map();
let busPopup;
let selectedBusRoute;
let routeRequest = 0;
let routeBoundsExpanded = false;

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
function staticLine(line) {
  if (!staticLines.has(line)) {
    const url = `https://angelospk.github.io/athens-transit-rt/static/v1/lines/${encodeURIComponent(line)}.json`;
    staticLines.set(line, fetchJson(url).catch((error) => { staticLines.delete(line); throw error; }));
  }
  return staticLines.get(line);
}
function clearBusSelection() {
  routeRequest++;
  const popup = busPopup;
  busPopup = null;
  popup?.remove();
  selectedBusRoute = null;
  map.getSource('selected-route')?.setData(emptyFeatures());
  map.getSource('selected-route-stops')?.setData(emptyFeatures());
  if (routeBoundsExpanded) { map.setMaxBounds(localBounds); routeBoundsExpanded = false; }
}
function drawBusRoute(selected) {
  const toLngLat = ([lat, lon]) => [lon, lat];
  const shape = selected.variant.shape.map(toLngLat);
  const ahead = [...(selected.vehicle.path || []), ...(selected.vehicle.path_beyond || [])].map(toLngLat);
  map.getSource('selected-route').setData({ type: 'FeatureCollection', features: [
    { type: 'Feature', properties: { kind: 'whole' }, geometry: { type: 'LineString', coordinates: shape } },
    ...(ahead.length > 1 ? [{ type: 'Feature', properties: { kind: 'ahead' }, geometry: { type: 'LineString', coordinates: ahead } }] : []),
  ] });
  map.getSource('selected-route-stops').setData({ type: 'FeatureCollection', features: selected.variant.stops.flatMap((id, order) => {
    const stop = selected.lineData.stops[id];
    return stop ? [{ type: 'Feature', properties: { name: stop.name, order: order + 1 }, geometry: { type: 'Point', coordinates: [stop.lon, stop.lat] } }] : [];
  }) });
}
function fitRoute(coordinates) {
  const bounds = new maplibregl.LngLatBounds();
  for (const point of coordinates) bounds.extend(point);
  map.setMaxBounds(null);
  routeBoundsExpanded = true;
  map.fitBounds(bounds, { padding: 65, maxZoom: 15, pitch: 40, duration: 1000 });
}
function busPopupContent(vehicle, variant, lineData, liveVehicle) {
  const content = document.createElement('div');
  const addText = (tag, className, value) => {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = value;
    content.append(element);
    return element;
  };
  addText('strong', 'selection__title', `Bus ${vehicle.line}`);
  addText('p', 'selection__detail', variant.headsign);
  if (liveVehicle?.trip_label) addText('p', 'route-popup__trip', liveVehicle.trip_label);
  const nextId = liveVehicle?.next_stop_id;
  const nextIndex = variant.stops.indexOf(nextId);
  addText('p', 'route-popup__next', nextIndex >= 0 ? `Next stop: ${lineData.stops[nextId]?.name || nextId}` : 'Next stop not confirmed by the live feed');
  const list = document.createElement('ol');
  list.className = 'route-popup__stops';
  for (const [index, id] of variant.stops.entries()) {
    const item = document.createElement('li');
    item.textContent = lineData.stops[id]?.name || `Stop ${id}`;
    if (nextIndex >= 0 && index < nextIndex) item.className = 'route-popup__passed';
    if (index === nextIndex) item.className = 'route-popup__current';
    list.append(item);
  }
  content.append(list);
  if (nextIndex >= 0) list.scrollTop = Math.max(0, nextIndex * 26 - 35);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'route-popup__view';
  button.textContent = 'View full route ↗';
  button.addEventListener('click', (event) => { event.stopPropagation(); fitRoute(variant.shape.map(([lat, lon]) => [lon, lat])); });
  content.append(button);
  addText('p', 'selection__note', 'Route and stops: OASA GTFS snapshot. Bright blue shows the live feed’s path ahead when available. Detours may differ.');
  return content;
}
async function selectBus(event, properties) {
  const vehicle = nearbyBuses.get(String(properties.id));
  if (!vehicle) return;
  const request = routeRequest;
  const loading = selectionDetails(`Bus ${vehicle.line}`, 'Loading route and stops…', 'Community OASA feed · last reported position');
  busPopup = new maplibregl.Popup({ className: 'route-popup', closeOnClick: false, maxWidth: '340px', offset: 16 })
    .setLngLat([vehicle.lon, vehicle.lat]).setDOMContent(loading).addTo(map);
  const popup = busPopup;
  popup.on('close', () => { if (busPopup === popup) clearBusSelection(); });
  showSelection(`Bus ${vehicle.line}`, 'Loading route and stops…', 'Community OASA feed');
  const [staticResult, liveResult] = await Promise.allSettled([
    staticLine(vehicle.line), fetchJson(`https://transit.haroldpoi.dev/v1/lines/${encodeURIComponent(vehicle.line)}`),
  ]);
  if (request !== routeRequest || busPopup !== popup) return;
  if (staticResult.status !== 'fulfilled') {
    const message = 'Route and stop data are unavailable right now.';
    popup.setDOMContent(selectionDetails(`Bus ${vehicle.line}`, message, 'Live position remains available.'));
    showSelection(`Bus ${vehicle.line}`, message, 'Live position remains available.');
    return;
  }
  const lineData = staticResult.value;
  const liveVehicle = liveResult.status === 'fulfilled'
    ? liveResult.value.vehicles?.find((item) => String(item.id) === String(vehicle.id)) : null;
  const variant = lineData.variants[liveVehicle?.variant || vehicle.variant];
  if (!variant?.shape?.length || !variant?.stops?.length) {
    popup.setDOMContent(selectionDetails(`Bus ${vehicle.line}`, 'This vehicle’s route variant is unavailable.', 'Live position remains available.'));
    return;
  }
  selectedBusRoute = { id: String(vehicle.id), vehicle, variant, lineData };
  drawBusRoute(selectedBusRoute);
  popup.setDOMContent(busPopupContent(vehicle, variant, lineData, liveVehicle));
  showSelection(`Bus ${vehicle.line}`, variant.headsign, `${variant.stops.length} ordered stops · community OASA route snapshot`);
}

let railPopup;
let railData;
async function showRailStation(coordinates, name) {
  railPopup?.remove();
  const popup = new maplibregl.Popup({ className: 'route-popup rail-popup', closeOnClick: false, maxWidth: '340px', offset: 16 })
    .setLngLat(coordinates).setDOMContent(selectionDetails(`M1 ${name}`, 'Loading stations…', 'Athens GIS · static rail data')).addTo(map);
  railPopup = popup;
  try {
    if (!railData) railData = Promise.all(['metro-stations', 'metro-line1'].map((part) =>
      fetchJson(`${import.meta.env.BASE_URL}data/kifisia-${part}.geojson`)));
    const [stations, line] = await railData;
    if (railPopup !== popup) return;
    const content = document.createElement('div');
    content.append(selectionDetails(`M1 ${name}`, 'Kifissia → Piraeus', 'Athens GIS · static route and stations; no live train position'));
    const list = document.createElement('ol');
    list.className = 'route-popup__stops';
    for (const station of stations.features) {
      const item = document.createElement('li');
      item.textContent = station.properties.name;
      if (station.properties.name === name) item.className = 'route-popup__current';
      list.append(item);
    }
    content.append(list);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'route-popup__view';
    button.textContent = 'View full route ↗';
    button.addEventListener('click', (event) => { event.stopPropagation(); fitRoute(line.features[0].geometry.coordinates.flat()); });
    content.append(button);
    popup.setDOMContent(content);
    showSelection(`M1 ${name}`, 'Kifissia → Piraeus · 24 stations', 'Athens GIS static data · no live train position');
  } catch {
    railData = null;
    if (railPopup === popup) popup.setDOMContent(selectionDetails(`M1 ${name}`, 'Station list unavailable.', 'Athens GIS data could not be loaded'));
  }
}

map.on('click', (event) => {
  buildingPopup?.remove();
  clearBusSelection();
  railPopup?.remove();
  const layers = ['live-bus-hit', 'live-bus-labels', 'live-bus-icon', 'live-buses', 'municipal-places', 'municipal-closures-points', 'municipal-works-points', 'municipal-works-lines', 'train-model-hit', 'metro-stations', 'bus-network', 'landmarks', 'civic-pois', 'traffic-lights', 'parcels-fill', 'sports', 'canopy-forms-hit', 'building-types', 'copernicus-buildings', 'arch-sites', 'playgrounds', 'parks', 'public-spaces', 'rivers', 'flood-100', 'contours', 'land-cover', 'bus-stops', 'cycleways-centre', 'kifisia-buildings'].filter((id) => map.getLayer(id));
  const hits = map.queryRenderedFeatures(event.point, { layers });
  const feature = layers.map((id) => hits.find((hit) => hit.layer.id === id)).find(Boolean);
  if (!feature) return;
  if (feature.layer.id === 'municipal-places') {
    showBuilding(event, feature.properties.name, feature.properties.category,
      'Municipality of Kifisia · published facility point. Check the municipal source for current access and activities.');
  } else if (feature.layer.id.startsWith('municipal-')) {
    const works = feature.layer.id.startsWith('municipal-works');
    showBuilding(event, feature.properties.name, works ? feature.properties.category : `${feature.properties.dateStatus} permit notice`,
      `${feature.properties.description || 'No description supplied'} · Municipality of Kifisia My Maps · check the source for changes`);
  } else if (feature.layer.id === 'train-model-hit') {
    showBuilding(event, `Estimated Line 1 train · toward ${feature.properties.direction}`, `Next station: ${feature.properties.nextStation}`,
      'Indicative position from STASY frequency bands and station travel times · not a live train location');
  } else if (feature.layer.id === 'metro-stations') {
    showRailStation(feature.geometry.coordinates, feature.properties.name);
  } else if (feature.layer.id === 'bus-network') {
    showBuilding(event, `Bus line ${feature.properties.line}`, feature.properties.headsign || 'Mapped route', 'OASA GTFS snapshot · 8 Jul 2026. Route may have changed.');
  } else if (['landmarks', 'civic-pois'].includes(feature.layer.id)) {
    showSelection(feature.properties.name, feature.properties.category, feature.layer.id === 'landmarks' ? 'Municipal attractions · coordinates from OpenStreetMap' : 'Athens GIS / OpenStreetMap · verify details at source');
  } else if (feature.layer.id === 'arch-sites') {
    showSelection(feature.properties.name || feature.properties.name_en || 'Mapped historic site', feature.properties.historic || 'Historic feature', 'Athens GIS archaeological-sites layer');
  } else if (['parks', 'playgrounds'].includes(feature.layer.id)) {
    showSelection(feature.properties.name || (feature.layer.id === 'parks' ? 'Mapped park' : 'Mapped playground'), feature.layer.id === 'parks' ? 'Park or public green space' : 'Playground', 'Athens GIS open data · mapped extent may be incomplete');
  } else if (feature.layer.id === 'public-spaces') {
    showBuilding(event, feature.properties.name || `Mapped ${feature.properties.category.toLowerCase()}`, feature.properties.category,
      'Athens GIS open data · access and ownership may be unverified');
  } else if (feature.layer.id === 'traffic-lights') {
    showBuilding(event, 'Mapped traffic light', 'Signal location', 'Athens GIS snapshot · 26 Oct 2026. No live signal phase or operating status.');
  } else if (feature.layer.id === 'parcels-fill') {
    showBuilding(event, `ΚΑΕΚ ${feature.properties.KAEK}`, `Source record date ${feature.properties.bLfSpnVr || 'unavailable'}`,
      'Πηγή δεδομένων: Ν.Π.Δ. ΕΛΛΗΝΙΚΟ ΚΤΗΜΑΤΟΛΟΓΙΟ · 22 Oct 2026 snapshot. Parcel identifier only; no ownership data.');
  } else if (feature.layer.id === 'sports') {
    showSelection(feature.properties.name || 'Mapped sports site', [feature.properties.facility, feature.properties.sport].filter(Boolean).join(' · '), 'OpenStreetMap snapshot · 26 Oct 2026. Facility access and availability may differ.');
  } else if (feature.layer.id === 'canopy-forms-hit') {
    showBuilding(event, 'Modeled canopy', `Approximate top height: ${feature.properties.height_m} m`,
      `Meta/WRI CHMv2 · 2019 local imagery; Copernicus tree cover 2024. Illustrative form, not an individual-tree record.`);
  } else if (feature.layer.id === 'building-types') {
    showBuilding(event, feature.properties.name || 'Tagged building', `${feature.properties.category} · OSM building=${feature.properties.building_type}`, 'OpenStreetMap snapshot · 26 Oct 2026. Building type is not verified current use.');
  } else if (feature.layer.id === 'copernicus-buildings') {
    showBuilding(event, 'Mapped building', `Approximate height: ${feature.properties.height_m} m`,
      `OSM footprint · ${feature.properties.basis}. Copernicus 2021 source cells are 10 m; heights are approximate.`);
  } else if (feature.layer.id === 'rivers') {
    showSelection('Mapped watercourse', feature.properties.name_en || 'Kifisos tributary', 'Athens GIS stream network · line does not describe flood risk');
  } else if (feature.layer.id === 'flood-100') {
    showSelection('Modeled 100-year flood zone', 'Official Attica flood-risk plan · first revision', 'Scenario extent, not a current flood or a prediction for this location');
  } else if (feature.layer.id === 'contours') {
    showSelection(`${feature.properties.elevation_m} m surface contour`, '20 m interval · derived from Copernicus 30 m DSM', 'Surface elevation includes canopy and buildings');
  } else if (feature.layer.id === 'land-cover') {
    showSelection(feature.properties.class_2021, '2021 land cover and land use', 'Athens GIS · mapped class, not parcel zoning');
  } else if (feature.layer.id === 'bus-stops') {
    showSelection(feature.properties.name || 'Bus stop', `Routes: ${feature.properties.route_ref || 'Not listed'}`, 'OASA stops via Athens GIS · published 21 Oct 2026');
  } else if (['live-bus-hit', 'live-bus-labels', 'live-bus-icon', 'live-buses'].includes(feature.layer.id)) {
    selectBus(event, feature.properties);
  } else if (feature.layer.id === 'cycleways-centre') {
    showSelection(feature.properties.name || 'Mapped bike facility', feature.properties.facility, 'OpenStreetMap way · Kifisia centre extract, 25 Oct 2026');
  } else {
    const height = Number(feature.properties.render_height);
    showBuilding(event, feature.properties.name || 'Mapped building', Number.isFinite(height) && height > 0 ? `Mapped height: ${height.toFixed(1)} m` : 'No mapped height available', 'OpenFreeMap / OpenMapTiles. Heights may be estimated.');
  }
});

map.on('mouseenter', 'kifisia-buildings', () => { map.getCanvas().style.cursor = 'pointer'; });
map.on('mouseleave', 'kifisia-buildings', () => { map.getCanvas().style.cursor = ''; });

document.querySelectorAll('.place').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.place').forEach((item) => item.classList.toggle('is-active', item === button));
    map.flyTo({ center: places[button.dataset.place], zoom: 15.1, pitch: 52, bearing: -22, duration: 1000 });
  });
});

const storyCard = document.querySelector('#story-card');
let storyMarker;
document.querySelectorAll('[data-story]').forEach((button) => button.addEventListener('click', () => {
  const story = stories[button.dataset.story];
  document.querySelector('#story-photo').src = `${import.meta.env.BASE_URL}stories/${story.photo}`;
  document.querySelector('#story-photo').alt = story.alt;
  document.querySelector('#story-era').textContent = story.era;
  document.querySelector('#story-title').textContent = story.title;
  document.querySelector('#story-copy').textContent = story.copy;
  document.querySelector('#story-source').href = story.source;
  const credit = document.querySelector('#story-credit');
  const photoLink = document.createElement('a');
  photoLink.href = story.photoPage;
  photoLink.target = '_blank';
  photoLink.rel = 'noopener noreferrer';
  photoLink.textContent = 'C messier';
  const licenseLink = document.createElement('a');
  licenseLink.href = 'https://creativecommons.org/licenses/by-sa/4.0/';
  licenseLink.target = '_blank';
  licenseLink.rel = 'noopener noreferrer';
  licenseLink.textContent = 'CC BY-SA 4.0';
  credit.replaceChildren('Photo ', photoLink, ` · ${story.photoYear} · `, licenseLink, ' · resized for the map');
  storyCard.hidden = false;
  storyMarker?.remove();
  storyMarker = new maplibregl.Marker({ color: '#9b5471' }).setLngLat(story.point).addTo(map);
  map.flyTo({ center: story.point, zoom: 16.7, pitch: 52, duration: 1000 });
}));
document.querySelector('#story-close').addEventListener('click', () => {
  storyCard.hidden = true;
  storyMarker?.remove();
});

function updateBuildings() {
  if (!map.getLayer('kifisia-buildings')) return;
  const enabled = document.querySelector('#buildings-toggle').checked;
  const copernicus = document.querySelector('#height-source').value === 'copernicus';
  map.setLayoutProperty('kifisia-buildings', 'visibility', enabled && !copernicus ? 'visible' : 'none');
  map.setLayoutProperty('copernicus-buildings', 'visibility', enabled && copernicus ? 'visible' : 'none');
  map.setLayoutProperty('building-types', 'visibility', enabled && !copernicus && document.querySelector('#types-toggle').checked ? 'visible' : 'none');
}
let copernicusData;
document.querySelector('#height-source').addEventListener('change', async (event) => {
  const note = document.querySelector('#height-status');
  if (event.target.value === 'copernicus' && !copernicusData) {
    note.textContent = 'Loading Copernicus 2021 building heights…';
    try {
      copernicusData = await fetchJson(`${import.meta.env.BASE_URL}data/kifisia-sun-buildings.geojson`);
      map.getSource('copernicus-buildings').setData(copernicusData);
      note.textContent = `${copernicusData.features.length.toLocaleString('en-US')} OSM footprints · Copernicus 2021, 10 m source cells · some heights assumed at 8 m.`;
    } catch (error) {
      note.textContent = `Copernicus heights unavailable: ${error.message}`;
      event.target.value = 'osm';
    }
  }
  updateBuildings();
});
document.querySelector('#buildings-toggle').addEventListener('change', updateBuildings);
document.querySelector('#types-toggle').addEventListener('change', updateBuildings);
document.querySelector('#greenery-toggle').addEventListener('change', (event) => {
  if (!greeneryLayer) return;
  greeneryLayer.visible = event.target.checked;
  map.setLayoutProperty('canopy-forms-hit', 'visibility', event.target.checked ? 'visible' : 'none');
  map.triggerRepaint();
});
document.querySelector('#basemap-select').addEventListener('change', (event) => {
  const satellite = event.target.value === 'satellite';
  if (map.getLayer('satellite')) map.setLayoutProperty('satellite', 'visibility', satellite ? 'visible' : 'none');
  document.querySelector('#imagery-credit').hidden = !satellite;
});

document.querySelector('#boundary-toggle').addEventListener('change', (event) => {
  for (const layer of ['municipality-halo', 'municipality-line']) {
    if (map.getLayer(layer)) map.setLayoutProperty(layer, 'visibility', event.target.checked ? 'visible' : 'none');
  }
});

for (const [input, layers] of [
  ['trees-toggle', ['tree-cover']], ['ndvi-toggle', ['ndvi']], ['roads-toggle', ['main-roads']],
  ['bike-toggle', ['cycleways', 'cycleways-centre']], ['stops-toggle', ['bus-stops']],
  ['landuse-toggle', ['land-cover']], ['dsm-toggle', ['dsm']], ['contours-toggle', ['contours']],
  ['flood-toggle', ['flood-100']], ['sports-toggle', ['sports']],
  ['parks-toggle', ['parks']], ['public-toggle', ['public-spaces']], ['playgrounds-toggle', ['playgrounds']], ['heritage-toggle', ['arch-sites']],
  ['water-toggle', ['rivers']], ['civic-toggle', ['civic-pois']], ['landmarks-toggle', ['landmarks']], ['signals-toggle', ['traffic-lights']],
  ['walking-toggle', ['walking-paths']],
]) {
  document.querySelector(`#${input}`).addEventListener('change', (event) => {
    for (const layer of layers) if (map.getLayer(layer)) map.setLayoutProperty(layer, 'visibility', event.target.checked ? 'visible' : 'none');
  });
}
for (const [input, other, layer] of [['ndvi-toggle', 'trees-toggle', 'tree-cover'], ['trees-toggle', 'ndvi-toggle', 'ndvi']]) {
  document.querySelector(`#${input}`).addEventListener('change', (event) => {
    if (!event.target.checked) return;
    document.querySelector(`#${other}`).checked = false;
    if (map.getLayer(layer)) map.setLayoutProperty(layer, 'visibility', 'none');
  });
}
let parcelData;
document.querySelector('#parcels-toggle').addEventListener('change', async (event) => {
  const visible = event.target.checked;
  for (const layer of ['parcels-fill', 'parcels-outline']) {
    if (map.getLayer(layer)) map.setLayoutProperty(layer, 'visibility', visible ? 'visible' : 'none');
  }
  if (!visible || !map.getSource('parcels')) return;
  const label = document.querySelector('#parcels-status');
  if (parcelData) return;
  label.textContent = 'Loading the Kifisia parcel snapshot…';
  try {
    parcelData = await fetchJson(`${import.meta.env.BASE_URL}data/kifisia-parcels.geojson`);
    map.getSource('parcels').setData(parcelData);
    label.textContent = `${parcelData.features.length.toLocaleString('en-US')} mapped parcels · visible from zoom 16`;
  } catch (error) {
    label.textContent = `Parcel data unavailable: ${error.message}`;
  }
});
map.on('load', () => {
  const toggle = document.querySelector('#parcels-toggle');
  if (toggle.checked) toggle.dispatchEvent(new Event('change'));
});
for (const name of ['works', 'closures']) {
  document.querySelector(`#${name}-toggle`).addEventListener('change', (event) => {
    const visibility = event.target.checked ? 'visible' : 'none';
    for (const id of [`municipal-${name}-points`, `municipal-${name}-lines`]) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visibility);
    }
    if (event.target.checked) loadMunicipal(name);
  });
}
document.querySelector('#municipal-places-toggle').addEventListener('change', (event) => {
  if (map.getLayer('municipal-places')) map.setLayoutProperty('municipal-places', 'visibility', event.target.checked ? 'visible' : 'none');
  if (event.target.checked) loadMunicipalPlaces();
});
setInterval(() => { if (document.querySelector('#closures-toggle').checked) loadMunicipal('closures'); }, 15 * 60 * 1000);

const busToggle = document.querySelector('#buses-toggle');
const busFeedStatus = document.querySelector('#bus-feed-status');
let nearbyBuses = new Map();
async function refreshBuses() {
  if (!busToggle.checked || !map.getSource('live-buses')) return;
  try {
    const response = await fetch('https://transit.haroldpoi.dev/v1/vehicles');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const feed = await response.json();
    const now = Date.now() / 1000;
    if (!Array.isArray(feed.vehicles) || now - feed.updated_at > 300) throw new Error('Feed is older than 5 minutes');
    const visibleVehicles = feed.vehicles.filter((bus) =>
      bus.lon >= 23.76 && bus.lon <= 23.89 && bus.lat >= 38.06 && bus.lat <= 38.13 &&
      now - bus.position_at <= 300 && bus.position_at <= now + 30
    );
    nearbyBuses = new Map(visibleVehicles.map((bus) => [String(bus.id), bus]));
    const features = visibleVehicles.map((bus) => ({
      type: 'Feature', geometry: { type: 'Point', coordinates: [bus.lon, bus.lat] },
      properties: { id: String(bus.id), line: bus.line, variant: bus.variant, position_at: bus.position_at,
        ...(Number.isFinite(bus.bearing) && bus.bearing >= 0 && bus.bearing < 360 ? { heading: bus.bearing } : {}) },
    }));
    map.getSource('live-buses').setData({ type: 'FeatureCollection', features });
    busModelLayer?.setVehicles(features);
    const selected = selectedBusRoute && nearbyBuses.get(selectedBusRoute.id);
    if (selected) {
      selectedBusRoute.vehicle = selected;
      selectedBusRoute.variant = selectedBusRoute.lineData.variants[selected.variant] || selectedBusRoute.variant;
      drawBusRoute(selectedBusRoute);
      busPopup?.setLngLat([selected.lon, selected.lat]);
      const currentSelection = selectedBusRoute;
      fetchJson(`https://transit.haroldpoi.dev/v1/lines/${encodeURIComponent(selected.line)}`)
        .then((data) => {
          if (selectedBusRoute !== currentSelection || !busPopup) return;
          const liveVehicle = data.vehicles?.find((item) => String(item.id) === String(selected.id));
          busPopup.setDOMContent(busPopupContent(selected, currentSelection.variant, currentSelection.lineData, liveVehicle));
        }).catch(() => {});
    } else if (selectedBusRoute) clearBusSelection();
    const time = new Date(feed.updated_at * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    busFeedStatus.textContent = `${features.length} recent positions · feed updated ${time} · community OASA source`;
  } catch (error) {
    nearbyBuses = new Map();
    clearBusSelection();
    map.getSource('live-buses').setData({ type: 'FeatureCollection', features: [] });
    busModelLayer?.setVehicles([]);
    busFeedStatus.textContent = `Live buses unavailable: ${error.message}`;
  }
}
busToggle.addEventListener('change', () => {
  const visibility = busToggle.checked ? 'visible' : 'none';
  for (const layer of ['live-buses', 'live-bus-hit', 'live-bus-labels']) if (map.getLayer(layer)) map.setLayoutProperty(layer, 'visibility', visibility);
  if (map.getLayer('live-bus-icon')) map.setLayoutProperty('live-bus-icon', 'visibility', busModelLayer ? 'none' : visibility);
  if (busModelLayer) { busModelLayer.visible = busToggle.checked; map.triggerRepaint(); }
  if (busToggle.checked) refreshBuses();
  else { clearBusSelection(); busFeedStatus.textContent = 'Community OASA feed · switch on to load positions'; }
});
setInterval(refreshBuses, 60000);
