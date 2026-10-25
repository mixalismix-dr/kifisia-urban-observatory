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

map.on('click', (event) => {
  if (!map.getLayer('kifisia-buildings')) return;
  const building = map.queryRenderedFeatures(event.point, { layers: ['kifisia-buildings'] })[0];
  if (!building) return;

  const name = building.properties.name || 'Mapped building';
  const height = Number(building.properties.render_height);
  selection.replaceChildren();
  const title = document.createElement('strong');
  title.className = 'selection__title';
  title.textContent = name;
  selection.append(title);

  const detail = document.createElement('p');
  detail.className = 'selection__detail';
  detail.textContent = Number.isFinite(height) && height > 0
    ? `Mapped height: ${height.toFixed(1)} m`
    : 'No mapped height available';
  selection.append(detail);

  const note = document.createElement('p');
  note.className = 'selection__note';
  note.textContent = 'OpenFreeMap / OpenMapTiles. Map heights may be estimated or simplified.';
  selection.append(note);
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
