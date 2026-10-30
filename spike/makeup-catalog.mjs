// Asks the API which makeup categories and patterns it accepts, instead of
// guessing names from the docs. Run: node spike/makeup-catalog.mjs
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const API = 'https://yce-api-01.makeupar.com';
let KEY = '';
for (const line of (await readFile(path.join(ROOT, '.env.local'), 'utf8')).split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+)$/);
  if (m) KEY = KEY || m[2].trim().replace(/^["']|["']$/g, '');
}

const get = async (url) => {
  const res = await fetch(API + url, { headers: { Authorization: `Bearer ${KEY}` } });
  return { status: res.status, body: await res.json().catch(() => null) };
};

for (const url of [
  '/s2s/v2.0/task/template/makeup-vto',
  '/s2s/v2.0/task/template/makeup-vto?page_size=200',
]) {
  const r = await get(url);
  console.log('==', url, r.status);
  console.log(JSON.stringify(r.body).slice(0, 3000));
}
