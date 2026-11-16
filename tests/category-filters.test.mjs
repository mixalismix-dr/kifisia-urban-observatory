import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { sportsCategories, civicCategories, categoryFilter } from '../src/category-filters.js';

test('every mapped sports and civic feature belongs to one filter category', () => {
  for (const [layer, categories, file] of [
    ['sports', sportsCategories, 'sports'], ['civic-pois', civicCategories, 'civic-pois'],
  ]) {
    const features = JSON.parse(readFileSync(new URL(`../public/data/kifisia-${file}.geojson`, import.meta.url))).features;
    for (const { properties } of features) {
      const matches = categories.filter(([value]) => {
        const [, [, property], [, values]] = categoryFilter(layer, value);
        return values.includes(properties[property]);
      });
      assert.equal(matches.length, 1, `${layer}: ${JSON.stringify(properties)}`);
    }
  }
});
