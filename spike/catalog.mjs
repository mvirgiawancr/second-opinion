// Generates the 12-garment catalogue with Image Generator v2.
// Run: node spike/catalog.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'public', 'catalog');
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

export const CATALOG = [
  { id: 'rust-overshirt', name: 'Rust linen overshirt', category: 'outer', prompt: 'a plain rust orange linen overshirt, long sleeves, open front, chest pockets' },
  { id: 'camel-knit', name: 'Camel merino crewneck', category: 'upper_body', prompt: 'a plain camel tan merino wool crewneck sweater, long sleeves, ribbed cuffs' },
  { id: 'olive-shirt', name: 'Olive cotton shirt', category: 'upper_body', prompt: 'a plain olive green cotton long-sleeve shirt, buttoned to the collar, chest pocket' },
  { id: 'cream-oxford', name: 'Cream oxford shirt', category: 'upper_body', prompt: 'a plain cream off-white oxford cotton long-sleeve shirt, buttoned, crisp collar' },
  { id: 'navy-oxford', name: 'Navy oxford shirt', category: 'upper_body', prompt: 'a plain navy blue oxford cotton long-sleeve shirt, buttoned, crisp collar' },
  { id: 'ice-linen', name: 'Icy blue linen shirt', category: 'upper_body', prompt: 'a plain pale ice blue linen long-sleeve shirt, relaxed fit, buttoned' },
  { id: 'charcoal-knit', name: 'Charcoal knit', category: 'upper_body', prompt: 'a plain charcoal grey fine-gauge knit sweater, long sleeves, crew neck' },
  { id: 'mustard-cord', name: 'Mustard corduroy shirt', category: 'upper_body', prompt: 'a plain mustard yellow corduroy long-sleeve shirt, buttoned, chest pockets' },
  { id: 'forest-bomber', name: 'Forest bomber', category: 'outer', prompt: 'a plain deep forest green nylon bomber jacket, zip front, ribbed collar and cuffs' },
  { id: 'plum-coat', name: 'Plum wool coat', category: 'outer', prompt: 'a plain deep plum purple wool overcoat, notch lapels, single breasted, long sleeves' },
  { id: 'stone-jacket', name: 'Stone canvas jacket', category: 'outer', prompt: 'a plain stone beige cotton canvas chore jacket, button front, patch pockets' },
  { id: 'black-leather', name: 'Black leather jacket', category: 'outer', prompt: 'a plain black leather biker jacket, asymmetric zip, silver hardware, long sleeves' },
  { id: 'oat-trench', name: 'Oatmeal trench coat', category: 'full_body', prompt: 'a plain oatmeal beige cotton trench coat, full length below the knee, double breasted, belt, long sleeves' },
  { id: 'black-long-coat', name: 'Black wool overcoat', category: 'full_body', prompt: 'a plain black wool overcoat, full length below the knee, notch lapels, single breasted, long sleeves' },
];

const FRAME = (item) =>
  `Product photograph of a single ${item}, photographed straight on from the front on an invisible mannequin, ` +
  'isolated on a seamless light grey studio background, soft even lighting, sharp focus, e-commerce catalogue style, no person, no text';

const NEG =
  'person, model, mannequin body, text, watermark, logo, multiple garments, pattern, print, blurry, illustration, cartoon, low quality';

await mkdir(OUT, { recursive: true });
const results = [];
const only = process.argv.slice(2);
const list = only.length ? CATALOG.filter((i) => only.includes(i.id)) : CATALOG;

for (const item of list) {
  const j = await api('POST', '/s2s/v2.0/task/text-to-image/youcam', {
    model: 'youcam-image-v2',
    prompt: FRAME(item.prompt),
    negative_prompt: NEG,
    size: '1328*1328',
    prompt_extend: false,
  });
  const id = j.data?.task_id;
  if (!id) {
    console.log(item.id, 'create failed', JSON.stringify(j).slice(0, 160));
    continue;
  }
  const d = await poll(`/s2s/v2.0/task/text-to-image/youcam/${id}`);
  const u = typeof d?.results === 'string' ? d.results : d?.results?.url ?? d?.url;
  if (!u) {
    console.log(item.id, d.task_status, d.error ?? 'no url');
    continue;
  }
  const r = await fetch(u);
  await writeFile(path.join(OUT, `${item.id}.jpg`), Buffer.from(await r.arrayBuffer()));
  results.push(item);
  console.log(item.id.padEnd(16), 'ok');
}

if (!only.length) await writeFile(path.join(OUT, 'generated.json'), JSON.stringify(results, null, 2));
console.log(`\n${results.length}/${list.length} garments in public/catalog`);
