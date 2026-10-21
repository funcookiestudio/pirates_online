/* Utilitários pequenos usados por todo o jogo. (THREE é global, vindo do <script> do index.html) */

/** Atalho para document.getElementById */
export const $ = id => document.getElementById(id);

/** Material "Lambert" de cor sólida */
export const M = c => new THREE.MeshLambertMaterial({ color: c });

/** Caixa (box) com cor e posição: largura, altura, profundidade, cor, x, y, z */
export const wb = (w, h, d, c, x, y, z) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c));
  m.position.set(x, y, z);
  return m;
};

/** Agrupa vários objetos 3D em um Group */
export const grp = (...a) => {
  const g = new THREE.Group();
  g.add(...a);
  return g;
};

/** Gira suavemente o objeto `o` em direção ao ângulo `a` (r = velocidade) */
export function turnTo(o, a, r, dt) {
  let d = a - o.rotation.y;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  o.rotation.y += d * (1 - Math.exp(-dt * r));
}

/** O painel do personagem está aberto? */
export const isPanelOpen = () => $('pnl').style.display === 'block' || $('pnl2').style.display === 'block';
