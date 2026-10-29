# YouCam API Skin AI & eCommerce VTO Hackathon

Second Opinion — a fitting room that tells you the truth.

## Event facts (verified 2026-10-29)

| | |
|---|---|
| Devpost | https://youcam-api-skin-ai-ecommerce.devpost.com |
| Deadline | 2026-11-02 16:45 UTC = **2026-11-02 23:45 WIB** |
| Registered | 1,431 participants, gallery not yet public |
| Judging | Nov 3 – Nov 20, winners ~Nov 24 |
| Prizes | 1st $2,500 / 2nd $1,000 / 3rd $500, Women in Tech $1,000, **Rising Star $1,000** |
| Prize rules | max 1 placement + 1 special award — Rising Star stacks with 1st–3rd |
| Card needed | no. Free account + 1,000 unit redeem code |
| Indonesia | eligible (exclusions: China, Vietnam, Brazil, Russia, Cuba, Iran, etc.) |

### Judging criteria (equally weighted)
1. Technological implementation — how thoroughly the YouCam API is integrated, non-trivial code
2. Design — complete coherent product, not a proof of concept
3. Potential impact — credible specific case for a real audience
4. Quality of idea — creative, non-obvious use, real understanding of the problem

"Surface-level wrapper" is called out as a fail. One API call + pretty UI scores badly.

### Submission needs
- Public repo with working code + instructions
- Text description of features and consumer value
- Screenshots
- 1–3 minute demo video on YouTube, must show the app running and name the APIs used
- English
- **Rising Star: submit with the campus .edu email address**

## Product

**Second Opinion.** One selfie + one full-body photo. We tell you which of 12 garments
actually work on your colouring, and — the part nobody does — which ones don't and why.

The value is the rejection, not the try-on. Return rates in fashion are driven by
"the colour looked different on me"; seasonal colour quizzes ask you to trust a chart.
This shows the evidence on your own body.

### APIs used
| API | Units | Role |
|---|---|---|
| AI Facial Color Tones Analyzer | 20 | skin / eye / brow / lip / hair colours → our own undertone + contrast math |
| AI Clothes Virtual Try-On v4 | 2 per tile | 12 tiles, one async task each |
| AI Makeup Virtual Try-On | 1 | one "full look" tile |
| AI Hair Color Virtual Try-On | 1 | one "full look" tile |
| AI Image Generator v2 | 1 per image | the 12-item catalogue (no third-party trademarks) |

Full session = 46 units. 1,000 units ≈ 22 sessions, so demo results must be cached server-side.

### Screens (four, no more)
1. Upload — full body + selfie, with pose guidance
2. Verdict — undertone, contrast, 3 colours that light you up, 3 that drain you
3. The Sheet — 12 tiles filling in progressively, ranked, failures labelled with a reason
4. Detail — one tile opened: before/after, the reason, neighbouring variants

Not building: login, user DB, history, brand pages, checkout.

## Hard constraints learned from the docs

- **Clothes VTO v4 takes one garment per task.** 12 garments = 12 async tasks to poll.
  Rate limit 250 req / 300s per token, so poll with backoff (6s → 10s → 15s).
- **Result download URLs expire in 2 hours.** `task_id` stays valid 30 days, but the
  S3 link does not. Every result must be downloaded server-side and stored by us.
  Never hotlink a YouCam result URL into the UI.
- **Source photo:** full body, one person, ≥80% of frame, long side ≤4096px, <10MB,
  standing, facing forward, face fully visible. The docs contradict themselves about
  "upper body only" — test it, do not assume.
- **Catalogue is `upper_body`, `full_body`, `outer` only.** Lower body needs a worn
  outfit photo, not a product shot, or the task fails with `error_invalid_ref`.
- **Image Generator v2** outputs 1664×928 / 1472×1104 / 1328×1328 / 1104×1472 / 928×1664,
  1 unit per image, prompt ≤800 chars. Use 1328×1328 for product shots.
- YouCam returns raw colours only — **not** warm/cool/neutral. Undertone and contrast
  are our own LAB / value math. That is the non-trivial part of the submission.

## Spike (blocking everything else)

`spike/run.mjs` answers five questions before any UI exists:

1. Real JSON shape of `skin-tone-analysis` results
2. Clothes v4 quality on an Indonesian body, and whether it accepts `src_file_id`
3. Whether Image Generator can make a clean front-facing product shot
4. Latency per task (decides the tile fill rhythm)
5. Error message for a non-full-body photo (so the UI can explain rejections)

Run: `node spike/run.mjs`

## Plan

| Day | Work |
|---|---|
| Thu Oct 29 | spike → lock decisions |
| Fri Oct 30 | 12-garment catalogue + server pipeline (upload → analyse → 12 tasks → poll) |
| Sat Oct 31 | four screens + art direction |
| Sun Nov 1 | polish, deploy to Vercel, screenshots |
| Mon Nov 2 | video, README, submit in the morning |

Video: real screen recording with burned subtitles, not a GSAP composition. No time,
and the laptop does not like it.

## Blocked on the user

- Devpost registration → redeem code by email
- yce.perfectcorp.com account → Account > Redeem Code (1,000 units, valid 90 days)
- API key → `API Console > API Keys` → `.env.local` as `YOUCAM_API_KEY`
- One full-body photo → `spike/photo.jpg`
