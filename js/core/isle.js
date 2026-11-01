/* Ilha da Medusa: ilha especial (semente 'medusa'), só com serpentes, esqueletos e mortos-vivos; os moradores viraram pedra e a Medusa é a chefe final. */
const seed = () => {
  try { const q = typeof location !== 'undefined' && new URLSearchParams(location.search).get('seed'); if (q) return q; return localStorage.getItem('pirata-ilha'); } catch (e) { return null; }
};
export const MEDUSA_ISLE = seed() === 'medusa';
/** Ilha dos Dragões (semente 'dragoes'): wivernos e dragões nos postos, o Dragão Ancestral no covil; céu em brasa e terra de cinzas */
export const DRAGON_ISLE = seed() === 'dragoes';
/** Ilhas de ruínas e acampamentos (sem vila nem castelo, só o barqueiro no cais): cada uma tem seu tema e chefe */
export const VAMPIRE_ISLE = seed() === 'vampiros';   // zumbis, esqueletos, vampiros e múmias; o Conde Vampiro no castelo em ruínas
export const HYDRA_ISLE = seed() === 'hidra';        // pântano de esqueletos e serpentes; a Hidra no fundo do brejo
export const MUMMY_ISLE = seed() === 'mumia';        // deserto de caveiras, múmias e bandidos; o Faraó Múmia na pirâmide
export const RUINS_ISLE = VAMPIRE_ISLE || HYDRA_ISLE || MUMMY_ISLE;
/** A balsa para a ilha só aparece depois de derrotar a Medusa uma vez (marcado em combat.js) */
export const medusaKilled = () => { try { return localStorage.getItem('pirata-medusa') === '1'; } catch (e) { return false; } };
export const markMedusaKilled = () => { try { localStorage.setItem('pirata-medusa', '1'); } catch (e) { /* sem armazenamento */ } };
