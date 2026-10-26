import { readFileSync, writeFileSync } from 'node:fs';

// Input is the municipal clip of Geofabrik Greece's OpenStreetMap PBF.
const input = JSON.parse(readFileSync('scripts/downloads/kifisia-tagged-clipped.geojson', 'utf8'));
const categories = new Map([
  ...['house', 'detached', 'apartments', 'residential'].map((tag) => [tag, 'Residential']),
  ...['school', 'kindergarten', 'hospital', 'public', 'government'].map((tag) => [tag, 'Civic & health']),
  ...['commercial', 'retail', 'office', 'hotel', 'restaurant'].map((tag) => [tag, 'Business']),
  ...['church', 'chapel'].map((tag) => [tag, 'Worship']),
  ...['industrial', 'manufacture'].map((tag) => [tag, 'Industrial']),
  ...['carport', 'roof', 'garage'].map((tag) => [tag, 'Ancillary']),
]);
const sportTags = new Set(['pitch', 'stadium', 'sports_centre', 'sports_hall', 'track', 'fitness_centre']);
const buildings = [];
const sports = [];
for (const feature of input.features) {
  const p = feature.properties;
  const category = categories.get(p.building);
  if (category) {
    const levels = Number(p.other_tags?.['building:levels']);
    const taggedHeight = Number(p.other_tags?.height?.replace?.(' m', ''));
    buildings.push({ type: 'Feature', geometry: feature.geometry, properties: {
      name: p.name || null, building_type: p.building, category,
      height_m: Number.isFinite(taggedHeight) && taggedHeight > 0 ? taggedHeight : Number.isFinite(levels) && levels > 0 ? Math.min(levels * 3, 60) : 5,
      osm_id: p.osm_way_id || p.osm_id,
    } });
  }
  if (sportTags.has(p.leisure)) {
    sports.push({ type: 'Feature', geometry: feature.geometry, properties: {
      name: p.name || null, facility: p.leisure.replaceAll('_', ' '), sport: p.sport || null,
      osm_id: p.osm_way_id || p.osm_id,
    } });
  }
}
for (const [name, features] of [['building-types', buildings], ['sports', sports]]) {
  writeFileSync(`public/data/kifisia-${name}.geojson`, JSON.stringify({ type: 'FeatureCollection', features }));
  console.log(`${name}: ${features.length}`);
}
