// Real try-ons for the landing page. Run: node spike/example.mjs rust-overshirt oat-trench
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const API = 'https://yce-api-01.makeupar.com';
const CATEGORY = {
  'rust-overshirt': 'outer',
  'oat-trench': 'full_body',
  'navy-oxford': 'upper_body',
  'mustard-cord': 'upper_body',
  'olive-shirt': 'upper_body',
};
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

const body = await upload(path.join(ROOT, 'public', 'demo', 'body.jpg'));
await mkdir(path.join(ROOT, 'public', 'example'), { recursive: true });

for (const id of process.argv.slice(2)) {
  const ref = await upload(path.join(ROOT, 'public', 'catalog', `${id}.jpg`));
  const t = await api('POST', '/s2s/v2.0/task/cloth-v4', {
    src_file_id: body,
    ref_file_id: ref,
    garment_category: CATEGORY[id],
    filter_multi_person: 'strict',
  });
  const d = await poll(`/s2s/v2.0/task/cloth-v4/${t.data.task_id}`);
  const url = typeof d?.results === 'string' ? d.results : (d?.results?.url ?? d?.url);
  if (!url) {
    console.log(id, d.task_status, d.error);
    continue;
  }
  const img = await fetch(url);
  await writeFile(path.join(ROOT, 'public', 'example', `${id}.jpg`), Buffer.from(await img.arrayBuffer()));
  console.log(id, 'ok');
}
