import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';

maplibregl.setWorkerUrl(workerUrl);

const places = {
  kifisia: [23.8082244, 38.0736082],
  'nea-erythraia': [23.8173613, 38.0882121],
  ekali: [23.8425642, 38.1068395],
};

const status = document.querySelector('#map-status');
const selection = document.querySelector('#selection-content');
const map = new maplibregl.Map({
  container: 'map',
  style: 'https://tiles.openfreemap.org/styles/positron',
  center: places.kifisia,
  zoom: 15.1,
  pitch: 52,
  bearing: -22,
  maxBounds: [[23.71, 38.02], [23.94, 38.16]],
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
  map.addLayer({
    id: 'kifisia-buildings',
    type: 'fill-extrusion',
    source: 'openmaptiles',
    'source-layer': 'building',
    filter: ['!=', ['get', 'hide_3d'], true],
    minzoom: 13,
    paint: {
      'fill-extrusion-color': '#d0a681',
      'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 0],
      'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
      'fill-extrusion-opacity': 0.82,
    },
  }, labelLayer);

  map.addSource('tree-cover', {
    type: 'image',
    url: `${import.meta.env.BASE_URL}data/kifisia-tree-cover.png`,
    attribution: '<a href="https://land.copernicus.eu/">Copernicus Land Monitoring Service</a> · 2024, via Athens GIS',
    coordinates: [
      [23.7677541, 38.1225421], [23.8844901, 38.1225421],
      [23.8844901, 38.0604421], [23.7677541, 38.0604421],
    ],
  });
  map.addLayer({ id: 'tree-cover', type: 'raster', source: 'tree-cover', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.72 } }, 'kifisia-buildings');

  map.addLayer({
    id: 'main-roads', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation',
    filter: ['in', ['get', 'class'], ['literal', ['trunk', 'primary', 'secondary', 'tertiary']]],
    layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#b06334', 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1.5, 16, 4], 'line-opacity': 0.84 },
  }, labelLayer);
  map.addLayer({
    id: 'cycleways', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation',
    filter: ['all', ['==', ['get', 'class'], 'path'], ['==', ['get', 'subclass'], 'cycleway']],
    layout: { visibility: 'none', 'line-cap': 'round' },
    paint: { 'line-color': '#198e94', 'line-width': 4, 'line-dasharray': [2, 1] },
  }, labelLayer);
  map.addSource('cycleways-centre', { type: 'geojson', data: `${import.meta.env.BASE_URL}data/kifisia-cycleways-centre.geojson`, attribution: '© OpenStreetMap contributors' });
  map.addLayer({
    id: 'cycleways-centre', type: 'line', source: 'cycleways-centre', layout: { visibility: 'none', 'line-cap': 'round' },
    paint: { 'line-color': '#198e94', 'line-width': 4, 'line-dasharray': [2, 1] },
  }, labelLayer);

  map.addSource('bus-stops', { type: 'geojson', data: `${import.meta.env.BASE_URL}data/kifisia-bus-stops.geojson`, attribution: 'OASA stops via Athens GIS' });
  map.addLayer({
    id: 'bus-stops', type: 'circle', source: 'bus-stops', minzoom: 12,
    layout: { visibility: 'none' },
    paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 3, 16, 6], 'circle-color': '#f5f5ee', 'circle-stroke-color': '#214e74', 'circle-stroke-width': 2 },
  });
  map.addSource('live-buses', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, attribution: 'OASA telematics via community feed' });
  map.addLayer({
    id: 'live-buses', type: 'circle', source: 'live-buses', layout: { visibility: 'none' },
    paint: { 'circle-radius': 8, 'circle-color': '#214e74', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 },
  });
  map.addLayer({
    id: 'live-bus-labels', type: 'symbol', source: 'live-buses', layout: { visibility: 'none', 'text-field': ['get', 'line'], 'text-size': 11, 'text-offset': [0, -1.5] },
    paint: { 'text-color': '#173a56', 'text-halo-color': '#fff', 'text-halo-width': 1.5 },
  });

  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/kifisia-boundary.geojson`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const boundary = await response.json();
    if (boundary?.features?.[0]?.geometry == null) throw new Error('Missing boundary geometry');
    map.addSource('municipality', { type: 'geojson', data: boundary });
    map.addLayer({
      id: 'municipality-halo', type: 'line', source: 'municipality',
      paint: { 'line-color': '#fff9e9', 'line-width': 5, 'line-opacity': 0.9 },
    });
    map.addLayer({
      id: 'municipality-line', type: 'line', source: 'municipality',
      paint: { 'line-color': '#254d3d', 'line-width': 2.2, 'line-dasharray': [3, 2] },
    });
    status.textContent = 'Kifisia municipality · open data';
    document.querySelector('#reset-view').addEventListener('click', () => {
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

function showSelection(title, detail, note) {
  selection.replaceChildren();
  for (const [tag, className, value] of [['strong', 'selection__title', title], ['p', 'selection__detail', detail], ['p', 'selection__note', note]]) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = value;
    selection.append(element);
  }
}

map.on('click', (event) => {
  const layers = ['live-buses', 'bus-stops', 'cycleways-centre', 'kifisia-buildings'].filter((id) => map.getLayer(id));
  const feature = map.queryRenderedFeatures(event.point, { layers })[0];
  if (!feature) return;
  if (feature.layer.id === 'bus-stops') {
    showSelection(feature.properties.name || 'Bus stop', `Routes: ${feature.properties.route_ref || 'Not listed'}`, 'OASA stops via Athens GIS · published 21 Oct 2026');
  } else if (feature.layer.id === 'live-buses') {
    const time = new Date(Number(feature.properties.position_at) * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    showSelection(`Bus ${feature.properties.line}`, `Last position: ${time}`, 'Community OASA telematics feed · position may be delayed');
  } else if (feature.layer.id === 'cycleways-centre') {
    showSelection(feature.properties.name || 'Mapped bike facility', feature.properties.facility, 'OpenStreetMap way · Kifisia centre extract, 25 Oct 2026');
  } else {
    const height = Number(feature.properties.render_height);
    showSelection(feature.properties.name || 'Mapped building', Number.isFinite(height) && height > 0 ? `Mapped height: ${height.toFixed(1)} m` : 'No mapped height available', 'OpenFreeMap / OpenMapTiles. Heights may be estimated.');
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

document.querySelector('#buildings-toggle').addEventListener('change', (event) => {
  if (map.getLayer('kifisia-buildings')) {
    map.setLayoutProperty('kifisia-buildings', 'visibility', event.target.checked ? 'visible' : 'none');
  }
});

document.querySelector('#boundary-toggle').addEventListener('change', (event) => {
  for (const layer of ['municipality-halo', 'municipality-line']) {
    if (map.getLayer(layer)) map.setLayoutProperty(layer, 'visibility', event.target.checked ? 'visible' : 'none');
  }
});

for (const [input, layers] of [
  ['trees-toggle', ['tree-cover']], ['roads-toggle', ['main-roads']],
  ['bike-toggle', ['cycleways', 'cycleways-centre']], ['stops-toggle', ['bus-stops']],
]) {
  document.querySelector(`#${input}`).addEventListener('change', (event) => {
    for (const layer of layers) if (map.getLayer(layer)) map.setLayoutProperty(layer, 'visibility', event.target.checked ? 'visible' : 'none');
  });
}

const busToggle = document.querySelector('#buses-toggle');
const busFeedStatus = document.querySelector('#bus-feed-status');
async function refreshBuses() {
  if (!busToggle.checked || !map.getSource('live-buses')) return;
  try {
    const response = await fetch('https://transit.haroldpoi.dev/v1/vehicles');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const feed = await response.json();
    const now = Date.now() / 1000;
    if (!Array.isArray(feed.vehicles) || now - feed.updated_at > 300) throw new Error('Feed is older than 5 minutes');
    const features = feed.vehicles.filter((bus) =>
      bus.lon >= 23.76 && bus.lon <= 23.89 && bus.lat >= 38.06 && bus.lat <= 38.13 &&
      now - bus.position_at <= 300 && bus.position_at <= now + 30
    ).map((bus) => ({
      type: 'Feature', geometry: { type: 'Point', coordinates: [bus.lon, bus.lat] },
      properties: { line: bus.line, position_at: bus.position_at },
    }));
    map.getSource('live-buses').setData({ type: 'FeatureCollection', features });
    const time = new Date(feed.updated_at * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    busFeedStatus.textContent = `${features.length} recent positions · feed updated ${time} · community OASA source`;
  } catch (error) {
    map.getSource('live-buses').setData({ type: 'FeatureCollection', features: [] });
    busFeedStatus.textContent = `Live buses unavailable: ${error.message}`;
  }
}
busToggle.addEventListener('change', () => {
  const visibility = busToggle.checked ? 'visible' : 'none';
  for (const layer of ['live-buses', 'live-bus-labels']) if (map.getLayer(layer)) map.setLayoutProperty(layer, 'visibility', visibility);
  if (busToggle.checked) refreshBuses();
  else busFeedStatus.textContent = 'Community OASA feed · switch on to load positions';
});
setInterval(refreshBuses, 60000);
