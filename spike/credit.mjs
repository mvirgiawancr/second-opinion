// Remaining units. Run: node spike/credit.mjs
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
let KEY = '';
for (const line of (await readFile(path.join(ROOT, '.env.local'), 'utf8')).split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+)$/);
  if (m) KEY = KEY || m[2].trim().replace(/^["']|["']$/g, '');
}
const res = await fetch('https://yce-api-01.makeupar.com/s2s/v1.0/client/credit', {
  headers: { Authorization: `Bearer ${KEY}` },
});
console.log(JSON.stringify(await res.json()));
