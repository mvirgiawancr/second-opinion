// One-off: renders candidate "wrong" hair shades so the table is chosen by eye
// as well as by hue. Run: node spike/hair-try.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'spike', 'out');
const API = 'https://yce-api-01.makeupar.com';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let KEY = '';
for (const line of (await readFile(path.join(ROOT, '.env.local'), 'utf8')).split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+)$/);
  if (m) KEY = KEY || m[2].trim().replace(/^["']|["']$/g, '');
}

const api = async (method, url, body) => {
  const res = await fetch(API + url, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json().catch(() => ({}));
};

async function upload(file) {
  const bytes = await readFile(file);
  const j = await api('POST', '/s2s/v2.0/file', {
    files: [{ content_type: 'image/jpeg', file_name: path.basename(file), file_size: bytes.length }],
  });
  const f = (j.data?.files ?? j.files)?.[0];
  const put = await fetch(f.requests[0].url, { method: 'PUT', headers: f.requests[0].headers, body: bytes });
  if (!put.ok) throw new Error(`PUT ${put.status}`);
  return f.file_id;
}

async function poll(url) {
  let wait = 4000;
  for (let i = 0; i < 40; i++) {
    await sleep(wait);
    const d = (await api('GET', url)).data ?? {};
    if (d.task_status === 'success' || d.task_status === 'error') return d;
    wait = Math.min(wait + 3000, 15000);
  }
  return { task_status: 'timeout' };
}

const selfie = await upload(path.join(ROOT, 'public', 'demo', 'selfie.jpg'));
await mkdir(OUT, { recursive: true });

for (const [name, color, INT] of [['mauve80','#8E7A85',80],['ink90','#3A3A5C',90]]) {
  const j = await api('POST', '/s2s/v2.0/task/hair-color', {
    src_file_id: selfie,
    pattern: { name: 'full' },
    palettes: [{ color, color_intensity: INT, shine_intensity: 35 }],
  });
  const d = await poll(`/s2s/v2.0/task/hair-color/${j.data.task_id}`);
  const url = typeof d?.results === 'string' ? d.results : (d?.results?.url ?? d?.url);
  if (!url) {
    console.log(name, d.task_status, d.error);
    continue;
  }
  await writeFile(path.join(OUT, `hair-${name}.jpg`), Buffer.from(await (await fetch(url)).arrayBuffer()));
  console.log(name, 'ok');
}






