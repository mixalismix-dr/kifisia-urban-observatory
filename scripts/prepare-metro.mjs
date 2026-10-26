import { writeFile } from 'node:fs/promises';

const root = 'https://data.athensgis.gr/data/Transportation/';
const [network, stations] = await Promise.all(['AthensMetroNet.geojson', 'AthensMetro123.geojson'].map(async (name) => {
  const response = await fetch(root + name);
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  return response.json();
}));
const route = network.features.find((feature) => feature.properties.full_id === '2' && feature.properties.ref === 'Μ1');
if (!route) throw new Error('Kifissia to Piraeus Line 1 route missing');
const points = route.geometry.coordinates.flat();
const distanceAlong = (station) => {
  const [x, y] = station.geometry.coordinates;
  let best = Infinity;
  let position = 0;
  let traveled = 0;
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1];
    const [bx, by] = points[i];
    const dx = (bx - ax) * 0.79;
    const dy = by - ay;
    const length2 = dx * dx + dy * dy;
    const t = length2 ? Math.max(0, Math.min(1, (((x - ax) * 0.79 * dx) + ((y - ay) * dy)) / length2)) : 0;
    const separation = Math.hypot((ax + (bx - ax) * t - x) * 0.79, ay + (by - ay) * t - y);
    if (separation < best) { best = separation; position = traveled + Math.sqrt(length2) * t; }
    traveled += Math.sqrt(length2);
  }
  return position;
};
const ordered = stations.features.filter((feature) => feature.properties.metroline === 1)
  .sort((a, b) => distanceAlong(a) - distanceAlong(b))
  .map((feature, index) => ({ type: 'Feature', geometry: feature.geometry,
    properties: { name: feature.properties.ENAME, name_el: feature.properties.GNAME, order: index + 1 } }));
if (ordered.length !== 24 || ordered[0].properties.name !== 'KIFISSIA' || ordered.at(-1).properties.name !== 'PIRAEUS') {
  throw new Error('Line 1 station order needs review');
}
const folder = new URL('../public/data/', import.meta.url);
await Promise.all([
  writeFile(new URL('kifisia-metro-line1.geojson', folder), JSON.stringify({ type: 'FeatureCollection', features: [
    { type: 'Feature', geometry: route.geometry, properties: { name: 'Line 1', from: 'Kifissia', to: 'Piraeus' } },
  ] })),
  writeFile(new URL('kifisia-metro-stations.geojson', folder), JSON.stringify({ type: 'FeatureCollection', features: ordered })),
]);
console.log(`Prepared Line 1 track and ${ordered.length} ordered stations from Athens GIS.`);
