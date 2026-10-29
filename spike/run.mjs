// One-shot API spike for Second Opinion. Answers the five open questions in BRIEF.md.
// Run: node spike/run.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'spike', 'out');
const API = 'https://yce-api-01.makeupar.com';
const PHOTO_RAW = path.join(ROOT, 'spike', 'photo.jpg');
// The API caps the long side at 4096px; photo-4096.jpg comes from spike/resize.ps1
const PHOTO = existsSync(path.join(ROOT, 'spike', 'photo-4096.jpg'))
  ? path.join(ROOT, 'spike', 'photo-4096.jpg')
  : PHOTO_RAW;
const PHOTO_POSED = path.join(ROOT, 'spike', 'photo-posed.jpg');
const SAMPLE_FULL_BODY = 'https://plugins-media.makeupar.com/strapi/assets/clothes_03_cccd5d4803.jpeg';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);
let KEY = '';

async function loadEnv() {
  const txt = await readFile(path.join(ROOT, '.env.local'), 'utf8');
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  KEY = process.env.YOUCAM_API_KEY || '';
  if (!KEY) {
    log('Missing YOUCAM_API_KEY in .env.local. Stopping.');
    process.exit(1);
  }
}

async function api(method, url, body) {
  const res = await fetch(url.startsWith('http') ? url : API + url, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

async function upload(file) {
  const bytes = await readFile(file);
  const { json } = await api('POST', '/s2s/v2.0/file', {
    files: [{ content_type: 'image/jpeg', file_name: path.basename(file), file_size: bytes.length }],
  });
  const f = (json.data?.files ?? json.files)?.[0];
  if (!f?.file_id) throw new Error('file api returned no file_id: ' + JSON.stringify(json));
  const req = f.requests[0];
  const put = await fetch(req.url, { method: 'PUT', headers: req.headers, body: bytes });
  if (!put.ok) throw new Error(`upload PUT failed: ${put.status} ${await put.text()}`);
  log(`  uploaded ${path.basename(file)} (${(bytes.length / 1024).toFixed(0)} KB) -> ${f.file_id.slice(0, 12)}...`);
  return f.file_id;
}

// Polls until success/error. Backoff 4s -> 15s, capped at 40 rounds.
async function poll(taskUrl) {
  const t0 = Date.now();
  let wait = 4000;
  for (let i = 0; i < 40; i++) {
    await sleep(wait);
    const { json } = await api('GET', taskUrl);
    const d = json.data ?? {};
    if (d.task_status === 'success' || d.task_status === 'error') {
      return { status: d.task_status, data: d, ms: Date.now() - t0 };
    }
    wait = Math.min(wait + 3000, 15000);
  }
  return { status: 'timeout', data: null, ms: Date.now() - t0 };
}

function resultUrl(d) {
  if (!d) return null;
  if (typeof d.results === 'string') return d.results;
  if (Array.isArray(d.results)) return d.results[0]?.url ?? d.results[0] ?? null;
  return d.results?.url ?? d.url ?? null;
}

async function save(url, name) {
  if (!url) return null;
  const r = await fetch(url);
  if (!r.ok) return `download failed ${r.status}`;
  const buf = Buffer.from(await r.arrayBuffer());
  await writeFile(path.join(OUT, name), buf);
  return `${name} (${(buf.length / 1024).toFixed(0)} KB)`;
}

// --- steps ---------------------------------------------------------------

async function generate(prompt, name) {
  const { json } = await api('POST', '/s2s/v2.0/task/text-to-image/youcam', {
    model: 'youcam-image-v2',
    prompt,
    negative_prompt:
      'text, watermark, logo, multiple garments, mannequin, distorted proportions, blurry, low quality, illustration, cartoon',
    size: '1328*1328',
    prompt_extend: false,
  });
  const id = json.data?.task_id;
  if (!id) return { ok: false, error: json };
  const r = await poll(`/s2s/v2.0/task/text-to-image/youcam/${id}`);
  const url = resultUrl(r.data);
  const saved = await save(url, name);
  return { ok: r.status === 'success', ms: r.ms, url, saved, error: r.data?.error };
}

async function cloth(src, ref, category, name) {
  const body = { ref_file_url: ref, garment_category: category };
  if (src.startsWith('http')) body.src_file_url = src;
  else body.src_file_id = src;
  const { json } = await api('POST', '/s2s/v2.0/task/cloth-v4', body);
  const id = json.data?.task_id;
  if (!id) return { ok: false, stage: 'create', error: json };
  const r = await poll(`/s2s/v2.0/task/cloth-v4/${id}`);
  const url = resultUrl(r.data);
  const saved = await save(url, name);
  return { ok: r.status === 'success', ms: r.ms, url, saved, error: r.data?.error ?? r.data?.error_message };
}

async function tone(src) {
  const { json } = await api('POST', '/s2s/v2.0/task/skin-tone-analysis', { src_file_id: src });
  const id = json.data?.task_id;
  if (!id) return { ok: false, stage: 'create', error: json };
  const r = await poll(`/s2s/v2.0/task/skin-tone-analysis/${id}`);
  return { ok: r.status === 'success', ms: r.ms, results: r.data?.results, error: r.data?.error };
}

// --- main ----------------------------------------------------------------

const report = { startedAt: new Date().toISOString(), steps: {} };
const step = async (name, fn) => {
  log(`\n[${name}]`);
  try {
    report.steps[name] = await fn();
  } catch (e) {
    report.steps[name] = { ok: false, error: String(e.message ?? e) };
  }
  const s = report.steps[name];
  log(`  -> ${s.ok ? 'ok' : 'FAILED'}${s.ms ? ` in ${(s.ms / 1000).toFixed(1)}s` : ''}${s.error ? ` :: ${JSON.stringify(s.error).slice(0, 300)}` : ''}`);
};

await loadEnv();
await mkdir(OUT, { recursive: true });

// Free preflight: a bogus task id returns 401 for a bad key and anything else for a good one.
{
  const { status } = await api('GET', '/s2s/v2.0/task/skin-tone-analysis/preflight-check');
  if (status === 401) {
    log('YOUCAM_API_KEY rejected (401). Check the key in .env.local, or that the 1,000 units were redeemed.');
    process.exit(1);
  }
  log(`Key accepted (preflight ${status}).`);
}
if (!existsSync(PHOTO)) {
  log(`Missing ${PHOTO}\nDrop one full-body photo there (standing, even light, plain background, <10MB) and rerun.`);
  process.exit(1);
}
if (existsSync(PHOTO_POSED)) log('Found photo-posed.jpg, will test the posed path too.');

// 1. catalogue images: does the generator produce clean product shots?
await step('gen_shirt', () =>
  generate(
    'Product photograph of a single plain navy blue long-sleeve oxford shirt, laid flat and photographed straight on from the front, buttoned, sleeves folded back neatly, isolated on a seamless light grey studio background, soft even lighting, sharp focus, e-commerce catalogue style, no person',
    'catalog-shirt.jpg',
  ),
);
await step('gen_jacket', () =>
  generate(
    'Product photograph of a single camel wool overshirt jacket, photographed straight on from the front on an invisible mannequin, isolated on a seamless light grey studio background, soft even lighting, sharp focus, e-commerce catalogue style, no person',
    'catalog-jacket.jpg',
  ),
);
await step('gen_portrait', () =>
  generate(
    'Close-up headshot photograph of a person from the shoulders up, facing the camera, plain neutral background, natural soft lighting, photorealistic, sharp focus',
    'portrait.jpg',
  ),
);

// 2. upload the user's own photo through the File API (the path production will use)
let srcFileId = null;
await step('upload_photo', async () => {
  srcFileId = await upload(PHOTO);
  return { ok: true, fileId: srcFileId };
});

// 3. colour analysis: what does the JSON actually contain?
if (srcFileId) {
  await step('skin_tone', async () => {
    const r = await tone(srcFileId);
    if (r.results) await writeFile(path.join(OUT, 'skin-tone.json'), JSON.stringify(r.results, null, 2));
    return r;
  });
}

// 4. try-on on a real body, 2 categories, plus the src_file_id question
const shirtRef = report.steps.gen_shirt?.url;
const jacketRef = report.steps.gen_jacket?.url;
if (srcFileId && shirtRef) {
  await step('cloth_upper_fileid', async () => {
    const r = await cloth(srcFileId, shirtRef, 'upper_body', 'tryon-upper.jpg');
    // If v4 refuses src_file_id, prove the pipeline with a public source instead.
    if (!r.ok && r.stage === 'create') {
      log('  src_file_id rejected, retrying with a public source URL');
      report.steps.cloth_upper_fileid_v4_schema = { ok: false, error: r.error };
      return cloth(SAMPLE_FULL_BODY, shirtRef, 'upper_body', 'tryon-upper-public.jpg');
    }
    return r;
  });
}
if (srcFileId && jacketRef) {
  await step('cloth_outer', () => cloth(srcFileId, jacketRef, 'outer', 'tryon-outer.jpg'));
}

// 4b. does a posed photo work? decides whether the Upload screen may say "any photo"
if (existsSync(PHOTO_POSED) && shirtRef) {
  await step('cloth_posed', async () => {
    const id = await upload(PHOTO_POSED);
    const r = await cloth(id, shirtRef, 'upper_body', 'tryon-posed.jpg');
    // Compare the two results by eye in spike/out: tryon-upper.jpg vs tryon-posed.jpg
    return { ...r, posed: true };
  });
}

// 5. rejection path: a headshot must fail the full-body check with a usable error
const portraitUrl = report.steps.gen_portrait?.url;
if (portraitUrl && shirtRef) {
  await step('cloth_reject_headshot', () => cloth(portraitUrl, shirtRef, 'upper_body', 'tryon-should-not-exist.jpg'));
}

await writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
log(`\nWrote ${path.join(OUT, 'report.json')}`);

const okCount = Object.values(report.steps).filter((s) => s.ok).length;
const total = Object.keys(report.steps).length;
const slowest = Math.max(0, ...Object.values(report.steps).map((s) => s.ms ?? 0));
log(`Summary: ${okCount}/${total} steps ok, slowest task ${(slowest / 1000).toFixed(1)}s`);
