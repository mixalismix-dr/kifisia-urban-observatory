import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hideTourForever, shouldShowTour } from '../src/tour.js';

test('tour opt-out persists across visits', () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  assert.equal(shouldShowTour(storage), true);
  hideTourForever(storage);
  assert.equal(shouldShowTour(storage), false);
});

test('tour remains dismissible when browser storage is unavailable', () => {
  const unavailable = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } };
  assert.equal(shouldShowTour(unavailable), true);
  assert.doesNotThrow(() => hideTourForever(unavailable));
});
