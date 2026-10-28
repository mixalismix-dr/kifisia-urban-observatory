import assert from 'node:assert/strict';
import { athensTime, shadowGeometry } from '../src/sun-preview.js';
import { railPath, estimatedTrains } from '../src/rail-estimates.js';
import { readFileSync } from 'node:fs';

for (const [file, geometry] of [
  ['kifisia-bus-stops.geojson', 'Point'],
  ['kifisia-bus-network.geojson', 'LineString'],
  ['kifisia-traffic-roads.geojson', 'LineString'],
  ['kifisia-metro-line1.geojson', 'MultiLineString'],
  ['kifisia-metro-stations.geojson', 'Point'],
  ['kifisia-cycleways-centre.geojson', 'LineString'],
  ['kifisia-rivers.geojson', ['LineString', 'MultiLineString']],
  ['kifisia-flood-100.geojson', ['Polygon', 'MultiPolygon']],
  ['kifisia-contours.geojson', 'LineString'],
  ['kifisia-parks.geojson', 'Polygon'],
  ['kifisia-public-spaces.geojson', 'Polygon'],
  ['kifisia-traffic-lights.geojson', 'Point'],
  ['kifisia-parcels.geojson', ['Polygon', 'MultiPolygon', 'GeometryCollection']],
  ['kifisia-playgrounds.geojson', 'Polygon'],
  ['kifisia-arch-sites.geojson', 'Polygon'],
  ['kifisia-building-types.geojson', ['Polygon', 'MultiPolygon']],
  ['kifisia-sports.geojson', ['Polygon', 'MultiPolygon']],
  ['kifisia-land-cover-2021.geojson', ['Polygon', 'MultiPolygon']],
  ['kifisia-civic-pois.geojson', 'Point'],
  ['kifisia-landmarks.geojson', 'Point'],
  ['kifisia-canopy-forms.geojson', 'Point'],
]) {
  const data = JSON.parse(readFileSync(new URL(`../public/data/${file}`, import.meta.url), 'utf8'));
  assert.equal(data.type, 'FeatureCollection');
  assert.ok(data.features.length > 0, `${file} has no features`);
  assert.ok(data.features.every((feature) => feature.geometry && [geometry].flat().includes(feature.geometry.type)), `${file} has unexpected geometry`);
}

const canopy = JSON.parse(readFileSync(new URL('../public/data/kifisia-canopy-forms.geojson', import.meta.url), 'utf8'));
assert.ok(canopy.features.length > 1000);
assert.ok(canopy.features.every(({ geometry, properties }) =>
  geometry.coordinates[0] > 23.76 && geometry.coordinates[0] < 23.89 &&
  geometry.coordinates[1] > 38.05 && geometry.coordinates[1] < 38.13 &&
  properties.height_m >= 5 && properties.height_m <= 30 &&
  properties.crown_radius_m >= 2 && properties.crown_radius_m <= 8));

const rail = JSON.parse(readFileSync(new URL('../public/data/kifisia-metro-line1.geojson', import.meta.url), 'utf8'));
const stations = JSON.parse(readFileSync(new URL('../public/data/kifisia-metro-stations.geojson', import.meta.url), 'utf8'));
const path = railPath(rail, stations);
assert.deepEqual(path.calls.slice(0, 3).map((call) => call.name), ['KIFISSIA', 'KAT', 'MAROUSSI']);
const trains = estimatedTrains(path, new Date('2026-10-28T05:30:00Z'));
assert.ok(trains.length > 0 && trains.every((train) => train.coordinate.every(Number.isFinite) &&
  ['Piraeus', 'Kifissia'].includes(train.direction) && train.nextStation));
const roads = JSON.parse(readFileSync(new URL('../public/data/kifisia-traffic-roads.geojson', import.meta.url), 'utf8'));
assert.ok(roads.features.length > 2000 && roads.features.every((feature) => feature.properties.highway));
const busNetwork = JSON.parse(readFileSync(new URL('../public/data/kifisia-bus-network.geojson', import.meta.url), 'utf8'));
assert.ok(new Set(busNetwork.features.map((feature) => feature.properties.line)).size >= 20);
const [terminal, nextRailPoint] = rail.features[0].geometry.coordinates[0];
assert.ok(Math.abs(terminal[0] - 23.808219792) < 0.001 && Math.abs(terminal[1] - 38.073395087) < 0.001,
  'Line 1 must start at Kifissia for the train model');
assert.ok(nextRailPoint[1] < terminal[1], 'Line 1 must point south from Kifissia');

const search = JSON.parse(readFileSync(new URL('../public/data/kifisia-search.json', import.meta.url), 'utf8'));
assert.ok(search.length > 1000);
assert.ok(search.some((item) => item.kind === 'Street') && search.some((item) => item.kind === 'Mapped address'));
assert.ok(search.every((item) => item.name && item.point.length === 2 &&
  item.point[0] >= 23.76 && item.point[0] <= 23.89 && item.point[1] >= 38.05 && item.point[1] <= 38.13));
const sunBuildings = JSON.parse(readFileSync(new URL('../public/data/kifisia-sun-buildings.geojson', import.meta.url), 'utf8')).features;
assert.ok(sunBuildings.length > 17000 && sunBuildings.every((feature) => feature.properties.height_m > 0));
assert.ok(sunBuildings.filter((feature) => feature.properties.basis === 'Athens GIS 2021').length > 15000);
const parcels = JSON.parse(readFileSync(new URL('../public/data/kifisia-parcels.geojson', import.meta.url), 'utf8')).features;
assert.ok(parcels.length > 19000 && parcels.every((feature) => /^[0-9ΕΚ]{12}$/.test(feature.properties.KAEK)));
assert.ok(parcels.filter((feature) => feature.geometry.type === 'GeometryCollection').every((feature) =>
  feature.geometry.geometries.some((geometry) => geometry.type === 'Polygon')));
assert.equal(JSON.parse(readFileSync(new URL('../public/data/kifisia-public-spaces.geojson', import.meta.url), 'utf8')).features.length, 176);
assert.equal(JSON.parse(readFileSync(new URL('../public/data/kifisia-traffic-lights.geojson', import.meta.url), 'utf8')).features.length, 92);

assert.equal(athensTime('2026-01-15', 12).toISOString(), '2026-01-15T10:00:00.000Z');
assert.equal(athensTime('2026-07-15', 12).toISOString(), '2026-07-15T09:00:00.000Z');
const square = { type: 'Polygon', coordinates: [[[23.8, 38.07], [23.8001, 38.07], [23.8001, 38.0701], [23.8, 38.0701], [23.8, 38.07]]] };
const westShadow = shadowGeometry(square, 10, 90, 45);
assert.ok(Math.min(...westShadow.coordinates[0][0].map((point) => point[0])) < 23.8);
assert.equal(shadowGeometry(square, 10, 90, 0), null);
for (const photo of ['alsos', 'goulandris', 'kazouli']) {
  const jpeg = readFileSync(new URL(`../public/stories/${photo}.jpg`, import.meta.url));
  assert.equal(jpeg.subarray(0, 3).toString('hex'), 'ffd8ff');
}

for (const file of ['data/kifisia-tree-cover.png', 'data/kifisia-ndvi.png', 'data/kifisia-dsm.png', 'bus-3d.png']) {
  const png = readFileSync(new URL(`../public/${file}`, import.meta.url));
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.ok(png.readUInt32BE(16) > 100 && png.readUInt32BE(20) > 100);
}
console.log('Prepared map data is present and readable.');
