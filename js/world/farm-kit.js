/* Kit de construção das fazendas (caixas, cilindros, telhados) — mesmas convenções de farm-aves.js:
   coordenadas locais da fazenda (+z = lado da estrada), tudo montado antes da fusão de cenário. */
export function farmKit({ g, solid, M }) {
  const B = (w, h, d, col, x, y, z, p = g, em) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), em ? new THREE.MeshLambertMaterial({ color: col, emissive: em }) : M(col));
    m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; p.add(m); return m;
  };
  const C = (rt, rb, h, col, x, y, z, p = g, seg = 12) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), M(col)); m.position.set(x, y, z); m.castShadow = true; p.add(m); return m; };
  const G = (x, y, z, ry = 0, p = g) => { const q = new THREE.Group(); q.position.set(x, y, z); q.rotation.y = ry; p.add(q); return q; };
  const CONE = (r, h, col, x, y, z, p = g, seg = 12) => { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), M(col)); m.position.set(x, y, z); m.castShadow = true; p.add(m); return m; };
  /** Telhado de duas águas, cumeeira ao longo de x. (cx, y0 = topo da parede, cz) */
  const gable = (cx, y0, cz, w, d, rise, oh, col, col2) => {
    const q = G(cx, 0, cz), half = d / 2 + oh, sl = rise / (d / 2), ang = Math.atan(sl), L = half / Math.cos(ang);
    for (const s of [-1, 1]) {
      const r = G(0, y0 + rise - sl * half / 2 + .02, s * half / 2, 0, q); r.rotation.x = s * ang;
      B(w + 2 * oh, .16, L + .04, col, 0, 0, 0, r);
      for (let k = -3; k <= 3; k++) B(w + 2 * oh + .04, .05, .08, col2, 0, .1, k * L / 7, r);
    }
    B(w + 2 * oh + .1, .2, .34, col2, 0, y0 + rise + .02, 0, q);
    return q;
  };
  /** Empena triangular (parede de topo) em x = px */
  const tri = (px, y0, cz, d, rise, col) => {
    const sh = new THREE.Shape(); sh.moveTo(-d / 2, 0); sh.lineTo(d / 2, 0); sh.lineTo(0, rise);
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: .3, bevelEnabled: false }), M(col)); m.rotation.y = Math.PI / 2; m.position.set(px - .15, y0, cz); m.castShadow = true; g.add(m); return m;
  };
  const found = (w, d, x, z, col = 0x6a6a68) => B(w, 1.6, d, col, x, -.5, z);
  return { B, C, G, CONE, gable, tri, found, solid, M, g };
}
