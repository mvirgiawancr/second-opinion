// Generates a full-body demo persona with Image Generator v2, then optionally
// runs skin-tone + try-on on it. Run: node spike/person.mjs [index]
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
if (!KEY) throw new Error('YOUCAM_API_KEY missing');

async function api(method, url, body) {
  const res = await fetch(API + url, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json().catch(() => ({}));
}

async function poll(url) {
  let wait = 4000;
  for (let i = 0; i < 40; i++) {
    await sleep(wait);
    const j = await api('GET', url);
    const d = j.data ?? {};
    if (d.task_status === 'success' || d.task_status === 'error') return d;
    wait = Math.min(wait + 3000, 15000);
  }
  return { task_status: 'timeout' };
}

const url = (d) => (typeof d?.results === 'string' ? d.results : d?.results?.url ?? d?.url);

async function save(u, name) {
  if (!u) return null;
  const r = await fetch(u);
  if (!r.ok) return null;
  await writeFile(path.join(OUT, name), Buffer.from(await r.arrayBuffer()));
  return name;
}

// Plain studio wall, standing, front-facing: what Clothes VTO asks for.
const BASE =
  'Full body photograph of a person standing straight, facing the camera, arms relaxed at the sides, feet together, wearing a plain grey t-shirt and plain dark trousers, ' +
  'seamless light grey studio background, soft even frontal lighting, entire body from head to shoes inside the frame, photorealistic, sharp focus, e-commerce lookbook photo, ' +
  'no text, no logo, no props';

const PEOPLE = [
  { name: 'person-a.jpg', prompt: `Indonesian woman in her late twenties, shoulder-length straight black hair, medium warm skin tone. ${BASE}` },
  { name: 'person-b.jpg', prompt: `Indonesian man in his early thirties, short black hair, medium brown skin tone. ${BASE}` },
  { name: 'person-c.jpg', prompt: `Southeast Asian woman in her mid thirties, curly dark hair tied back, deep brown skin tone. ${BASE}` },
];

const NEG =
  'multiple people, cropped limbs, close-up, portrait, headshot only, sitting, crouching, distorted hands, extra fingers, text, watermark, logo, busy background, cartoon, illustration, low quality';

await mkdir(OUT, { recursive: true });

const made = [];
for (const p of PEOPLE) {
  const j = await api('POST', '/s2s/v2.0/task/text-to-image/youcam', {
    model: 'youcam-image-v2',
    prompt: p.prompt,
    negative_prompt: NEG,
    size: '1104*1472',
    prompt_extend: false,
  });
  const id = j.data?.task_id;
  if (!id) {
    console.log(p.name, 'create failed', JSON.stringify(j).slice(0, 200));
    continue;
  }
  const d = await poll(`/s2s/v2.0/task/text-to-image/youcam/${id}`);
  const saved = await save(url(d), p.name);
  console.log(p.name, d.task_status, saved ?? '(no url)', d.error ?? '');
  if (saved) made.push({ name: p.name, url: url(d) });
}

await writeFile(path.join(OUT, 'personas.json'), JSON.stringify(made, null, 2));
console.log(`\n${made.length} personas in spike/out. Pick one, then:`);
console.log(`  node spike/person.mjs ${made[0]?.name ?? 'person-a.jpg'}`);
