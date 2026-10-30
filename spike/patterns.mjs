// Prints the pattern labels the makeup engine accepts, so we never guess a name.
// Run: node spike/patterns.mjs
const get = async (u) => (await fetch(u)).json();

for (const cat of ['blush', 'eye_shadow']) {
  const j = await get(`https://plugins-media.makeupar.com/wcm-saas/patterns/${cat}.json`);
  const list = j.patterns ?? j;
  console.log(cat, JSON.stringify(list.slice(0, 8).map((p) => [p.label, p.colorNum])));
}

for (const name of ['lipshape', 'lip_shape']) {
  const r = await fetch(`https://plugins-media.makeupar.com/wcm-saas/patterns/${name}.json`);
  console.log(name, r.status, r.ok ? JSON.stringify(await r.json()).slice(0, 300) : '');
}
