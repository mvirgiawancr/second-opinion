// Reads the colour of the demo persona's close-up. Run: node spike/tone-b.mjs
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
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

const file = path.join(ROOT, 'spike', 'out', 'selfie-b.jpg');
const bytes = await readFile(file);
const up = await api('POST', '/s2s/v2.0/file', {
  files: [{ content_type: 'image/jpeg', file_name: 'selfie-b.jpg', file_size: bytes.length }],
});
const f = (up.data?.files ?? up.files)?.[0];
await fetch(f.requests[0].url, { method: 'PUT', headers: f.requests[0].headers, body: bytes });

const task = await api('POST', '/s2s/v2.0/task/skin-tone-analysis', { src_file_id: f.file_id });
let d = {};
for (let i = 0; i < 40; i++) {
  await sleep(5000);
  d = (await api('GET', `/s2s/v2.0/task/skin-tone-analysis/${task.data.task_id}`)).data ?? {};
  if (d.task_status === 'success' || d.task_status === 'error') break;
}
console.log(d.task_status, JSON.stringify(d.results ?? d.error));
if (d.results) {
  await writeFile(path.join(ROOT, 'lib', 'demo-colors.json'), JSON.stringify(d.results, null, 2));
  console.log('wrote lib/demo-colors.json');
}
