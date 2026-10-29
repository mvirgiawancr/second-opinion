// Proves the two-photo flow: a close-up for colour, a full body for try-on.
// Run: node spike/flow.mjs
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

const resUrl = (d) => (typeof d?.results === 'string' ? d.results : d?.results?.url ?? d?.url);
const save = async (u, n) => {
  if (!u) return null;
  const r = await fetch(u);
  if (!r.ok) return null;
  await writeFile(path.join(OUT, n), Buffer.from(await r.arrayBuffer()));
  return n;
};

async function upload(file) {
  const bytes = await readFile(file);
  const j = await api('POST', '/s2s/v2.0/file', {
    files: [{ content_type: 'image/jpeg', file_name: path.basename(file), file_size: bytes.length }],
  });
  const f = (j.data?.files ?? j.files)?.[0];
  if (!f?.file_id) throw new Error('file api: ' + JSON.stringify(j).slice(0, 200));
  const put = await fetch(f.requests[0].url, { method: 'PUT', headers: f.requests[0].headers, body: bytes });
  if (!put.ok) throw new Error(`PUT ${put.status}`);
  return f.file_id;
}

async function generate(prompt, name, size) {
  const j = await api('POST', '/s2s/v2.0/task/text-to-image/youcam', {
    model: 'youcam-image-v2',
    prompt,
    negative_prompt: 'text, watermark, logo, blurry, illustration, cartoon, low quality, multiple people',
    size,
    prompt_extend: false,
  });
  const d = await poll(`/s2s/v2.0/task/text-to-image/youcam/${j.data.task_id}`);
  return { url: resUrl(d), saved: await save(resUrl(d), name), status: d.task_status };
}

await mkdir(OUT, { recursive: true });

// Same woman as person-a, cropped to the face: what the Upload screen asks for.
const selfie = await generate(
  'Close-up headshot photograph of an Indonesian woman in her late twenties with shoulder-length straight black hair, facing the camera directly, neutral expression, plain light grey background, soft even frontal lighting, photorealistic, sharp focus, no text',
  'selfie-a.jpg',
  '1328*1328',
);
console.log('selfie:', selfie.status, selfie.saved);

const selfieId = await upload(path.join(OUT, 'selfie-a.jpg'));
const toneTask = await api('POST', '/s2s/v2.0/task/skin-tone-analysis', { src_file_id: selfieId });
const tone = await poll(`/s2s/v2.0/task/skin-tone-analysis/${toneTask.data.task_id}`);
console.log('skin_tone on close-up:', tone.task_status, JSON.stringify(tone.results?.color ?? tone.error));
await writeFile(path.join(OUT, 'skin-tone-selfie.json'), JSON.stringify(tone.results ?? { error: tone.error }, null, 2));

// Dress on the woman, full body.
const bodyId = await upload(path.join(OUT, 'person-a.jpg'));
const dressId = await upload(path.join(OUT, 'catalog-dress.jpg'));
const t0 = Date.now();
const clothTask = await api('POST', '/s2s/v2.0/task/cloth-v4', {
  src_file_id: bodyId,
  ref_file_id: dressId,
  garment_category: 'full_body',
  filter_multi_person: 'strict',
});
const cloth = await poll(`/s2s/v2.0/task/cloth-v4/${clothTask.data.task_id}`);
const saved = await save(resUrl(cloth), 'tryon-a-dress.jpg');
console.log('dress on woman:', cloth.task_status, saved ?? cloth.error, `${((Date.now() - t0) / 1000).toFixed(1)}s`);
