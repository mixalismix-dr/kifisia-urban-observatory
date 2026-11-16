import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBasemapLabelStyler } from '../src/basemap-labels.js';

test('imagery labels gain contrast and street labels regain their original paint', () => {
  const changes = [];
  const map = {
    getStyle: () => ({ layers: [
      { id: 'highway-name-minor', type: 'symbol', paint: { 'text-color': '#666', 'text-halo-width': 1 } },
      { id: 'label_city', type: 'symbol', paint: { 'text-color': '#000', 'text-halo-color': '#fff', 'text-halo-width': 1 } },
      { id: 'water_name_point_label', type: 'symbol', paint: { 'text-color': '#495e91' } },
      { id: 'highway-shield-non-us', type: 'symbol', paint: { 'text-color': '#333' } },
    ] }),
    setPaintProperty: (...change) => changes.push(change),
  };
  const style = createBasemapLabelStyler(map);
  style(true);
  assert.deepEqual(changes.slice(0, 3), [
    ['highway-name-minor', 'text-color', '#ffffff'],
    ['highway-name-minor', 'text-halo-color', 'rgba(0,0,0,0.75)'],
    ['highway-name-minor', 'text-halo-width', 1.2],
  ]);
  assert.equal(changes.length, 6);
  style(false);
  assert.deepEqual(changes.slice(6, 9), [
    ['highway-name-minor', 'text-color', '#666'],
    ['highway-name-minor', 'text-halo-color', null],
    ['highway-name-minor', 'text-halo-width', 1],
  ]);
  assert.equal(changes.length, 12);
});
