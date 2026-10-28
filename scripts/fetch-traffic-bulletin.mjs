import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const source = 'https://www.astynomia.gr/kykloforia-stous-dromous/deltio-kykloforias-attiki/';

export function parseBulletin(html) {
  const date = html.match(/Τελευταία Ενημέρωση:\s*<strong>(\d{2})\/(\d{2})\/(\d{4})\s*-\s*(\d{2}):(\d{2})<\/strong>/);
  if (!date) throw new Error('Police bulletin timestamp missing');
  const [, day, month, year, hour, minute] = date;
  // Greece uses UTC+3 in summer. Determine the offset for the bulletin date.
  const summer = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Athens', timeZoneName: 'shortOffset' })
    .formatToParts(new Date(`${year}-${month}-${day}T12:00:00Z`)).find((part) => part.type === 'timeZoneName')?.value === 'GMT+3';
  const timestamp = `${year}-${month}-${day}T${hour}:${minute}:00${summer ? '+03:00' : '+02:00'}`;
  const directions = {};
  for (const [key, label] of [['northbound', 'άνοδος'], ['southbound', 'κάθοδος']]) {
    const row = html.match(new RegExp(`<tr[^>]*class="[^"]*dq-traffic__row--level-([1-3])[^" ]*"[^>]*>\\s*<td[^>]*>Λ\\. Κηφισίας \\(${label}\\)<\\/td>`, 'u'));
    if (!row) throw new Error(`Kifisias ${label} row missing`);
    directions[key] = Number(row[1]);
  }
  return { source, updatedAt: timestamp, directions };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Police bulletin HTTP ${response.status}`);
  const bulletin = parseBulletin(await response.text());
  await writeFile(new URL('../public/data/kifisia-traffic-bulletin.json', import.meta.url), JSON.stringify(bulletin));
  console.log(`Police bulletin ${bulletin.updatedAt}: north ${bulletin.directions.northbound}, south ${bulletin.directions.southbound}`);
}
