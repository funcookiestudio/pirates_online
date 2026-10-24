/* Transparência em círculo: árvores e pedras que ficam entre a câmera e o personagem
   ganham um buraco redondo em volta dele, para ele nunca sumir atrás de objetos. */
import { cam, ren } from '../core/engine.js';
import { P } from '../entities/player.js';

const U = {
  uPS: { value: new THREE.Vector2(-1e4, -1e4) }, // posição do personagem na tela (pixels do buffer)
  uPD: { value: 0 },                              // profundidade dele na vista da câmera
  uR: { value: 0 },                               // raio do círculo (pixels)
};

/** Aplica o buraco redondo ao material (retorna o próprio material) */
export function xray(mat) {
  mat.userData.xr = 1;
  mat.onBeforeCompile = sh => {
    sh.uniforms.uPS = U.uPS;
    sh.uniforms.uPD = U.uPD;
    sh.uniforms.uR = U.uR;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vXz;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvXz = -mvPosition.z;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vXz;\nuniform vec2 uPS;\nuniform float uPD;\nuniform float uR;')
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        float xd = distance(gl_FragCoord.xy, uPS);
        if (vXz < uPD - 0.6 && xd < uR) {
          // borda pontilhada (dither) para suavizar o círculo
          float f = smoothstep(uR * .72, uR, xd);
          if (f < fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453)) discard;
        }`);
  };
  return mat;
}

const v = new THREE.Vector3();
/** Atualiza a posição do personagem na tela (chamar a cada quadro, antes de renderizar) */
export function updateXray() {
  cam.updateMatrixWorld();
  v.set(P.x, 1, P.z);
  const d = -v.clone().applyMatrix4(cam.matrixWorldInverse).z;
  v.project(cam);
  const s = ren.getDrawingBufferSize(new THREE.Vector2());
  U.uPS.value.set((v.x * .5 + .5) * s.x, (v.y * .5 + .5) * s.y);
  U.uPD.value = d;
  U.uR.value = s.y * .1;
}
