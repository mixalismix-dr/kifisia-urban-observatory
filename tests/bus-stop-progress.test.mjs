import assert from 'node:assert/strict';
import test from 'node:test';
import { busStopProgress } from '../src/bus-stop-progress.js';

test('remaining stop estimates follow the selected vehicle and repeated terminal stop', () => {
  const variant = { stops: ['A', 'B', 'A'] };
  const run = {
    sources: [{ id: 'oasa', state: 'ok', updated_at: 1000 }],
    run: { vehicle: 'oasa:42', stops: [
      { stop: 'oasa:A', passed: true },
      { stop: 'oasa:B', passed: false, at: 1120, source: 'live' },
      { stop: 'oasa:A', passed: false, at: 1300, source: 'live' },
    ] },
  };
  assert.deepEqual(busStopProgress(variant, run, '42', 'B', 1000), { matched: true, nextIndex: 1, minutes: [null, 2, 5] });
  assert.deepEqual(busStopProgress(variant, run, 'other', 'B', 1000), { matched: false, nextIndex: 1, minutes: [null, null, null] });
  assert.equal(busStopProgress(variant, run, '42', 'B', 1400).matched, false);
});
