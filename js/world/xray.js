/* Raio-x (buraco redondo em volta do personagem) removido. Este módulo só mantém a marca `userData.xr` nos materiais. */
/** Raio-x REMOVIDO (o buraco redondo em volta do personagem): `xray` só marca o material e `updateXray` não faz nada.
    Mantidos para os demais módulos não precisarem mudar. */
export function xray(mat) { mat.userData.xr = 1; return mat; }
export function updateXray() {}
