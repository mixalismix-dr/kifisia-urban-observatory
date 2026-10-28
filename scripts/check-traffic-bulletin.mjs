import assert from 'node:assert/strict';
import { parseBulletin } from './fetch-traffic-bulletin.mjs';

const html = `<h4 class="dq-traffic__updated">Τελευταία Ενημέρωση: <strong>28/10/2026 - 12:30</strong></h4>
<tr class="dq-traffic__row dq-traffic__row--level-2"><td class="dq-traffic__street-cell">Λ. Κηφισίας (άνοδος)</td></tr>
<tr class="dq-traffic__row dq-traffic__row--level-3"><td class="dq-traffic__street-cell">Λ. Κηφισίας (κάθοδος)</td></tr>`;
assert.deepEqual(parseBulletin(html).directions, { northbound: 2, southbound: 3 });
assert.equal(parseBulletin(html).updatedAt, '2026-10-28T12:30:00+02:00');
assert.throws(() => parseBulletin(html.replace('Λ. Κηφισίας (κάθοδος)', 'Other road')), /southbound|κάθοδος/);
console.log('Police bulletin parser checks passed');
