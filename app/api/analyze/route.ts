import { NextRequest } from 'next/server';
import { analyzeFace, upload, YouCamError } from '@/lib/youcam';

export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024;

// Real codes, observed in testing. Each one tells the user what to change.
const REFUSALS: Record<string, string> = {
  error_face_angle_downward:
    'The face in that close-up is too small or tilted. Get closer, look straight at the camera.',
  error_below_min_image_size: 'That image is too small to read. Use one at least 512px wide.',
  error_pose: "No standing body found. Use a photo where you're standing, facing the camera.",
  error_invalid_src: "That photo doesn't show enough of the body.",
  error_multi_person: 'More than one person is in that photo. Use one with just you.',
  error_no_face: 'No face found in the close-up. Use a clear head-and-shoulders shot.',
};

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const selfie = form.get('selfie');
  const body = form.get('body');

  if (!(selfie instanceof File) || !(body instanceof File)) {
    return Response.json({ error: 'Both a close-up and a full-body photo are needed.' }, { status: 400 });
  }
  if (selfie.size > MAX_BYTES || body.size > MAX_BYTES) {
    return Response.json({ error: 'Each photo must be under 10MB.' }, { status: 400 });
  }

  try {
    const [selfieId, bodyId] = await Promise.all([
      upload(Buffer.from(await selfie.arrayBuffer()), 'selfie.jpg'),
      upload(Buffer.from(await body.arrayBuffer()), 'body.jpg'),
    ]);

    // Colour comes from the close-up only: the same call fails on a full-body
    // photo with error_face_angle_downward, which is why the product asks for two.
    const colors = await analyzeFace(selfieId);

    // bodyId goes back to the client, which passes it to /api/tryon. It is an
    // opaque YouCam file id, so no server-side session or storage is needed.
    return Response.json({ bodyId, colors });
  } catch (e) {
    const err = e as YouCamError;
    return Response.json(
      { error: REFUSALS[err.code] ?? 'That photo could not be read. Try a clearer one.', code: err.code },
      { status: 422 },
    );
  }
}
