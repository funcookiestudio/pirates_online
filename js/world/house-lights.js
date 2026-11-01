/* Luz das janelas por casa: o vidro de cada casa tem um id na cor (0xbfe0f0 | id). Dormindo dentro de casa → janela apaga. */
export const HL = { pos: {}, lit: {}, asleep: null };
export const GLASS = 0xbfe0f0;
/** Luzes de ambiente que ficam acesas a noite toda (térreo da taverna): daynight.js liga ao escurecer */
export const ROOM_LIGHTS = [];
export function regLight(id, x, z) { HL.pos[id] = [x, z]; }
