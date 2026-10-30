import { NextRequest } from 'next/server';
import { isSlot, LOOK, type Warmth } from '@/lib/color';
import { tryOnHair, tryOnMakeup, YouCamError } from '@/lib/youcam';

export const maxDuration = 60;

const UNDERTONES: Warmth[] = ['warm', 'cool', 'neutral'];

// One shade per request so the four prints land independently, and the hex is
// chosen here from the table rather than sent by the client: the browser cannot
// ask this endpoint to apply an arbitrary colour.
export async function POST(req: NextRequest) {
  const { selfieId, undertone, slot } = await req.json().catch(() => ({}));

  if (typeof selfieId !== 'string' || !selfieId || !isSlot(slot) || !UNDERTONES.includes(undertone)) {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }

  const shade = LOOK[undertone as Warmth][slot];

  try {
    const bytes = slot.startsWith('lip')
      ? await tryOnMakeup(selfieId, shade.hex)
      : await tryOnHair(selfieId, shade.hex);
    return new Response(new Uint8Array(bytes), {
      headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    const err = e as YouCamError;
    return Response.json({ error: err.code }, { status: 502 });
  }
}
