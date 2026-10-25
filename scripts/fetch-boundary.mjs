import { writeFile } from 'node:fs/promises';

// OpenStreetMap relation 2080716 is the municipality of Kifisia.
// Nominatim supplies its assembled polygon. Keep the result in the repository
// so the published map does not depend on Nominatim at page load.
const url = 'https://nominatim.openstreetmap.org/lookup?osm_ids=R2080716&format=jsonv2&polygon_geojson=1';
const response = await fetch(url, {
  headers: { 'User-Agent': 'KifisiaUrbanObservatory/0.1 (https://github.com/mixalismix-dr/kifisia-urban-observatory)' },
});
if (!response.ok) throw new Error(`Nominatim returned ${response.status}`);

const [place] = await response.json();
if (place?.osm_id !== 2080716 || !['Polygon', 'MultiPolygon'].includes(place.geojson?.type)) {
  throw new Error('The municipality boundary was missing or invalid');
}

const featureCollection = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: { name: 'Δήμος Κηφισιάς', source: 'OpenStreetMap', osm_relation: 2080716 },
    geometry: place.geojson,
  }],
};
await writeFile(new URL('../public/data/kifisia-boundary.geojson', import.meta.url), JSON.stringify(featureCollection));
console.log('Saved Kifisia municipality boundary from OSM relation 2080716');
