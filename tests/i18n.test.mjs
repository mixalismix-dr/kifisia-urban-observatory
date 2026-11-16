import assert from 'node:assert/strict';
import { test } from 'node:test';
import { translate } from '../src/i18n.js';

let selected = 'el';
globalThis.localStorage = { getItem: () => selected };

test('Greek interface terms and dynamic labels', () => {
  assert.equal(translate('Three proposed spatial scenarios'), 'Τρία εναλλακτικά σενάρια χωρικής ανάπτυξης');
  assert.equal(translate('Published planning uses'), 'Δημοσιευμένες χρήσεις γης');
  assert.equal(translate('Bus line 550'), 'Γραμμή λεωφορείου 550');
  assert.equal(translate('  Photo '), '  Φωτογραφία ');
  assert.equal(translate('3 active'), '3 ενεργά');
  assert.equal(translate('Layers'), 'Επίπεδα');
  assert.equal(translate('Close'), 'Κλείσιμο');
  assert.equal(translate('Scenario 3: Kifissia centre'), 'Σενάριο 3: Κέντρο Κηφισιάς');
  assert.equal(translate('Open or unused land'), 'Ανοιχτές εκτάσεις ή γη χωρίς καταγεγραμμένη χρήση');
  assert.match(translate('Scenario 2 · Moderate intervention: updated land uses, planning for part of the Kalyftaki industrial area, selected planning-unit extensions, and an undergrounded Kifissia terminal with Line 1 extended toward Nea Erythraia are proposed.'), /υπογειοποίηση του τερματικού σταθμού Κηφισιάς/);
  assert.equal(translate('Rail network'), 'Σιδηροδρομικό δίκτυο');
  assert.equal(translate('Hospitals'), 'Νοσοκομεία');
  assert.equal(translate('Source:'), 'Πηγή:');
  assert.equal(translate('More information'), 'Περισσότερες πληροφορίες');
  assert.equal(translate('Base layers'), 'Υπόβαθρα');
  assert.equal(translate('Hellenic Cadastre · 2021'), 'Ελληνικό Κτηματολόγιο · 2021');
  assert.equal(translate('OASA · community feed'), 'ΟΑΣΑ · ανεπίσημη ροή');
});

test('English selection preserves source text', () => {
  selected = 'en';
  assert.equal(translate('Three proposed spatial scenarios'), 'Three proposed spatial scenarios');
  assert.equal(translate('Bus line 550'), 'Bus line 550');
  selected = 'el';
});
