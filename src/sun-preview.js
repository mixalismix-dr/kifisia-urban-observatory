import * as SunCalc from 'suncalc';

const rad = Math.PI / 180;
const empty = { type: 'FeatureCollection', features: [] };

// A date and hour in Athens must describe the same instant for visitors in any time zone.
export function athensTime(day, hour) {
  const noon = new Date(`${day}T12:00:00Z`);
  const part = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Athens', timeZoneName: 'shortOffset' })
    .formatToParts(noon).find((item) => item.type === 'timeZoneName')?.value;
  const offset = Number(/GMT\+(\d+)/.exec(part)?.[1]);
  if (!Number.isFinite(offset)) throw new Error('Athens time zone unavailable');
  return new Date(Date.parse(`${day}T${String(hour).padStart(2, '0')}:00:00Z`) - offset * 3600000);
}

const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
function hull(points) {
  const sorted = points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const lower = [];
  for (const point of sorted) {
    while (lower.length > 1 && cross(lower.at(-2), lower.at(-1), point) <= 0) lower.pop();
    lower.push(point);
  }
  const upper = [];
  for (const point of [...sorted].reverse()) {
    while (upper.length > 1 && cross(upper.at(-2), upper.at(-1), point) <= 0) upper.pop();
    upper.push(point);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

export function shadowGeometry(geometry, height, azimuth, altitude) {
  if (!Number.isFinite(height) || height <= 0 || altitude <= 5) return null;
  const distance = Math.min(60, height / Math.tan(altitude * rad));
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  const shadows = [];
  for (const polygon of polygons) {
    const ring = polygon[0];
    if (!ring || ring.length < 4) continue;
    const lat = ring[0][1];
    const dx = -Math.sin(azimuth * rad) * distance / (111320 * Math.cos(lat * rad));
    const dy = -Math.cos(azimuth * rad) * distance / 111320;
    const outline = hull([...ring.slice(0, -1), ...ring.slice(0, -1).map(([x, y]) => [x + dx, y + dy])]);
    if (outline.length > 2) shadows.push([[...outline, outline[0]]]);
  }
  return shadows.length ? { type: 'MultiPolygon', coordinates: shadows } : null;
}

export function setupSunPreview(map) {
  const toggle = document.querySelector('#sun-toggle');
  const controls = document.querySelector('#sun-controls');
  const day = document.querySelector('#sun-date');
  const hour = document.querySelector('#sun-hour');
  const label = document.querySelector('#sun-hour-label');
  const status = document.querySelector('#sun-status');
  day.value = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  map.addSource('sun-shadows', { type: 'geojson', data: empty,
    attribution: '© OpenStreetMap contributors; Copernicus Urban Atlas Building Block Height 2021' });
  map.addLayer({ id: 'sun-shadows', type: 'fill', source: 'sun-shadows', layout: { visibility: 'none' },
    paint: { 'fill-color': '#34465c', 'fill-opacity': 0.24 } }, 'kifisia-buildings');

  let position;
  let scheduled = false;
  let buildings;
  const update = () => {
    scheduled = false;
    if (!toggle.checked || !position) return;
    if (position.altitude <= 5) {
      map.getSource('sun-shadows').setData(empty);
      status.textContent = 'Sun below or near the horizon; shadow preview paused.';
      return;
    }
    if (map.getZoom() < 16) {
      map.getSource('sun-shadows').setData(empty);
      status.textContent = 'Zoom in to see modeled building shadows.';
      return;
    }
    if (!buildings) {
      status.textContent = 'Loading mapped building footprints…';
      return;
    }
    const view = map.getBounds();
    const features = [];
    for (const building of buildings) {
      const [west, south, east, north] = building.bbox;
      if (east < view.getWest() || west > view.getEast() || north < view.getSouth() || south > view.getNorth()) continue;
      const height = building.properties.height_m;
      const geometry = building.geometry;
      const shadow = shadowGeometry(geometry, height, position.azimuth, position.altitude);
      if (shadow) features.push({ type: 'Feature', geometry: shadow, properties: {} });
    }
    map.getSource('sun-shadows').setData({ type: 'FeatureCollection', features });
    status.textContent = features.length ? `${features.length} building shadows modeled in view` : 'No mapped buildings in view';
  };
  const schedule = () => {
    if (scheduled || !toggle.checked) return;
    scheduled = true;
    requestAnimationFrame(update);
  };
  const chooseTime = () => {
    label.textContent = `${String(hour.value).padStart(2, '0')}:00 Athens`;
    if (!day.value) return;
    const center = map.getCenter();
    position = SunCalc.getPosition(athensTime(day.value, Number(hour.value)), center.lat, center.lng);
    map.setLight({ anchor: 'map', position: [1.15, position.azimuth, 90 - Math.max(position.altitude, 0)], intensity: 0.55 });
    schedule();
  };
  toggle.addEventListener('change', () => {
    controls.hidden = !toggle.checked;
    map.setLayoutProperty('sun-shadows', 'visibility', toggle.checked ? 'visible' : 'none');
    if (toggle.checked) {
      chooseTime();
      if (!buildings) fetch(`${import.meta.env.BASE_URL}data/kifisia-sun-buildings.geojson`)
        .then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
        .then((data) => {
          buildings = data.features.map((feature) => {
            const points = (feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates)
              .flatMap((polygon) => polygon[0]);
            return { ...feature, bbox: [Math.min(...points.map((p) => p[0])), Math.min(...points.map((p) => p[1])),
              Math.max(...points.map((p) => p[0])), Math.max(...points.map((p) => p[1]))] };
          });
          schedule();
        }).catch(() => { status.textContent = 'Building footprint data unavailable.'; });
    }
    else map.setLight({ anchor: 'viewport', position: [1.15, 210, 30], intensity: 0.5 });
  });
  day.addEventListener('change', chooseTime);
  hour.addEventListener('input', chooseTime);
  map.on('moveend', schedule);
}
