const stationMinutes = [0, 2, 4, 7, 9, 12]; // STASY's Kifissia–Iraklio scheduled offsets.
const metresBetween = (a, b) => Math.hypot((b[0] - a[0]) * 87600, (b[1] - a[1]) * 111200);

export function railPath(line, stations) {
  const points = line.features[0].geometry.coordinates.flat();
  const distances = [0];
  for (let i = 1; i < points.length; i++) distances.push(distances[i - 1] + metresBetween(points[i - 1], points[i]));
  const calls = stations.features.slice(0, stationMinutes.length).map((station) => {
    let nearest = 0;
    for (let i = 1; i < points.length; i++)
      if (metresBetween(points[i], station.geometry.coordinates) < metresBetween(points[nearest], station.geometry.coordinates)) nearest = i;
    return { name: station.properties.name, distance: distances[nearest] };
  });
  if (calls.some((call, i) => i && call.distance <= calls[i - 1].distance)) throw new Error('Line 1 stations are not ordered along the track');
  return { points, distances, calls };
}

function frequency(minutes, weekend) {
  if (weekend) return minutes < 330 ? 15 : minutes < 1410 ? 10.5 : 15;
  if (minutes < 330) return 15;
  if (minutes < 420) return 7.5;
  if (minutes < 600) return 6;
  if (minutes < 900) return 7.5;
  if (minutes < 1080) return 6;
  if (minutes < 1350) return 7.5;
  if (minutes < 1380) return 11.5;
  if (minutes < 1410) return 12.5;
  return 15;
}

function pointAt(path, minutes, northbound) {
  let section = stationMinutes.findIndex((time) => time > minutes) - 1;
  if (section < 0) section = stationMinutes.length - 2;
  const fraction = (minutes - stationMinutes[section]) / (stationMinutes[section + 1] - stationMinutes[section]);
  const distance = path.calls[section].distance + fraction * (path.calls[section + 1].distance - path.calls[section].distance);
  let i = 1;
  while (i < path.distances.length - 1 && path.distances[i] < distance) i++;
  const span = path.distances[i] - path.distances[i - 1];
  const t = span ? (distance - path.distances[i - 1]) / span : 0;
  const a = path.points[i - 1], b = path.points[i];
  const coordinate = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
  const bearing = (Math.atan2((b[0] - a[0]) * Math.cos(coordinate[1] * Math.PI / 180), b[1] - a[1]) * 180 / Math.PI + (northbound ? 180 : 360)) % 360;
  return { coordinate, bearing, nextStation: path.calls[northbound ? section : section + 1].name };
}

export function estimatedTrains(path, now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Athens', weekday: 'short', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' }).formatToParts(now).map(({ type, value }) => [type, value]));
  let minutes = Number(parts.hour) * 60 + Number(parts.minute) + Number(parts.second) / 60;
  if (minutes < 180) minutes += 1440;
  if (minutes < 300 || minutes > 1506) return [];
  const weekday = minutes >= 1440 ? new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Athens', weekday: 'short' }).format(new Date(now.getTime() - 3 * 3600000)) : parts.weekday;
  const weekend = weekday === 'Sat' || weekday === 'Sun';
  const trains = [];
  for (const northbound of [false, true]) {
    let endpoint = northbound ? 321 : 300;
    for (let k = 0; endpoint <= 1506; k++) {
      if (northbound ? endpoint > 1506 : endpoint > 1470) break;
      const elapsed = northbound ? minutes - (endpoint - 12) : minutes - endpoint;
      if (elapsed >= 0 && elapsed <= 12) trains.push({ id: `${northbound ? 'north' : 'south'}-${k}`, direction: northbound ? 'Kifissia' : 'Piraeus',
        ...pointAt(path, northbound ? 12 - elapsed : elapsed, northbound) });
      endpoint += frequency(endpoint - (northbound ? 21 : 0), weekend);
    }
  }
  return trains;
}
