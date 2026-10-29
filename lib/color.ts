export type Warmth = 'warm' | 'cool' | 'neutral';
export type Contrast = 'high' | 'medium' | 'low';

export type FaceColors = {
  skin_color: string;
  lip_color: string;
  eye_color: string;
  eyebrow_color: string;
  hair_color: string;
  hair_color_name: string;
  eye_color_name: string;
};

export type Verdict = { works: boolean; reason: string };

const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const hex2rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

export function toLab(hex: string) {
  const [r, g, b] = hex2rgb(hex).map(lin);
  const X = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const Y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const Z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(X), f(Y), f(Z)];
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

// Warmth from the LAB hue angle, with a chroma floor so greys stay neutral.
// Three naive versions failed before this one: hue banding that put navy (271deg)
// in "warm"; a b*-only axis that called forest green (a=-21.5, b=+8.6) neutral;
// and a green boundary at 100deg that called olive (hue 115, yellow-green) cool.
// The split sits at 135deg: yellow-green is warm, blue-green and beyond is cool.
// LAB hue landmarks: red 40, orange 60, yellow 100, green 150, cyan 200, blue 280.
export function warmth(hex: string): Warmth {
  const { a, b } = toLab(hex);
  if (Math.hypot(a, b) < 8) return 'neutral';
  const hue = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  return (hue >= 20 && hue < 135) || hue >= 340 ? 'warm' : 'cool';
}

// Contrast is lightness distance from the skin, not saturation.
export function contrast(garmentHex: string, skinHex: string): Contrast {
  const d = Math.abs(toLab(garmentHex).L - toLab(skinHex).L);
  return d >= 35 ? 'high' : d >= 15 ? 'medium' : 'low';
}

export function deltaE(a: string, b: string) {
  const x = toLab(a);
  const y = toLab(b);
  return Math.hypot(x.a - y.a, x.b - y.b);
}

// Skin and lip only: hair_color came back "#FAF0BE / Blonde" for a black-haired
// subject on two separate runs, so it is displayed and never used here.
export function undertoneOf(colors: Pick<FaceColors, 'skin_color' | 'lip_color'>): Warmth {
  const skin = warmth(colors.skin_color);
  if (skin !== 'neutral') return skin;
  const lip = warmth(colors.lip_color);
  return lip === 'neutral' ? 'neutral' : lip;
}

export function verdict(garmentHex: string, skinHex: string, undertone: Warmth): Verdict {
  const g = warmth(garmentHex);
  const c = contrast(garmentHex, skinHex);
  if (g !== 'neutral' && g !== undertone)
    return { works: false, reason: `fights your ${undertone} undertone` };
  if (c === 'low' && deltaE(garmentHex, skinHex) < 14)
    return { works: false, reason: 'too close to your skin tone to read' };
  if (c === 'high') return { works: true, reason: `strong contrast, same ${undertone} family` };
  if (c === 'low') return { works: true, reason: `soft and tonal, stays in your ${undertone} family` };
  return { works: true, reason: `holds its own against your skin, ${undertone} family` };
}

// --- self-check: node lib/color.ts ---------------------------------------
if (process.argv[1]?.endsWith('color.ts')) {
  let n = 0;
  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error('FAIL: ' + msg);
    n++;
    console.log('ok  ', msg);
  };

  const skin = '#ab8568';
  assert(warmth(skin) === 'warm', 'warm skin reads warm');
  assert(warmth('#22364f') === 'cool', 'navy shirt reads cool');
  assert(warmth('#f0e6d2') === 'warm', 'cream reads warm, not cool');
  assert(warmth('#b9d4e8') === 'cool', 'icy blue reads cool');
  assert(warmth('#a4552e') === 'warm', 'rust reads warm');
  assert(warmth('#1d4a34') === 'cool', 'forest green reads cool');
  assert(warmth('#626749') === 'warm', 'olive reads warm, not cool');
  assert(warmth('#6f6f6f') === 'neutral', 'grey reads neutral');

  assert(contrast('#22364f', skin) === 'high', 'navy is high contrast on this skin');
  assert(contrast('#b08a6d', skin) === 'low', 'a garment near the skin lightness is low contrast');

  assert(undertoneOf({ skin_color: skin, lip_color: '#d89aa2' }) === 'warm', 'undertone comes from skin');
  assert(
    undertoneOf({ skin_color: '#8a8a86', lip_color: '#c47a7a' }) === 'warm',
    'a neutral skin falls back to the lip colour',
  );

  assert(verdict('#22364f', skin, 'warm').works === false, 'navy rejected for warm skin');
  assert(verdict('#a4552e', skin, 'warm').works === true, 'rust accepted for warm skin');
  assert(verdict('#6f6f6f', skin, 'warm').works === true, 'neutral grey never clashes');
  assert(
    verdict('#c9a98f', skin, 'warm').reason.includes('skin tone'),
    'beige too close to skin is rejected for that reason',
  );

  console.log(`\n${n} colour checks pass`);
}
