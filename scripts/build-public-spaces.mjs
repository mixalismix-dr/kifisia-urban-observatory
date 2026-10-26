import { readFileSync, writeFileSync } from 'node:fs';

const read = (path) => JSON.parse(readFileSync(path, 'utf8')).features;
const sources = [
  ['public/data/kifisia-parks.geojson', 'Park'],
  ['public/data/kifisia-playgrounds.geojson', 'Playground'],
  ['scripts/downloads/kifisia-gardens.geojson', 'Garden or square'],
];
const features = sources.flatMap(([path, category]) => read(path).map(({ geometry, properties }) => ({
  type: 'Feature', geometry,
  properties: { name: properties.name || null, category },
})));
writeFileSync('public/data/kifisia-public-spaces.geojson', JSON.stringify({ type: 'FeatureCollection', features }));
console.log(`${features.length} mapped park, playground, and garden areas`);
