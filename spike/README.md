# Spike

Answers five questions before any UI exists. ~31 API units, one sequential run.

## Before running

1. `.env.local` at the project root with `YOUCAM_API_KEY=...`
2. One full-body photo at `spike/photo.jpg` — standing, facing forward, even light,
   plain background, person filling most of the frame, under 10MB
3. Optional: `spike/photo-posed.jpg` — same person, any pose you actually take photos in.
   The script then tests whether a posed photo survives, which decides how the Upload
   screen is worded.

## Run

```
node spike/run.mjs
```

Output goes to `spike/out/`: generated images, try-on results, `skin-tone.json`
(the raw colour JSON) and `report.json` (status, error codes, timings).

## What each step answers

| Step | Question |
|---|---|
| `gen_shirt`, `gen_jacket` | Can Image Generator v2 make a clean front-facing product shot, or does it drift into illustration? |
| `gen_portrait` | Source for the rejection test |
| `upload_photo` | Does the File API + signed PUT work from this machine |
| `skin_tone` | The real shape of the results object — needed before writing undertone logic |
| `cloth_upper_fileid` | Does cloth-v4 accept `src_file_id`, and what does the try-on look like on a real body |
| `cloth_outer` | Second category, for the catalogue mix |
| `cloth_posed` | Only if `photo-posed.jpg` exists: does a fashion pose survive, or does the Upload screen have to ask for a neutral stance |
| `cloth_reject_headshot` | The exact error code and message for a non-full-body photo |

If `src_file_id` is rejected, the script retries once with a public source image and
records `cloth_upper_fileid_v4_schema` — that means production must host user photos
publicly (Vercel Blob) instead of relying on file ids.
