import { readFileSync, writeFileSync } from 'node:fs';

const stops = JSON.parse(readFileSync('public/data/kifisia-bus-stops.geojson', 'utf8')).features;
const lines = [...new Set(stops.flatMap(({ properties }) => (properties.route_ref || '').split(';').map((s) => s.trim()).filter(Boolean)))].sort();
const bounds = [23.767, 38.059, 23.886, 38.124];
const inside = ([lon, lat]) => lon >= bounds[0] && lon <= bounds[2] && lat >= bounds[1] && lat <= bounds[3];
const index = await fetch('https://angelospk.github.io/athens-transit-rt/static/v1/lines.json').then((r) => r.json());
const features = [];
const missing = [];
for (const line of lines) {
  const response = await fetch(`https://angelospk.github.io/athens-transit-rt/static/v1/lines/${encodeURIComponent(line)}.json`);
  if (!response.ok) { missing.push(line); continue; }
  const data = await response.json();
  const seen = new Set();
  for (const variant of Object.values(data.variants || {})) {
    const coordinates = variant.shape?.map(([lat, lon]) => [lon, lat]) || [];
    const key = JSON.stringify(coordinates);
    if (seen.has(key)) continue;
    seen.add(key);
    let part = [];
    for (const point of [...coordinates, null]) {
      if (point && inside(point)) { part.push(point); continue; }
      if (part.length > 1) features.push({ type: 'Feature', properties: { line, headsign: variant.headsign }, geometry: { type: 'LineString', coordinates: part } });
      part = [];
    }
  }
}
if (missing.length || features.length < 20) throw new Error(`Bus network incomplete: ${missing.join(', ')}; ${features.length} route parts`);
writeFileSync('public/data/kifisia-bus-network.geojson', JSON.stringify({ type: 'FeatureCollection', features }));
console.log(`${features.length} route parts for ${lines.length} lines · OASA GTFS ${index.gtfs_version}`);
