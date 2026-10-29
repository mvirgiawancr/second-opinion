import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { FaceColors } from './color';

const API = 'https://yce-api-01.makeupar.com';
const KEY = process.env.YOUCAM_API_KEY ?? '';

export class YouCamError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

async function api<T = any>(method: 'GET' | 'POST', url: string, body?: unknown): Promise<T> {
  const res = await fetch(API + url, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || json.status >= 400) {
    throw new YouCamError(json.error_code ?? json.error ?? `http_${res.status}`, json.error_message);
  }
  return json.data as T;
}

/** Uploads bytes through the File API's signed PUT. */
export async function upload(bytes: Buffer, name: string, type = 'image/jpeg'): Promise<string> {
  const data = await api<any>('POST', '/s2s/v2.0/file', {
    files: [{ content_type: type, file_name: name, file_size: bytes.length }],
  });
  const file = data.files?.[0];
  if (!file?.file_id) throw new YouCamError('upload_failed');
  const put = await fetch(file.requests[0].url, {
    method: 'PUT',
    headers: file.requests[0].headers,
    body: bytes as unknown as BodyInit,
  });
  if (!put.ok) throw new YouCamError('upload_put_failed', `${put.status}`);
  return file.file_id as string;
}

/** AI tasks are async. ~13s typical; back off rather than hammer the rate limit. */
async function poll(url: string): Promise<any> {
  let wait = 3000;
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, wait));
    const data = await api<any>('GET', url);
    if (data.task_status === 'error') {
      throw new YouCamError(data.error ?? 'task_error', data.error_message);
    }
    if (data.task_status === 'success') return data;
    wait = Math.min(wait + 2000, 10000);
  }
  throw new YouCamError('task_timeout');
}

const resultUrl = (d: any): string | undefined =>
  typeof d?.results === 'string' ? d.results : (d?.results?.url ?? d?.url);

/** Rejects on a face too small or angled — a full-body shot fails here by design. */
export async function analyzeFace(fileId: string): Promise<FaceColors> {
  const { task_id } = await api<any>('POST', '/s2s/v2.0/task/skin-tone-analysis', {
    src_file_id: fileId,
  });
  const data = await poll(`/s2s/v2.0/task/skin-tone-analysis/${task_id}`);
  return data.results.color as FaceColors;
}

// Catalogue garments are uploaded once per instance and their file ids reused.
const refIds = new Map<string, string>();

async function refIdFor(garmentId: string): Promise<string> {
  const cached = refIds.get(garmentId);
  if (cached) return cached;
  const bytes = await readFile(path.join(process.cwd(), 'public', 'catalog', `${garmentId}.jpg`));
  const id = await upload(bytes, `${garmentId}.jpg`);
  refIds.set(garmentId, id);
  return id;
}

/**
 * Returns the finished JPEG as bytes. YouCam's download URL expires after two
 * hours, so it is pulled immediately and handed to the client, which keeps it as
 * an object URL. Nothing is stored server-side: on a serverless host /tmp is
 * per-instance, so a later /api/img request could hit an instance without it.
 */
export async function tryOn(bodyId: string, garmentId: string, category: string): Promise<Buffer> {
  const refId = await refIdFor(garmentId);
  const { task_id } = await api<any>('POST', '/s2s/v2.0/task/cloth-v4', {
    src_file_id: bodyId,
    ref_file_id: refId,
    garment_category: category,
    filter_multi_person: 'strict',
  });
  const data = await poll(`/s2s/v2.0/task/cloth-v4/${task_id}`);
  const url = resultUrl(data);
  if (!url) throw new YouCamError('no_result');
  const res = await fetch(url);
  if (!res.ok) throw new YouCamError('download_failed', `${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export const hasKey = () => KEY.length > 0;
