import { NextRequest } from 'next/server';
import { CATALOG } from '@/lib/catalog';
import { tryOn, YouCamError } from '@/lib/youcam';

export const maxDuration = 60;

// One garment per request so tiles can land on the sheet as they finish.
export async function POST(req: NextRequest) {
  const { bodyId, garmentId } = await req.json().catch(() => ({}));
  const garment = CATALOG.find((g) => g.id === garmentId);

  if (typeof bodyId !== 'string' || !bodyId || !garment) {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }

  try {
    const bytes = await tryOn(bodyId, garment.id, garment.category);
    return new Response(new Uint8Array(bytes), {
      headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    const err = e as YouCamError;
    return Response.json({ error: err.code }, { status: 502 });
  }
}
