# Second Opinion — DESIGN.md

Direction for the YouCam hackathon entry. Derived from two reference systems read as
inspiration only, never applied wholesale: `wired.DESIGN.md` (editorial density, hard
grids, display type doing the work) and `framer.DESIGN.md` (one assertive statement per
band, rhythm breaks, motion with a purpose). Neither brand's palette, typefaces or
components carry over.

## Overview

Second Opinion is a casting sheet, not a shopping app. The user hands over a photo, and we
return a printed sheet of fourteen garments with a verdict written across it: these work,
these don't, and here is why. The interface should feel like something a stylist filled in
by hand and handed back across a counter.

That means paper, not screen. A warm off-white surface with a faint tooth, a hard grid of
photographs with tight margins, small annotated captions in the gutter, and one violent
red stamp. The chrome is monochrome; the only colour in the product is the red that means
*no*.

**Key characteristics**

- Warm paper canvas (`{colors.paper}`), never pure white; a second, deeper paper tone marks gutters and insets.
- One accent, `{colors.stamp}`, reserved for rejection and the verdict. Buttons, links, borders and icons stay ink. The accent is the product thesis made visible: the value is the rejection.
- Zero border radius on all chrome. Tiles are prints, buttons are stamped rectangles. The only curve in the system is a portrait crop.
- No shadows. Hierarchy comes from paper tone, hairline rules, size and space.
- Three type voices, each with one job: a serif for verdicts (opinion, not output), a grotesque for the interface, a mono for annotations and counts.
- The sheet is asymmetric by design: most tiles are 1×1, the full-look tiles span two columns. This is honest (a look is bigger than a shirt), not decorative mosaic.

**Dial: ENERGY 2 / RHYTHM 3 / MOTION 2**

| Dial | Value | What it means here |
|---|---|---|
| ENERGY | 2 | Confident, not loud. Big type on the verdict screen, calm everywhere else. |
| RHYTHM | 3 | Upload is airy and sparse, Verdict is dense and typographic, the Sheet is full and busy. No two screens share a skeleton. |
| MOTION | 2 | Tiles arrive as their tasks finish. One stamp lands once. No loops, no parallax, no scroll choreography. |

## Colors

### Brand & Accent

- **Stamp** (`{colors.stamp}` `#C2372A`): The single accent. The stamp graphic, the rejection label, the verdict underline, the "doesn't work" state. Nowhere else — never on buttons, links, or decorative rules.
- **Stamp Ink** (`{colors.stamp-ink}` `#A02C21`): Darker cut of the same red, for text under 18px where the graphic tone would fail contrast on paper.

### Surface

- **Paper** (`{colors.paper}` `#F4F1EA`): The canvas. Every screen sits on it. Warm, slightly yellow, like photographic paper.
- **Paper Deep** (`{colors.paper-deep}` `#E9E3D6`): Gutters, inset panels, the sheet's margin strip, disabled fills.
- **Paper Print** (`{colors.paper-print}` `#FBFAF6`): The surface of a photo tile itself, so tiles read as prints laid on paper rather than holes cut in it.
- **Hairline** (`{colors.hairline}` `#CBC3B2`): 1px rules, tile borders, table dividers.
- **Hairline Strong** (`{colors.hairline-strong}` `#8E8677`): The active tile outline, focus rings, the sheet's outer frame.

### Text

- **Ink** (`{colors.ink}` `#1B1813`): Headlines, verdicts, primary labels.
- **Ink Muted** (`{colors.ink-muted}` `#6A6357`): Captions, gutter annotations, secondary copy, meta, inactive breadcrumb steps.
- **Ink Faint** (`{colors.ink-faint}` `#938B7C`): Decorative index numerals and disabled text only. Fails AA for body text, so it never carries information — see Contrast.

### Semantic

- **Good** (`{colors.good}` `#2F4A3A`): A deep, desaturated green used as ink only — the "works" checkmark and the positive verdict rule. Not a fill, not a badge.
- **Pending** (`{colors.pending}` `#8E8677`): Same as hairline-strong; a pending tile is drawn in grey because it has no verdict yet.

No gradients. No glows. No third hue beyond paper, ink, stamp red and the one green.

### Contrast (measured, not estimated)

Ratios against `{colors.paper}` `#F4F1EA`, computed with the WCAG relative-luminance formula:

| Pair | Ratio | Verdict |
|---|---|---|
| ink / paper | 15.69 | AAA |
| good / paper | 8.61 | AAA |
| stamp-ink / paper | 6.47 | AAA |
| ink-muted / paper | 5.27 | AA |
| stamp / paper | 4.81 | AA at every size — safe for the stamp's own 12px text |
| ink-faint / paper | 2.99 | **fails** — decorative and disabled only, never information |
| paper / ink | 15.69 | AAA (primary button) |

`ink-faint` is the one deliberate exception. Anything a user must read uses ink-muted or
darker.

## Typography

### Font Family

- **Instrument Serif** (`{typography.font-display}`): The verdict voice. High-contrast, slightly calligraphic, opinionated. Used at display sizes only, plus one italic for emphasis inside a verdict sentence. Fallback: `Georgia, 'Times New Roman', serif`.
- **Archivo** (`{typography.font-ui}`): The interface. Slightly condensed grotesque with industrial proportions — labels, buttons, body copy, tile captions. Fallback: `'Helvetica Neue', Arial, sans-serif`.
- **IBM Plex Mono** (`{typography.font-mono}`): Annotations only: the sheet index (`01`–`14`), unit counts, API names on the demo strip, timestamps. Never a heading, never body copy.

Self-host all three via `next/font` so the render is deterministic and there is no network
dependency at build or at judging time.

### Hierarchy

| Token | Size | Weight | Line Height | Tracking | Use |
|---|---|---|---|---|---|
| `{typography.verdict-xl}` | 64px / 44px mobile | 400 serif | 0.98 | -0.02em | The verdict sentence on the Verdict screen |
| `{typography.verdict-lg}` | 40px | 400 serif | 1.02 | -0.01em | Section statements, empty-state headlines |
| `{typography.verdict-italic}` | inherit | 400 serif italic | inherit | 0 | One emphasised word inside a verdict |
| `{typography.title}` | 24px | 600 ui | 1.15 | -0.01em | Screen titles, dialog titles |
| `{typography.lead}` | 18px | 400 ui | 1.45 | 0 | Introductory paragraph under a title |
| `{typography.body}` | 15px | 400 ui | 1.5 | 0 | Default body |
| `{typography.caption}` | 13px | 500 ui | 1.3 | 0.01em | Tile captions, gutter notes, form hints |
| `{typography.label}` | 12px | 600 ui | 1.1 | 0.08em uppercase | Field labels, the stamp text, column heads |
| `{typography.mono}` | 12px | 400 mono | 1.2 | 0.02em | Sheet index, unit counts, API strip |
| `{typography.button}` | 14px | 600 ui | 1 | 0.01em | Buttons |

### Principles

- **The serif only speaks in verdicts.** It never labels a button, a field, or a caption. When you see the serif, a judgement is being made — that is the whole point of the product.
- **Tracking goes negative with size, not positive.** Display sits at -0.02em, body at 0. Uppercase labels take +0.08em; nothing else is tracked out.
- **Weight stays in a narrow band.** 400 for reading, 500–600 for labels and titles. No 800/900 ramps, no faux-bold.
- **Mono is annotation, never identity.** No `01 / FEATURE` eyebrows in mono above a heading — the index numbers live inside the sheet, where they mean something.

## Layout

### Spacing System

Base 4px. Scale: `4, 8, 12, 16, 24, 32, 48, 64, 96, 144`.

Spacing is used to separate the three screen types, not uniformly applied:

- **Upload:** 144px above the title, 96px between the two drop zones and the submit. Airy.
- **Verdict:** 48px rhythm, dense — the type carries the screen.
- **Sheet:** 16px gutters, 12px below each tile's caption. Tight, like a real contact sheet.

### Grid & Container

- Max content width `1180px`; the sheet extends to `1320px` because a sheet should feel wider than a page.
- Sheet grid: 4 columns ≥1120px, 3 columns 840–1119px, 2 columns 560–839px, 1 column below 560px.
- `{components.tile-look}` spans 2 columns at 4-column and 3-column widths, 1 column below. Two of them total.
- Page gutters: 32px desktop, 24px tablet, 16px mobile.
- The sheet carries a 48px left margin strip on desktop holding the index numbers, rotated 90° — like the edge of a printed sheet. It collapses into the tile caption below 840px.

### Whitespace Philosophy

Space is the cast list: it decides what the eye reads first. Upload is 70% empty because
the only thing that matters there is the photo the user is about to hand over. The Sheet is
deliberately crowded because fourteen verdicts compete for attention and that tension is the
product. Never equalise the two.

## Elevation & Depth

No box shadows anywhere. Depth is built from:

1. **Paper tone** — `paper-print` tiles on `paper` canvas.
2. **Hairline rules** — 1px `hairline`, 2px `hairline-strong` for the sheet frame.
3. **Overlap** — the stamp overlaps the tile edge by 8px, which reads as a physical object laid on top.

The single exception: a tile currently being generated carries a 1px `hairline-strong`
outline and a faint diagonal hatch in `paper-deep`. That is a state, not elevation.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{shapes.radius-none}` | `0` | Every button, input, tile, panel, dialog, badge |
| `{shapes.radius-print}` | `1px` | Photo tiles only, to avoid sub-pixel fringing on the border |
| `{shapes.radius-circle}` | `50%` | The user's face crop in the sheet header — content, not chrome |

A pill button does not exist in this system. A 12px-radius card does not exist. If a
component needs rounding to look right, the component is wrong.

### Photography Geometry

- Tiles are `4:5` portrait, object-fit `cover`, `object-position: top`. The face stays in frame — the spike proved the try-on preserves the source face exactly, so hiding it would throw away the product's best evidence.
- Consistency across tiles comes from the source photo, not from cropping: every tile inherits the same face, hair and background.
- Because of that, the Upload screen asks for a plain background. A loud backdrop turns fourteen tiles into fourteen posters of the same wall.
- The stamp is rotated -7° and sits at the tile's bottom-left, overlapping the border.
- Full-look tiles span two columns **and two rows** at the same 4:5 print ratio. They are long coats: shrinking them into one cell crops the hem, which misrepresents the garment. The source is 3:4, so `cover` trims a sliver top and bottom and the coat stays whole.

## Components

### Buttons

- **Primary** (`{components.button-primary}`): Ink fill, paper text, `radius-none`, 48px tall, 24px horizontal padding, `{typography.button}`. One per screen. Hover: `paper-deep` text, no colour change. Active: 1px inset translate.
- **Secondary** (`{components.button-secondary}`): Transparent fill, 1px `hairline-strong` border, ink text. Used for "try another garment", "back to sheet".
- **Text** (`{components.button-text}`): Ink, underlined with a 1px `hairline` offset 4px, no colour shift. Used for "start over", "remove photo".
- No disabled button without a stated reason next to it. A disabled state always answers "why can't I".

### Cards & Containers

- **Tile** (`{components.tile}`): `paper-print` fill, 1px `hairline`, `radius-print`. Contains the print, a caption row, and an optional stamp. No padding — the print bleeds to the edge, the caption sits below the border.
- **Tile Pending** (`{components.tile-pending}`): Same box, diagonal hatch in `paper-deep`, mono index centred, caption reading `generating` and the garment name.
- **Tile Failed** (`{components.tile-failed}`): Same box, no image, the rejection reason set in `{typography.caption}` ink-muted, and a `retry` text button. A failure is never blank.
- **Panel** (`{components.panel}`): `paper-deep` inset with 1px `hairline`, used for the API/method strip on the demo page. Not a card — it never holds primary content.

### Inputs & Forms

- **Drop zone**: 1px dashed `hairline-strong`, `paper-deep` fill, `radius-none`, 4:5 aspect. Label in `{typography.label}`, hint in `{typography.caption}` ink-muted. On drag: 2px solid ink border. On error: 1px `stamp` border plus a `{typography.caption}` message stating what failed and what to do.
- **File input** is a real `<input type="file" accept="image/*">` styled behind the drop zone label, keyboard reachable.
- Focus: 2px `hairline-strong` outline offset 2px, always visible, never removed.

### Navigation

Three states of one flow, not a nav bar. The only chrome is:

- A 48px top strip: wordmark left (`SECOND OPINION` in `{typography.label}`), the API credit line right in `{typography.mono}` — `YouCam Skin AI · Clothes VTO · Makeup VTO · Hair Color VTO`.
- A breadcrumb of steps at the sheet's top edge: `photo · verdict · sheet`, the current one in ink, the rest in ink-muted. Each earlier step is a real link back.
- No sidebar. No tabs. No hamburger.

### Signature Components

- **The Stamp** (`{components.stamp}`): Uppercase `{typography.label}`, stamp red, 2px red border, `radius-none`, rotated -7°, 8px padding. Two variants: `DOESN'T WORK` and `NOT YOUR COLOUR`. It lands once, 260ms, with a 4% overshoot. It is the only element in the product allowed to move without the user acting.
- **The Verdict** (`{components.verdict}`): Serif, 64px, two sentences max. First sentence names the undertone; second names the consequence. Underlined with a 2px `stamp` rule that draws left-to-right in 400ms when it first appears.
- **The Swatch Row** (`{components.swatches}`): Five 40×40 squares of the user's detected colours, no radius, each with a mono hex below. These are real values from the API — never invented.
  - **Skin and lip only decide the verdict.** In testing, `hair_color` came back `#FAF0BE` "Blonde" for a black-haired subject, so hair is shown but never used in the warmth maths.
  - Eye and brow are shown for completeness. Nothing in the verdict depends on them.

### Examples (illustrative)

A sheet caption reads:

```
07  Rust linen overshirt
    upper body · 2 units
```

A verdict reads:

```
You run cool, and your contrast is low.
Warm earth tones flatten you out.
```

## Do's and Don'ts

### Do

- Let the verdict screen be 80% type and 20% image. The sentence is the product.
- Keep the stamp red to a single element per screen.
- Write rejection reasons as human observations: `drains you`, `fights your undertone`, `too close to your skin tone to read`.
- Show the API and the unit count on the demo strip. Judges are looking for integration depth; hide nothing.
- Keep the face in every tile. It is the same face every time, and it is the proof.

### Don't

- No violet, no blue-purple gradient, no glow, no glassmorphism, no bento grid.
- No pill badges above the H1 restating the headline.
- No fake metrics: no "94% match score", no invented customer counts, no fake logo bar.
- No emoji in headings, labels or buttons.
- No rounded card on a coloured background as a generic container.
- No dark mode. The paper is the brand.
- No spinner-only loading. Every wait states what is happening and how many tiles are left.

## Responsive Behavior

### Breakpoints

| Name | Width | Behaviour |
|---|---|---|
| `sm` | < 560px | Sheet 1 column, tiles full width, margin strip hidden, verdict 44px |
| `md` | 560–839px | Sheet 2 columns, margin strip folded into captions |
| `lg` | 840–1119px | Sheet 3 columns, margin strip appears |
| `xl` | ≥ 1120px | Sheet 4 columns, full 48px strip, content 1180px |

### Touch Targets

Minimum 44×44px for every control. The stamp is decorative and never a target. Tile
caption retry links get 44px of vertical hit area even though the text is 13px.

### Collapsing Strategy

- Upload: two drop zones sit side by side at `lg`+, stack at `md` and below, full-body first.
- Verdict: swatch row wraps to 3 per row at `sm`; the underline rule stays attached to the last line of the sentence.
- Sheet: the index strip is the first thing to go. The sheet's outer frame stays at every width — it is what makes it read as a sheet.

### Image Behaviour

`next/image` with explicit `width`/`height`, `sizes` matching the grid, `object-fit: cover`,
`priority` on the first four tiles only. Results are served from our own storage, never
hotlinked from YouCam (their download URLs expire in 2 hours).

## Iteration Guide

1. Build Upload first and screenshot it. If it does not feel like a counter you walk up to, the direction is wrong before any other screen exists.
2. Build the Sheet with fourteen grey placeholders before any API is wired. If the grid does not read as a casting sheet with empty boxes, no amount of real photography will save it.
3. Add the stamp last. It is the loudest element; it should feel earned.
4. Check contrast on every ink-on-paper pair with a real checker, not by eye.
5. Read every rejection reason out loud. If it sounds like a machine apologising, rewrite it.

## Known Gaps

- Typefaces are web-safe choices standing in for a licensed pair; if budget ever allows, the serif should be a real editorial face (Signifier, Domaine) and the grotesque something with more character than Archivo.
- No dark theme is planned. If the product ever needs one, the paper metaphor has to be redesigned, not inverted.
- The 48px left margin strip with rotated index numbers is the riskiest element. If it reads as decoration rather than as the edge of a printed sheet, cut it rather than restyle it.
