import assert from 'node:assert/strict';
import { test } from 'node:test';
import { translate } from '../src/i18n.js';

let selected = 'el';
globalThis.localStorage = { getItem: () => selected };

test('Greek interface terms and dynamic labels', () => {
  assert.equal(translate('Three proposed spatial scenarios'), 'Τρία εναλλακτικά σενάρια χωρικής ανάπτυξης');
  assert.equal(translate('Published planning uses'), 'Θεσμοθετημένες χρήσεις γης');
  assert.equal(translate('Bus line 550'), 'Γραμμή λεωφορείου 550');
  assert.equal(translate('  Photo '), '  Φωτογραφία ');
  assert.equal(translate('3 active'), '3 ενεργά');
  assert.equal(translate('Layers'), 'Επίπεδα');
  assert.equal(translate('Close'), 'Κλείσιμο');
});

test('English selection preserves source text', () => {
  selected = 'en';
  assert.equal(translate('Three proposed spatial scenarios'), 'Three proposed spatial scenarios');
  assert.equal(translate('Bus line 550'), 'Bus line 550');
  selected = 'el';
});
