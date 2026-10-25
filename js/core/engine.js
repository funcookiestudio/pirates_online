/* Motor 3D: cena, câmera, renderizador e luzes. */

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1b2a30);
scene.fog = new THREE.Fog(0x1b2a30, 30, 60);

export const cam = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, .1, 72);

export const ren = new THREE.WebGLRenderer({ antialias: !matchMedia('(pointer: coarse)').matches, powerPreference: 'high-performance' })   // celular: sem MSAA (caro em GPU móvel);
ren.setPixelRatio(Math.min(devicePixelRatio, matchMedia('(pointer: coarse)').matches ? 1.25 : 2));
ren.setSize(innerWidth, innerHeight);
document.body.prepend(ren.domElement);

export const hemi = new THREE.HemisphereLight(0xaaccdd, 0x443322, .7);
scene.add(hemi);

/** Tocha que acompanha o jogador */
export const torch = new THREE.PointLight(0xffb060, 1.2, 22);
scene.add(torch);

addEventListener('resize', () => {
  cam.aspect = innerWidth / innerHeight;
  cam.updateProjectionMatrix();
  ren.setSize(innerWidth, innerHeight);
});
