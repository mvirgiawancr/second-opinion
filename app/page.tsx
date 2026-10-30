'use client';

import { useRef, useState } from 'react';
import { CATALOG, CATEGORY_LABEL, garmentSrc, type Garment } from '@/lib/catalog';
import { contrast, toLab, undertoneOf, verdict, warmth, type FaceColors } from '@/lib/color';

type Phase = 'photo' | 'verdict' | 'sheet' | 'detail';
type Tile = { state: 'pending' | 'done' | 'failed'; url?: string; error?: string };
type Slot = 'selfie' | 'body';

const MAX_BYTES = 10 * 1024 * 1024;

const SLOTS: { key: Slot; label: string; hint: string; demo: string }[] = [
  {
    key: 'body',
    label: 'Full body',
    hint: 'Standing, facing the camera, shoes in frame.',
    demo: '/demo/body.jpg',
  },
  {
    key: 'selfie',
    label: 'Close-up',
    hint: 'Face fills the frame. Plain background, no filter.',
    demo: '/demo/selfie.jpg',
  },
];

const VERDICT_COPY: Record<string, { line: string; word: string; consequence: string }> = {
  warm: {
    line: 'You run',
    word: 'warm',
    consequence: 'Cool blues and hard greys fight you. Rust, olive, mustard and cream sit right.',
  },
  cool: {
    line: 'You run',
    word: 'cool',
    consequence: 'Warm earth tones flatten you out. Blues, plums and true greens sit right.',
  },
  neutral: {
    line: "You're",
    word: 'neutral',
    consequence: 'Almost nothing clashes. What matters for you is contrast, not temperature.',
  },
};

const TILE_ERROR: Record<string, string> = {
  error_pose: 'The garment could not be placed on this pose.',
  error_below_min_image_size: 'The body photo is too small to read.',
  error_multi_person: 'More than one person was found.',
  task_timeout: 'The task timed out.',
};

const pad = (n: number) => String(n).padStart(2, '0');

// Print language, not decoration: a specimen card says who, when, and how many.
function specimen(hex: string) {
  const { L, a, b } = toLab(hex);
  const hue = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  return { L: Math.round(L), hue: Math.round(hue), chroma: Math.round(Math.hypot(a, b)) };
}

export default function Page() {
  const [phase, setPhase] = useState<Phase>('photo');
  const [files, setFiles] = useState<Record<Slot, File | null>>({ selfie: null, body: null });
  const [previews, setPreviews] = useState<Record<Slot, string | null>>({ selfie: null, body: null });
  const [dropError, setDropError] = useState<Record<Slot, string | null>>({ selfie: null, body: null });
  const [dragging, setDragging] = useState<Slot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [colors, setColors] = useState<FaceColors | null>(null);
  const [bodyId, setBodyId] = useState<string | null>(null);
  const [tiles, setTiles] = useState<Record<string, Tile>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [readAt, setReadAt] = useState('');
  const urls = useRef<string[]>([]);

  const undertone = colors ? undertoneOf(colors) : 'neutral';
  const ready = files.selfie && files.body;
  const done = Object.values(tiles).filter((t) => t.state !== 'pending').length;

  const judged = colors
    ? CATALOG.map((g, i) => ({ g, n: i + 1, v: verdict(g.hex, colors.skin_color, undertone) }))
    : [];
  const approved = judged.filter((x) => x.v.works);
  const rejected = judged.filter((x) => !x.v.works);

  function setSlot(slot: Slot, file: File | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setDropError((d) => ({ ...d, [slot]: 'That is not an image file.' }));
      return;
    }
    if (file.size > MAX_BYTES) {
      setDropError((d) => ({ ...d, [slot]: 'Over 10MB. Use a smaller photo.' }));
      return;
    }
    setDropError((d) => ({ ...d, [slot]: null }));
    setFiles((f) => ({ ...f, [slot]: file }));
    setPreviews((p) => ({ ...p, [slot]: URL.createObjectURL(file) }));
    setError(null);
  }

  async function useDemo() {
    setBusy(true);
    setError(null);
    try {
      const loaded = await Promise.all(
        SLOTS.map(async (s) => {
          const res = await fetch(s.demo);
          if (!res.ok) throw new Error('demo photo missing');
          const blob = await res.blob();
          return [s.key, new File([blob], `${s.key}.jpg`, { type: 'image/jpeg' })] as const;
        }),
      );
      for (const [slot, file] of loaded) setSlot(slot, file);
    } catch {
      setError('The demo photos could not be loaded.');
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    if (!files.selfie || !files.body) return;
    setBusy(true);
    setError(null);

    const form = new FormData();
    form.set('selfie', files.selfie);
    form.set('body', files.body);

    let res: Response;
    try {
      res = await fetch('/api/analyze', { method: 'POST', body: form });
    } catch {
      setBusy(false);
      setError('Could not reach the server. Check the connection and try again.');
      return;
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      setError(json.error ?? 'That photo could not be read. Try a clearer one.');
      return;
    }

    setColors(json.colors as FaceColors);
    setBodyId(json.bodyId as string);
    setTiles(Object.fromEntries(CATALOG.map((g) => [g.id, { state: 'pending' as const }])));
    setReadAt(
      new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    );
    setBusy(false);
    setPhase('verdict');
    void runAll(json.bodyId as string);
  }

  async function runAll(id: string) {
    await Promise.all(CATALOG.map((g) => runOne(id, g)));
  }

  async function runOne(id: string, g: Garment) {
    setTiles((t) => ({ ...t, [g.id]: { state: 'pending' } }));
    // One retry: fourteen requests land at once, and a rate-limit blip should not
    // become a permanent hole in the sheet.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch('/api/tryon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bodyId: id, garmentId: g.id }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? 'failed');
        }
        const url = URL.createObjectURL(await res.blob());
        urls.current.push(url);
        setTiles((t) => ({ ...t, [g.id]: { state: 'done', url } }));
        return;
      } catch (e) {
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        setTiles((t) => ({ ...t, [g.id]: { state: 'failed', error: (e as Error).message } }));
      }
    }
  }

  function reset() {
    urls.current.forEach(URL.revokeObjectURL);
    urls.current = [];
    setPhase('photo');
    setFiles({ selfie: null, body: null });
    setPreviews({ selfie: null, body: null });
    setDropError({ selfie: null, body: null });
    setColors(null);
    setBodyId(null);
    setTiles({});
    setSelected(null);
    setError(null);
  }

  function open(id: string) {
    setSelected(id);
    setPhase('detail');
  }

  const crumbs = (
    <nav className="crumbs" aria-label="Steps">
      <button type="button" onClick={reset} aria-current={phase === 'photo' ? 'step' : undefined}>
        photo
      </button>
      <span className="sep">·</span>
      <button
        type="button"
        onClick={() => colors && setPhase('verdict')}
        disabled={!colors}
        aria-current={phase === 'verdict' ? 'step' : undefined}
      >
        verdict
      </button>
      <span className="sep">·</span>
      <button
        type="button"
        onClick={() => colors && setPhase('sheet')}
        disabled={!colors}
        aria-current={phase === 'sheet' ? 'step' : undefined}
      >
        sheet
      </button>
      <span className="grow" />
      {colors && (
        <button type="button" className="btn-text" onClick={reset}>
          start over
        </button>
      )}
    </nav>
  );

  return (
    <>
      <header className="topstrip">
        <span className="wordmark">Second Opinion</span>
        <span className="apistrip">YouCam Skin AI · Clothes VTO · 14 garments per sheet</span>
      </header>

      {phase === 'photo' && (
        <main className="shell">
          {crumbs}
          <div className="upload-head">
            <div className="upload-copy">
              <h1 className="verdict-xl">Somebody has to tell you no.</h1>
              <p className="lead body-muted">
                Two photos: we read your colouring, then put fourteen garments on your own body and
                stamp the ones that will not do you any favours — with the reason.
              </p>
            </div>
            {/* A real result, on the landing page, before anything is uploaded.
                "Trust us" is a weak claim; showing the stamp is the whole pitch. */}
            <figure className="upload-example">
              <div className="example-print">
                <img src="/example/navy-rejected.jpg" alt="The demo subject in the navy oxford" />
                <span className="stamp">Not your colour</span>
              </div>
              <figcaption className="mono">
                03 navy oxford · rejected · fights a warm undertone
              </figcaption>
            </figure>
          </div>

          <div className="drop-row">
            {SLOTS.map((slot) => (
              <label
                key={slot.key}
                className={[
                  'drop',
                  previews[slot.key] ? 'drop-filled' : '',
                  dragging === slot.key ? 'is-dragging' : '',
                  dropError[slot.key] ? 'has-error' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(slot.key);
                }}
                onDragLeave={() => setDragging(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(null);
                  setSlot(slot.key, e.dataTransfer.files[0] ?? null);
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSlot(slot.key, e.target.files?.[0] ?? null)}
                />
                {previews[slot.key] && <img src={previews[slot.key]!} alt="" />}
                <span className="drop-text">
                  <span className="label">{slot.label}</span>
                  <span className="drop-hint">
                    {dropError[slot.key] ?? (previews[slot.key] ? 'Click to replace' : slot.hint)}
                  </span>
                </span>
              </label>
            ))}

            {/* The third column is the receipt: what happens to the photos, and
                how the verdict is decided. Empty space with no information in it
                is not calm, it is unfinished. */}
            <aside className="method">
              <p className="label">How it is read</p>
              <p className="caption body-muted">
                Skin and lip colour come from YouCam Skin AI. Garment colours are sampled from the
                catalogue photograph itself, then compared in CIELAB: hue angle decides temperature,
                lightness distance decides contrast.
              </p>
              <p className="caption body-muted">
                Nothing is scored by a language model, and nothing is invented: every number on the
                sheet comes from a returned hex value.
              </p>
              <p className="mono method-figures">
                skin-tone-analysis ×1
                <br />
                cloth-v4 ×14
                <br />
                28 units
              </p>
            </aside>
          </div>

          <div className="upload-actions">
            <button type="button" className="btn-primary" onClick={start} disabled={!ready || busy}>
              {busy ? 'Reading your colouring…' : 'Read my colouring'}
            </button>
            <button type="button" className="btn-text" onClick={useDemo} disabled={busy}>
              no photos? use the demo subject
            </button>
            <span className="why">
              {ready
                ? 'Fourteen try-ons take about half a minute.'
                : 'Both photos are needed: colour is read from the close-up, garments go on the full-body shot.'}
            </span>
          </div>

          {error && <p className="notice">{error}</p>}

          {/* The wardrobe, shown before it is asked for: the user should know what
              fourteen garments means before handing over a photo. */}
          <section className="wardrobe">
            <div className="wardrobe-head">
              <p className="label">The fourteen</p>
              <p className="mono">every one generated for this demo · no third-party marks</p>
            </div>
            <ol className="wardrobe-strip">
              {CATALOG.map((g, i) => (
                <li key={g.id}>
                  <div className="wardrobe-print">
                    <img src={garmentSrc(g.id)} alt={g.name} loading="lazy" />
                  </div>
                  <span className="mono">{pad(i + 1)}</span>
                </li>
              ))}
            </ol>
          </section>
        </main>
      )}

      {phase === 'verdict' && colors && (
        <main className="shell">
          {crumbs}
          <div className="verdict-screen">
            <div className="verdict-lead">
              <p className="mono subject-line">
                subject 01 · {readAt} · {pad(approved.length)} approved / {pad(rejected.length)}{' '}
                rejected
              </p>
              <h1 className="verdict-xl">
                {VERDICT_COPY[undertone].line}{' '}
                <span className="verdict-line">{VERDICT_COPY[undertone].word}</span>.
              </h1>
              <p className="verdict-note">{VERDICT_COPY[undertone].consequence}</p>
              <div className="verdict-actions">
                <button type="button" className="btn-primary" onClick={() => setPhase('sheet')}>
                  Open the sheet
                </button>
                <button type="button" className="btn-secondary" onClick={reset}>
                  Try other photos
                </button>
              </div>

              {/* The product thesis, stated before the sheet: the rejections and
                  their reasons. If this list is not convincing, nothing below is. */}
              <div className="reasons">
                <p className="label">What failed, and why</p>
                <ol>
                  {rejected.map(({ g, n, v }) => (
                    <li key={g.id}>
                      <button type="button" onClick={() => open(g.id)}>
                        <span className="mono">{pad(n)}</span>
                        <span className="caption reasons-name">{g.name}</span>
                        <span className="caption reasons-why">{v.reason}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <aside className="subject-card">
              {previews.selfie && (
                <div className="subject-print">
                  <img src={previews.selfie} alt="Your close-up" />
                </div>
              )}
              <div className="subject-body">
                <div className="panel-title">
                  <span className="label">Read from the face</span>
                  <span className="mono">skin-tone-analysis</span>
                </div>
                <div className="swatches">
                  <Swatch hex={colors.skin_color} label="skin" />
                  <Swatch hex={colors.lip_color} label="lip" />
                  <Swatch hex={colors.eye_color} label="eye" />
                  <Swatch hex={colors.eyebrow_color} label="brow" />
                  <Swatch hex={colors.hair_color} label="hair" muted />
                </div>
                <p className="caption body-muted swatch-note">
                  Skin and lip decide the verdict. Hair is shown but never used: the API reports
                  blonde on dark hair, so trusting it would invert the reading.
                </p>
              </div>
            </aside>
          </div>

          {/* The whole product in one graphic: the fourteen colours, split. */}
          <section className="palette">
            <div className="palette-row">
              <p className="label palette-key">
                Approved <span className="mono">{pad(approved.length)}</span>
              </p>
              <div className="chips">
                {approved.map(({ g, n }) => (
                  <Chip key={g.id} hex={g.hex} n={n} name={g.name} onPick={() => open(g.id)} />
                ))}
              </div>
            </div>
            <div className="palette-row">
              <p className="label palette-key">
                Rejected <span className="mono">{pad(rejected.length)}</span>
              </p>
              <div className="chips">
                {rejected.map(({ g, n }) => (
                  <Chip key={g.id} hex={g.hex} n={n} name={g.name} onPick={() => open(g.id)} />
                ))}
              </div>
            </div>
          </section>
        </main>
      )}

      {phase === 'sheet' && colors && (
        <main className="sheet-wrap">
          {crumbs}

          <div className="sheet-masthead">
            {previews.selfie && (
              <div className="masthead-print">
                <img src={previews.selfie} alt="Subject" />
              </div>
            )}
            <div className="masthead-title">
              <p className="mono">
                casting sheet · subject 01 · {readAt} · {undertone} undertone
              </p>
              <h2 className="verdict-lg">
                {rejected.length} of {CATALOG.length} rejected.
              </h2>
            </div>
            <dl className="masthead-figures">
              <div>
                <dt>approved</dt>
                <dd>{pad(approved.length)}</dd>
              </div>
              <div>
                <dt>rejected</dt>
                <dd>{pad(rejected.length)}</dd>
              </div>
              <div>
                <dt>read</dt>
                <dd>
                  {done}/{CATALOG.length}
                </dd>
              </div>
            </dl>
          </div>

          <div className="sheet-body">
            <i className="reg-mark tl" aria-hidden="true" />
            <i className="reg-mark tr" aria-hidden="true" />
            <i className="reg-mark bl" aria-hidden="true" />
            <i className="reg-mark br" aria-hidden="true" />
            <div className="sheet-index" aria-hidden="true">
              <span>casting sheet · 14</span>
            </div>
            <div className="tiles">
              {judged.map(({ g, n, v }) => {
                const tile = tiles[g.id] ?? { state: 'pending' as const };
                return (
                  <button
                    key={g.id}
                    type="button"
                    className={[
                      'tile',
                      g.category === 'full_body' ? 'is-look' : '',
                      tile.state === 'pending' ? 'tile-pending' : '',
                      tile.state === 'failed' ? 'tile-failed' : '',
                      tile.state === 'done' && !v.works ? 'is-rejected' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => open(g.id)}
                  >
                    <span className="tile-print">
                      {tile.state === 'done' && <img src={tile.url} alt={`${g.name} on you`} />}
                      {tile.state === 'pending' && <span className="mono">reading…</span>}
                      {tile.state === 'failed' && (
                        <span className="tile-fail-note">
                          {TILE_ERROR[tile.error ?? ''] ?? 'This one could not be placed.'}
                        </span>
                      )}
                      {tile.state === 'done' && !v.works && (
                        <span className="stamp">
                          {v.reason.startsWith('fights') ? 'Not your colour' : "Doesn't work"}
                        </span>
                      )}
                    </span>
                    <span className="tile-cap">
                      <span className="mono tile-n">{pad(n)}</span>
                      <span className="caption">{g.name}</span>
                    </span>
                    <span className="tile-meta">
                      {CATEGORY_LABEL[g.category]} · {g.units} units
                    </span>
                    {!v.works && <span className="tile-why">{v.reason}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="method method-row">
            <div>
              <p className="label">Method</p>
              <p className="caption body-muted">
                {CATALOG.length} Clothes VTO tasks ran in parallel against one uploaded body photo.
                Colour was read once from the close-up. Results are pulled to the browser
                immediately because YouCam download URLs expire after two hours.
              </p>
            </div>
            <p className="mono method-figures">
              skin-tone-analysis ×1
              <br />
              cloth-v4 ×{CATALOG.length}
              <br />
              {CATALOG.length * 2} units
            </p>
          </div>
        </main>
      )}

      {phase === 'detail' && colors && selected && (
        <Detail
          id={selected}
          colors={colors}
          tile={tiles[selected]}
          onBack={() => setPhase('sheet')}
          onRetry={() => bodyId && runOne(bodyId, CATALOG.find((g) => g.id === selected)!)}
          onPick={open}
        />
      )}
    </>
  );
}

function Swatch({ hex, label, muted }: { hex: string; label: string; muted?: boolean }) {
  return (
    <div className="swatch">
      <i style={{ background: hex }} />
      <span className="label">{label}</span>
      <span className="mono">{muted ? 'unused' : hex.toUpperCase()}</span>
    </div>
  );
}

function Chip({
  hex,
  n,
  name,
  onPick,
}: {
  hex: string;
  n: number;
  name: string;
  onPick: () => void;
}) {
  return (
    <button type="button" className="chip" onClick={onPick} title={name}>
      <i style={{ background: hex }} />
      <span className="mono">{pad(n)}</span>
    </button>
  );
}

function Detail({
  id,
  colors,
  tile,
  onBack,
  onRetry,
  onPick,
}: {
  id: string;
  colors: FaceColors;
  tile?: Tile;
  onBack: () => void;
  onRetry: () => void;
  onPick: (id: string) => void;
}) {
  const g = CATALOG.find((x) => x.id === id)!;
  const undertone = undertoneOf(colors);
  const v = verdict(g.hex, colors.skin_color, undertone);
  const index = CATALOG.indexOf(g) + 1;
  const garmentLab = specimen(g.hex);
  const skinLab = specimen(colors.skin_color);
  const dL = Math.abs(garmentLab.L - skinLab.L);

  // Four nearest in the same category, measured in LAB so "nearest" means the
  // colour a stylist would actually reach for next.
  const alternatives = CATALOG.map((x, i) => ({ g: x, n: i + 1 }))
    .filter(({ g: x }) => x.id !== g.id && x.category === g.category)
    .map((x) => {
      const p = toLab(x.g.hex);
      const q = toLab(g.hex);
      return { ...x, d: Math.hypot(p.L - q.L, p.a - q.a, p.b - q.b) };
    })
    .sort((p, q) => p.d - q.d)
    .slice(0, 4)
    .map((x) => ({ g: x.g, n: x.n, v: verdict(x.g.hex, colors.skin_color, undertone) }));

  return (
    <main className="shell">
      <nav className="crumbs" aria-label="Steps">
        <button type="button" onClick={onBack}>
          sheet
        </button>
        <span className="sep">·</span>
        <span className="current">{g.name.toLowerCase()}</span>
      </nav>

      <div className="detail">
        <div className="detail-prints">
          <figure className="detail-fig">
            <figcaption className="label">Garment</figcaption>
            <div className="detail-print">
              <img src={garmentSrc(g.id)} alt={g.name} />
            </div>
          </figure>
          <figure className="detail-fig">
            <figcaption className="label">On you</figcaption>
            <div className="detail-print">
              {tile?.state === 'done' ? (
                <img src={tile.url} alt={`${g.name} on you`} />
              ) : (
                <div className="detail-wait">
                  <p className="caption body-muted">
                    {tile?.state === 'failed'
                      ? (TILE_ERROR[tile.error ?? ''] ?? 'This one could not be placed.')
                      : 'Still being placed on your photo.'}
                  </p>
                  {tile?.state === 'failed' && (
                    <button type="button" className="btn-text" onClick={onRetry}>
                      try again
                    </button>
                  )}
                </div>
              )}
            </div>
          </figure>
        </div>

        <div className="detail-body">
          <p className="mono">
            {pad(index)} · {CATEGORY_LABEL[g.category]} · {g.units} units
          </p>
          <h2 className="verdict-lg">{g.name}</h2>
          <p className={v.works ? 'detail-verdict is-good' : 'detail-verdict'}>
            {v.works ? 'This one holds.' : 'This one fights you.'}
          </p>
          <p className="lead">{v.reason[0].toUpperCase() + v.reason.slice(1)}.</p>

          <div className="detail-table">
            <div className="detail-row">
              <span className="label">Garment</span>
              <span className="detail-swatch" style={{ background: g.hex }} />
              <span className="mono">{g.hex.toUpperCase()}</span>
            </div>
            <div className="detail-row">
              <span className="label">Temperature</span>
              <span className="caption">{warmth(g.hex)}</span>
            </div>
            <div className="detail-row">
              <span className="label">Contrast</span>
              <span className="caption">{contrast(g.hex, colors.skin_color)}</span>
            </div>
            <div className="detail-row">
              <span className="label">Your skin</span>
              <span className="detail-swatch" style={{ background: colors.skin_color }} />
              <span className="mono">{colors.skin_color.toUpperCase()}</span>
            </div>
            <div className="detail-row">
              <span className="label">Your tone</span>
              <span className="caption">{undertone}</span>
            </div>
          </div>

          {/* The arithmetic, shown. Judges ask how it was decided; this answers it
              without a paragraph of prose. */}
          <div className="detail-math">
            <p className="label">The arithmetic</p>
            <p className="mono">
              hue {garmentLab.hue}° · chroma {garmentLab.chroma} · ΔL {dL} against your skin (L{' '}
              {skinLab.L})
            </p>
            <p className="caption body-muted">
              Hue angle under 135° reads warm; chroma under 8 reads neutral. ΔL under 15 is low
              contrast, under 14 from the skin is unreadable.
            </p>
          </div>

          <button type="button" className="btn-secondary detail-back" onClick={onBack}>
            Back to the sheet
          </button>
        </div>
      </div>

      <section className="variants">
        <p className="label">Then what does — same category, nearest colours first</p>
        <div className="variants-strip">
          {alternatives.map(({ g, n, v }) => (
            <button key={g.id} type="button" className="variant" onClick={() => onPick(g.id)}>
              <span className="variant-print">
                <img src={garmentSrc(g.id)} alt={g.name} loading="lazy" />
              </span>
              <span className="mono">
                {pad(n)} · {v.works ? 'approved' : 'rejected'}
              </span>
              <span className="caption">{g.name}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
