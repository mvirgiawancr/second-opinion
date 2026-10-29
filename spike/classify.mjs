// Classifies the sampled catalogue colours through the same maths the app uses.
// Run: node spike/classify.mjs
import { warmth, contrast, verdict, undertoneOf } from '../lib/color.ts';
import colors from '../lib/demo-colors.json' with { type: 'json' };

const SAMPLED = {
  'rust-overshirt': '#ab5533',
  'camel-knit': '#aa815b',
  'olive-shirt': '#747855',
  'cream-oxford': '#e1dbd0',
  'navy-oxford': '#113d61',
  'ice-linen': '#99b5c5',
  'charcoal-knit': '#3c4649',
  'mustard-cord': '#c79842',
  'forest-bomber': '#396657',
  'plum-coat': '#2e1929',
  'stone-jacket': '#bdaa8e',
  'black-leather': '#2e3637',
  'oat-trench': '#ad9577',
  'black-long-coat': '#171d1d',
};

const skin = colors.color.skin_color;
const undertone = undertoneOf(colors.color);
console.log(`skin ${skin}  lip ${colors.color.lip_color}  -> undertone ${undertone}\n`);

for (const [id, hex] of Object.entries(SAMPLED)) {
  const v = verdict(hex, skin, undertone);
  console.log(
    `${id.padEnd(16)} ${hex}  ${warmth(hex).padEnd(8)} ${contrast(hex, skin).padEnd(7)} ${v.works ? 'WORKS ' : 'REJECT'}  ${v.reason}`,
  );
}
