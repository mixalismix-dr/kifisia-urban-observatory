import { readFileSync, writeFileSync } from 'node:fs';

const read = (name) => JSON.parse(readFileSync(`scripts/downloads/kifisia-${name}.geojson`, 'utf8')).features;
const sources = [
  ['schools', 'School', (p) => p['Ονομα']],
  ['hospitals', 'Hospital', (p) => p.name || p.name_en],
  ['police', 'Police', (p) => p.name || p.name_en],
  ['cinemas', 'Cinema', (p) => p.name || p.name_en],
  ['theater', 'Theatre', (p) => p.name || p.name_en],
];
const features = sources.flatMap(([file, category, title]) => read(file)
  .filter((feature) => feature.geometry?.type === 'Point')
  .map((feature) => ({ type: 'Feature', geometry: feature.geometry,
    properties: { name: title(feature.properties) || category, category } })));
features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [23.8146707, 38.0772913] },
  properties: { name: 'Kifisia Town Hall', category: 'Municipal office' } });
writeFileSync('public/data/kifisia-civic-pois.geojson', JSON.stringify({ type: 'FeatureCollection', features }));

const landmarks = [
  ['Goulandris Natural History Museum', 23.8146485, 38.0743683, 'Museum'],
  ['Villa Kazouli', 23.8102896, 38.0675885, 'Historic villa'],
  ['Agios Dimitrios of Kifisia', 23.8122606, 38.0700641, 'Church'],
];
writeFileSync('public/data/kifisia-landmarks.geojson', JSON.stringify({
  type: 'FeatureCollection', features: landmarks.map(([name, lon, lat, category]) => ({
    type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties: { name, category },
  })),
}));
