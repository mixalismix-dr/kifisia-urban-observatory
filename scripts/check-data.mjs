import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

for (const [file, geometry] of [
  ['kifisia-bus-stops.geojson', 'Point'],
  ['kifisia-metro-line1.geojson', 'MultiLineString'],
  ['kifisia-metro-stations.geojson', 'Point'],
  ['kifisia-cycleways-centre.geojson', 'LineString'],
  ['kifisia-rivers.geojson', ['LineString', 'MultiLineString']],
  ['kifisia-flood-100.geojson', ['Polygon', 'MultiPolygon']],
  ['kifisia-contours.geojson', 'LineString'],
  ['kifisia-parks.geojson', 'Polygon'],
  ['kifisia-playgrounds.geojson', 'Polygon'],
  ['kifisia-arch-sites.geojson', 'Polygon'],
  ['kifisia-building-types.geojson', ['Polygon', 'MultiPolygon']],
  ['kifisia-sports.geojson', ['Polygon', 'MultiPolygon']],
  ['kifisia-land-cover-2021.geojson', ['Polygon', 'MultiPolygon']],
  ['kifisia-civic-pois.geojson', 'Point'],
  ['kifisia-landmarks.geojson', 'Point'],
]) {
  const data = JSON.parse(readFileSync(new URL(`../public/data/${file}`, import.meta.url), 'utf8'));
  assert.equal(data.type, 'FeatureCollection');
  assert.ok(data.features.length > 0, `${file} has no features`);
  assert.ok(data.features.every((feature) => feature.geometry && [geometry].flat().includes(feature.geometry.type)), `${file} has unexpected geometry`);
}

for (const file of ['data/kifisia-tree-cover.png', 'data/kifisia-dsm.png', 'bus-3d.png']) {
  const png = readFileSync(new URL(`../public/${file}`, import.meta.url));
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.ok(png.readUInt32BE(16) > 100 && png.readUInt32BE(20) > 100);
}
console.log('Prepared map data is present and readable.');
