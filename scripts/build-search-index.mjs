import { readFileSync, writeFileSync } from 'node:fs';

const read = (name) => JSON.parse(readFileSync(`public/data/kifisia-${name}.geojson`, 'utf8')).features;
const local = (name) => JSON.parse(readFileSync(`scripts/downloads/kifisia-${name}.geojson`, 'utf8')).features;
const middle = (coordinates) => coordinates[Math.floor(coordinates.length / 2)];
const center = (geometry) => {
  if (geometry.type === 'Point') return geometry.coordinates;
  if (geometry.type === 'LineString') return middle(geometry.coordinates);
  if (geometry.type === 'MultiLineString') return middle(geometry.coordinates.sort((a, b) => b.length - a.length)[0]);
  const ring = geometry.type === 'Polygon' ? geometry.coordinates[0] : geometry.coordinates[0][0];
  return [ring.reduce((sum, point) => sum + point[0], 0) / ring.length,
    ring.reduce((sum, point) => sum + point[1], 0) / ring.length];
};
const items = [];
const seenAddresses = new Set();
const add = (name, kind, geometry) => {
  if (typeof name !== 'string' || !name.trim() || !geometry) return;
  if (kind === 'Mapped address' && seenAddresses.has(name.trim())) return;
  const [lon, lat] = center(geometry);
  if (Number.isFinite(lon) && Number.isFinite(lat)) {
    items.push({ name: name.trim(), kind, point: [Number(lon.toFixed(6)), Number(lat.toFixed(6))] });
    if (kind === 'Mapped address') seenAddresses.add(name.trim());
  }
};

for (const [file, kind, title] of [
  ['landmarks', 'Landmark', (p) => p.name],
  ['civic-pois', 'Civic place', (p) => p.name],
  ['parks', 'Park', (p) => p.name],
  ['sports', 'Sports site', (p) => p.name],
  ['arch-sites', 'Historic site', (p) => p.name || p.name_en],
  ['metro-stations', 'Line 1 station', (p) => p.name_el || p.name],
]) for (const feature of read(file)) {
  if (file === 'metro-stations' && feature.properties.order !== 1) continue;
  add(title(feature.properties), kind, feature.geometry);
}

const streets = new Map();
for (const feature of local('streets')) {
  const name = feature.properties.name?.trim();
  if (!name || !['LineString', 'MultiLineString'].includes(feature.geometry?.type)) continue;
  const size = feature.geometry.type === 'LineString' ? feature.geometry.coordinates.length :
    feature.geometry.coordinates.flat(1).length;
  if (!streets.has(name) || size > streets.get(name).size) streets.set(name, { size, feature });
}
for (const [name, { feature }] of streets) add(name, 'Street', feature.geometry);

for (const feature of local('osm-points-clipped')) {
  const tags = feature.properties.other_tags || '';
  const house = /"addr:housenumber"=>"([^"]+)"/.exec(tags)?.[1];
  const street = /"addr:street"=>"([^"]+)"/.exec(tags)?.[1];
  if (street && house) add(`${street} ${house}`, 'Mapped address', feature.geometry);
}

items.sort((a, b) => a.name.localeCompare(b.name, 'el'));
writeFileSync('public/data/kifisia-search.json', JSON.stringify(items));
console.log(`${items.length} searchable locations (${streets.size} streets)`);
