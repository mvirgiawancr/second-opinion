// Runs the real product path on a generated persona: colour analysis, then
// upper_body and full_body try-on. Run: node spike/tryon.mjs person-b.jpg
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'spike', 'out');
const API = 'https://yce-api-01.makeupar.com';
const PERSONA = process.argv[2] || 'person-b.jpg';
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

const resUrl = (d) => (typeof d?.results === 'string' ? d.results : d?.results?.url ?? d?.url);

async function save(u, name) {
  if (!u) return null;
  const r = await fetch(u);
  if (!r.ok) return null;
  await writeFile(path.join(OUT, name), Buffer.from(await r.arrayBuffer()));
  return name;
}

async function upload(file) {
  const bytes = await readFile(file);
  const j = await api('POST', '/s2s/v2.0/file', {
    files: [{ content_type: 'image/jpeg', file_name: path.basename(file), file_size: bytes.length }],
  });
  const f = (j.data?.files ?? j.files)?.[0];
  if (!f?.file_id) throw new Error('file api: ' + JSON.stringify(j).slice(0, 300));
  const put = await fetch(f.requests[0].url, { method: 'PUT', headers: f.requests[0].headers, body: bytes });
  if (!put.ok) throw new Error(`PUT ${put.status}`);
  return f.file_id;
}

async function generate(prompt, name, size = '1328*1328') {
  const j = await api('POST', '/s2s/v2.0/task/text-to-image/youcam', {
    model: 'youcam-image-v2',
    prompt,
    negative_prompt: 'person, model, mannequin, text, watermark, logo, multiple garments, blurry, illustration',
    size,
    prompt_extend: false,
  });
  const id = j.data?.task_id;
  if (!id) throw new Error('create: ' + JSON.stringify(j).slice(0, 200));
  const d = await poll(`/s2s/v2.0/task/text-to-image/youcam/${id}`);
  return { url: resUrl(d), saved: await save(resUrl(d), name), status: d.task_status };
}

await mkdir(OUT, { recursive: true });
const report = { persona: PERSONA, steps: {} };

const src = await upload(path.join(OUT, PERSONA));
console.log(`uploaded ${PERSONA} -> ${src.slice(0, 12)}...`);

// 1. colour analysis on a generated face
{
  const j = await api('POST', '/s2s/v2.0/task/skin-tone-analysis', { src_file_id: src });
  const d = await poll(`/s2s/v2.0/task/skin-tone-analysis/${j.data.task_id}`);
  report.steps.skin_tone = { status: d.task_status, results: d.results, error: d.error };
  console.log('skin_tone:', d.task_status, JSON.stringify(d.results?.color ?? d.error));
}

// 2. an upper-body garment, already proven to generate cleanly
const shirt = await upload(path.join(OUT, 'catalog-shirt.jpg'));

// 3. a full-body garment, needed to prove the full_body path
const dress = await generate(
  'Product photograph of a single long-sleeve midi dress in deep forest green, photographed straight on from the front on an invisible mannequin, isolated on a seamless light grey studio background, soft even lighting, sharp focus, e-commerce catalogue style, no person, no text',
  'catalog-dress.jpg',
);
console.log('dress:', dress.status, dress.saved);

// 4. try-ons on the persona
for (const [name, ref, category] of [
  ['tryon-person-upper.jpg', shirt, 'upper_body'],
  ['tryon-person-full.jpg', null, 'full_body'],
]) {
  if (category === 'full_body' && !dress.url) continue;
  const j = await api('POST', '/s2s/v2.0/task/cloth-v4', {
    src_file_id: src,
    ...(ref ? { ref_file_id: ref } : { ref_file_url: dress.url }),
    garment_category: category,
    filter_multi_person: 'strict',
  });
  if (!j.data?.task_id) {
    report.steps[name] = { error: j };
    console.log(name, 'create failed', JSON.stringify(j).slice(0, 200));
    continue;
  }
  const t0 = Date.now();
  const d = await poll(`/s2s/v2.0/task/cloth-v4/${j.data.task_id}`);
  const saved = await save(resUrl(d), name);
  report.steps[name] = { status: d.task_status, saved, ms: Date.now() - t0, error: d.error ?? d.error_message };
  console.log(name, d.task_status, saved ?? d.error ?? '', `${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

await writeFile(path.join(OUT, 'tryon-report.json'), JSON.stringify(report, null, 2));
console.log('\nwrote tryon-report.json');
