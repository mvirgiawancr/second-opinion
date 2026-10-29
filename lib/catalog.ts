export type Garment = {
  id: string;
  name: string;
  category: 'upper_body' | 'outer' | 'full_body';
  hex: string;
  units: number;
};

// hex is sampled from the centre of the generated photograph
// (spike/sample-colors.ps1), never taken from the prompt text. The photo is what
// the try-on engine sees, so the photo is what the maths must read.
export const CATALOG: Garment[] = [
  { id: 'rust-overshirt', name: 'Rust linen overshirt', category: 'outer', hex: '#ab5533', units: 2 },
  { id: 'camel-knit', name: 'Camel merino crewneck', category: 'upper_body', hex: '#aa815b', units: 2 },
  { id: 'navy-oxford', name: 'Navy oxford shirt', category: 'upper_body', hex: '#113d61', units: 2 },
  { id: 'olive-shirt', name: 'Olive cotton shirt', category: 'upper_body', hex: '#747855', units: 2 },
  { id: 'cream-oxford', name: 'Cream oxford shirt', category: 'upper_body', hex: '#e1dbd0', units: 2 },
  { id: 'ice-linen', name: 'Icy blue linen shirt', category: 'upper_body', hex: '#99b5c5', units: 2 },
  { id: 'charcoal-knit', name: 'Charcoal knit', category: 'upper_body', hex: '#3c4649', units: 2 },
  { id: 'forest-bomber', name: 'Forest bomber', category: 'outer', hex: '#396657', units: 2 },
  { id: 'mustard-cord', name: 'Mustard corduroy shirt', category: 'upper_body', hex: '#c79842', units: 2 },
  { id: 'stone-jacket', name: 'Stone canvas jacket', category: 'outer', hex: '#bdaa8e', units: 2 },
  { id: 'plum-coat', name: 'Plum wool coat', category: 'outer', hex: '#2e1929', units: 2 },
  { id: 'black-leather', name: 'Black leather jacket', category: 'outer', hex: '#2e3637', units: 2 },
  { id: 'oat-trench', name: 'Oatmeal trench coat', category: 'full_body', hex: '#ad9577', units: 2 },
  { id: 'black-long-coat', name: 'Black wool overcoat', category: 'full_body', hex: '#171d1d', units: 2 },
];

export const garmentSrc = (id: string) => `/catalog/${id}.jpg`;

export const CATEGORY_LABEL: Record<Garment['category'], string> = {
  upper_body: 'upper body',
  outer: 'outer layer',
  full_body: 'full look',
};
