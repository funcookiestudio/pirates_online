/* Classes de personagem: escolhidas na criação (chars.js guarda a chave em `k`).
   Personagens antigos (sem classe) usam NEUTRA: nada muda para eles.
   hp/mp/dmg/sp = valores iniciais · g = ganho por nível [vida, mana, dano]
   melee/ranged/area = multiplicador de dano (corpo a corpo · arma de fogo/arremesso · giro e bomba)
   crit = chance de crítico · dr = redução de dano · rcd = multiplicador da recarga da esquiva */
export const CLASSES = {
  guerreiro: { n: 'Guerreiro', fx: [0xff5a2a, 0xffd070], ic: '⚔️', d: 'Tanque. Muita vida e golpes pesados corpo a corpo, mas anda mais devagar.', hp: 130, mp: 40, dmg: 13, sp: 3.0, g: [20, 5, 3], melee: 1.2, ranged: .9, area: 1, crit: .15, dr: .08, rcd: 1.2 },
  cacador: { n: 'Caçador', fx: [0x6bd04a, 0xe8f5a0], ic: '🏹', d: 'Dano à distância com armas de fogo e arremesso, boa esquiva, menos vida.', hp: 90, mp: 60, dmg: 12, sp: 3.3, g: [12, 8, 3], melee: .9, ranged: 1.3, area: 1, crit: .18, dr: 0, rcd: .7 },
  mago: { n: 'Mago', fx: [0x9a6bff, 0x7fd8ff], ic: '🔮', d: 'Habilidades em área (giro e bomba) muito mais fortes e rápidas, muita mana, pouca vida.', hp: 80, mp: 110, dmg: 11, sp: 3.2, g: [10, 14, 3], melee: .85, ranged: .9, area: 1.5, crit: .15, dr: 0, rcd: 1, cd: .7 },
  ladino: { n: 'Ladino', fx: [0x35d6c4, 0x6a7a8a], ic: '🗡️', d: 'Veloz e furtivo: muito crítico e esquiva rápida, vida média.', hp: 95, mp: 55, dmg: 12, sp: 3.6, g: [13, 7, 3], melee: 1.05, ranged: 1.05, area: 1, crit: .28, dr: 0, rcd: .6 },
};
export const NEUTRA = { n: 'Pirata', fx: [0xaaddff, 0xffffff], hp: 100, mp: 60, dmg: 12, sp: 3.2, g: [15, 8, 3], melee: 1, ranged: 1, area: 1, crit: .15, dr: 0, rcd: 1, cd: 1 };
export const CLASS_KEYS = Object.keys(CLASSES);
export const classOf = c => (c && CLASSES[c.k]) || NEUTRA;
