import { readFileSync, writeFileSync } from 'node:fs';

const read = (name) => JSON.parse(readFileSync(`scripts/downloads/${name}.geojson`, 'utf8'));
const save = (name, features) => writeFileSync(`public/data/kifisia-${name}.geojson`, JSON.stringify({ type: 'FeatureCollection', features }));
const category = (label = '') => {
  if (/ΠΡΑΣΙΝ|ΕΛΕΥΘΕΡ/.test(label)) return 'Green space';
  if (/ΑΜΙΓΟΥΣ ΚΑΤΟΙΚΙΑΣ/.test(label)) return 'Residential';
  if (/ΓΕΝΙΚΗΣ ΚΑΤΟΙΚΙΑΣ/.test(label)) return 'Mixed residential';
  if (/ΚΕΝΤΡΟΥ/.test(label)) return 'Centre';
  if (/ΚΟΙΝΩΦΕΛ/.test(label)) return 'Civic';
  if (/ΠΑΡΑΓΩΓΙΚ/.test(label)) return 'Production';
  return 'Other';
};

const planning = [21, 26].flatMap((id) => read(`planning-${id}-clipped`).features.map((feature) => {
  const p = feature.properties;
  const use = p.GEN_XRHSH || p.GEN_XRHSH_GPS || p.PER_CAT_GEN || 'Use not specified';
  return { ...feature, properties: {
    use, category: category(use), plan: id === 21 ? 'ΕΡΣ' : 'ΓΠΣ',
    fek: p.FEK || '', date: p.PUBL_DATE || '', fekUrl: p.FEK_FILE_URL || '',
  } };
}));
save('planning-uses', planning);

save('designated-spaces', read('planning-22-clipped').features.map((feature) => ({
  ...feature, properties: {
    use: feature.properties.EID_XRHSH_TXT || 'Designated public / civic space',
    fek: feature.properties.FEK || '', date: feature.properties.PUBL_DATE || '',
    fekUrl: feature.properties.FEK_FILE_URL || '',
  },
})));

save('forest-status', read('forest-kifisia-clipped').features.map((feature) => ({
  ...feature, properties: { code: feature.properties.KATHGORDX || '—' },
})));

const html = readFileSync('scripts/downloads/tps-page.html', 'utf8');
const coordinates = html.match(/L\.geoJson\(\{'type': 'Polygon', 'coordinates': (\[\[\[.*?\]\]\])/s)?.[1];
if (!coordinates) throw new Error('TPS study-area geometry is missing from the official page');
save('tps-study-area', [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: JSON.parse(coordinates) }, properties: { name: 'TPS Kifisia Municipal Unit' } }]);
