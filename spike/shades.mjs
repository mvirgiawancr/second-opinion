// Prints warmth() for candidate lip and hair shades, so the look table is
// checked against the real maths instead of eyeballed. Run: node spike/shades.mjs
const lin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const toLab = (h) => {
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(h.slice(i, i + 2), 16) / 255));
  const X = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const Y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const Z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(X), f(Y), f(Z)];
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
};
const warmth = (h) => {
  const { a, b } = toLab(h);
  if (Math.hypot(a, b) < 8) return 'neutral';
  const hue = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  return (hue >= 20 && hue < 135) || hue >= 340 ? 'warm' : 'cool';
};

const show = (label, hex) => {
  const { L, a, b } = toLab(hex);
  const hue = Math.round(((Math.atan2(b, a) * 180) / Math.PI + 360) % 360);
  console.log(label.padEnd(18), hex, warmth(hex).padEnd(8), 'hue', String(hue).padStart(3), 'L', Math.round(L), 'C', Math.round(Math.hypot(a, b)));
};

for (const [l, h] of [
  ['lip warm brick', '#9C4A3C'],
  ['lip warm terracotta', '#A85540'],
  ['lip cool rose', '#C9527D'],
  ['lip cool plum', '#8E3A5C'],
  ['lip cool blue-red', '#B03A5E'],
  ['lip violet', '#8E5AA8'],
  ['lip orange', '#D2703A'],
  ['hair chestnut', '#5A3220'],
  ['hair espresso', '#33262A'],
  ['hair ash', '#7A7A85'],
  ['hair brass', '#C08A3E'],
  ['hair plum', '#6B3A6B'],
]) show(l, h);
