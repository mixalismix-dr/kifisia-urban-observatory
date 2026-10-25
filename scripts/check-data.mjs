import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

for (const [file, geometry] of [
  ['kifisia-bus-stops.geojson', 'Point'],
  ['kifisia-cycleways-centre.geojson', 'LineString'],
]) {
  const data = JSON.parse(readFileSync(new URL(`../public/data/${file}`, import.meta.url), 'utf8'));
  assert.equal(data.type, 'FeatureCollection');
  assert.ok(data.features.length > 0, `${file} has no features`);
  assert.ok(data.features.every((feature) => feature.geometry?.type === geometry));
}

const png = readFileSync(new URL('../public/data/kifisia-tree-cover.png', import.meta.url));
assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
assert.ok(png.readUInt32BE(16) > 100 && png.readUInt32BE(20) > 100);
console.log('Prepared map data is present and readable.');
