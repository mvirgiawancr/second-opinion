# Second Opinion

A fitting room that tells you the truth. Upload a close-up and a full-body photo; the app reads your colouring, puts fourteen garments on your own body, and tells you which ones fail — and why.

The value is the rejection, not the try-on. Return rates in fashion are driven by *"the colour looked different on me."* Every other try-on tool stops at "here you are in a shirt." This one hands back a marked-up casting sheet: nine that work, five that don't, each with a reason you can argue with.

**[Live demo](#)** · **[3-minute walkthrough](#)**

## What actually happens

1. **Read the face.** `AI Facial Color Tones Analyzer` returns five hex values (skin, lip, eye, brow, hair) plus a face-quality report.
2. **Decide the undertone.** YouCam returns raw colours, not warm/cool. The app converts skin and lip to CIELAB, takes the hue angle with a chroma floor, and calls it: warm, cool, or neutral. Contrast comes from lightness distance to the skin.
3. **Judge the wardrobe.** Each garment's colour is sampled from the centre of its own catalogue photograph — not from the text prompt that generated it. Same maths, applied to the garment against the skin.
4. **Try them on.** Fourteen `Clothes Virtual Try-On v4` tasks run in parallel against one uploaded body photo. Tiles land on the sheet as each task finishes.
5. **Stamp the failures.** Rejections are labelled in stamp red with the reason: *fights your warm undertone*, *too close to your skin tone to read*.

## Why the colour maths is the interesting part

YouCam gives colours. It does not give you an opinion. Two naive approaches were built and thrown away:

- **Hue banding** on raw hex put navy (LAB hue 271°) inside "warm".
- **A b\*-only axis** called forest green (a = −21.5, b = +8.6) neutral.

What works is the hue angle with a chroma floor below 8, and a warm/cool split at 135° — high enough that olive (hue 115°, yellow-green) reads warm, low enough that blue-green stays cool. `lib/color.ts` carries 16 assertions; run `npm run check`.

One field is deliberately ignored: `hair_color` came back `#FAF0BE` "Blonde" for a black-haired subject on two separate runs. It is displayed, labelled `unused`, and never enters the maths.

## APIs used

| YouCam API | Calls per session | Role |
|---|---|---|
| AI Facial Color Tones Analyzer | 1 | skin / lip / eye / brow / hair colours + face quality |
| AI Clothes Virtual Try-On v4 | 14 | one garment each, `upper_body`, `outer`, `full_body` |
| AI Image Generator v2 | 14 (build time only) | the catalogue photographs, so no third-party trademarks |

28 units per session. The catalogue is generated once and committed, so a session never spends image-generation units.

## Architecture notes

- **Two photos, not one.** `skin-tone-analysis` fails on full-body shots with `error_face_angle_downward` — a face that is 8% of the frame is not readable. The product asks for a close-up for colour and a full-body shot for try-on, and says so in the UI.
- **No server-side image storage.** YouCam download URLs expire after two hours, so every result is pulled immediately — but it is handed straight to the browser, which keeps it as an object URL. Nothing is written to disk. On a serverless host `/tmp` is per-instance, so a stored tile can 404 on the next request.
- **One garment per request.** `/api/tryon` takes a single garment so tiles can arrive independently. `POST /api/analyze` returns the colours and an opaque YouCam file id, which the client passes back. No session, no database.
- **The demo subject is generated.** The photographs under `public/demo/` are AI-generated with Image Generator v2, so nobody's face ships in this repo.

## Run it

```bash
npm install
echo "YOUCAM_API_KEY=sk-your-key" > .env.local
npm run dev          # http://localhost:3000
npm run check        # colour-maths self-check
```

Get a key from the [YouCam API console](https://yce.perfectcorp.com). The free tier includes 1,000 units via a redeem code, which is roughly 35 sessions.

```
app/page.tsx              the four views: upload, verdict, sheet, detail
app/api/analyze/route.ts  upload both photos, read the face
app/api/tryon/route.ts    one garment, one Clothes VTO task
lib/color.ts              CIELAB warmth, contrast, verdict + self-check
lib/youcam.ts             File API upload, task polling, result download
lib/catalog.ts            the fourteen garments and their sampled colours
public/catalog/           generated garment photographs
spike/                    the experiments that produced the numbers above
```

## Design decisions worth defending

- **Paper tooth over flat colour.** The canvas carries a 4.5% multiply grain. Without it the page reads as a beige web page; with it, as a printed sheet. This is the single change that moved the whole thing from "tidy" to "designed".
- **The rejection is the interface.** Rejected tiles are stamped and their reasons listed *before* the sheet is opened. If the list of failures is not convincing, nothing downstream matters.
- **The arithmetic is on the page.** The detail view prints hue, chroma and ΔL with the thresholds. It is the cheapest way to prove the verdict is computed and not narrated.
- **No strikethrough on rejected names.** At caption size a line-through reads as an underline. One mark per rejection — the stamp.
- **Full-look tiles span two columns and two rows.** At 4:5, a double-width print is exactly two rows tall, so the grid needs no special case and the long coats are never cropped.

## Built for

YouCam API Skin AI & eCommerce VTO Hackathon, 2026. Categories: Skin AI, Apparel VTO, Beauty, Hair & Beard.
