// Proves makeup-vto and hair-color accept src_file_id and explicit hex colours.
// Run: node spike/look.mjs
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
  const j = await res.json().catch(() => ({}));
  return j;
};

async function upload(file) {
  const bytes = await readFile(file);
  const j = await api('POST', '/s2s/v2.0/file', {
    files: [{ content_type: 'image/jpeg', file_name: path.basename(file), file_size: bytes.length }],
  });
  const f = (j.data?.files ?? j.files)?.[0];
  if (!f?.file_id) throw new Error('upload: ' + JSON.stringify(j).slice(0, 200));
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

async function save(u, name) {
  if (!u) return null;
  const r = await fetch(u);
  if (!r.ok) return null;
  await mkdir(OUT, { recursive: true });
  await writeFile(path.join(OUT, name), Buffer.from(await r.arrayBuffer()));
  return name;
}

const resUrl = (d) => (typeof d?.results === 'string' ? d.results : (d?.results?.url ?? d?.url));

const selfie = await upload(path.join(ROOT, 'public', 'demo', 'selfie.jpg'));
console.log('selfie ->', selfie.slice(0, 10));

// 1. Makeup: two effects in one task, explicit hexes, so the colour is ours.
// lip_color takes `shape` (from lipshape.json), blush takes `pattern` (blush.json).
{
  const j = await api('POST', '/s2s/v2.0/task/makeup-vto', {
    src_file_id: selfie,
    version: '1.0',
    effects: [
      {
        category: 'lip_color',
        shape: { name: 'original' },
        style: { type: 'full' },
        palettes: [{ color: '#9C4A3C', texture: 'matte', colorIntensity: 70 }],
      },
      {
        category: 'blush',
        pattern: { name: '1color1' },
        palettes: [{ color: '#C0705A', texture: 'matte', colorIntensity: 40 }],
      },
    ],
  });
  if (!j.data?.task_id) {
    console.log('makeup create failed:', JSON.stringify(j).slice(0, 400));
  } else {
    const d = await poll(`/s2s/v2.0/task/makeup-vto/${j.data.task_id}`);
    console.log('makeup:', d.task_status, d.error ?? '', await save(resUrl(d), 'look-makeup.jpg'));
  }
}

// 2. Hair colour by explicit hex rather than preset, for the same reason.
{
  const j = await api('POST', '/s2s/v2.0/task/hair-color', {
    src_file_id: selfie,
    pattern: { name: 'full' },
    palettes: [{ color: '#3A2318', color_intensity: 90, shine_intensity: 40 }],
  });
  if (!j.data?.task_id) {
    console.log('hair create failed:', JSON.stringify(j).slice(0, 400));
  } else {
    const d = await poll(`/s2s/v2.0/task/hair-color/${j.data.task_id}`);
    console.log('hair:', d.task_status, d.error ?? '', await save(resUrl(d), 'look-hair.jpg'));
  }
}
