/* Ilha da Medusa: ilha especial (semente 'medusa'), só com serpentes, esqueletos e mortos-vivos; os moradores viraram pedra e a Medusa é a chefe final. */
const seed = () => {
  try { const q = typeof location !== 'undefined' && new URLSearchParams(location.search).get('seed'); if (q) return q; return localStorage.getItem('pirata-ilha'); } catch (e) { return null; }
};
export const MEDUSA_ISLE = seed() === 'medusa';
/** Ilha dos Dragões (semente 'dragoes'): wivernos e dragões nos postos, o Dragão Ancestral no covil; céu em brasa e terra de cinzas */
export const DRAGON_ISLE = seed() === 'dragoes';
/** A balsa para a ilha só aparece depois de derrotar a Medusa uma vez (marcado em combat.js) */
export const medusaKilled = () => { try { return localStorage.getItem('pirata-medusa') === '1'; } catch (e) { return false; } };
export const markMedusaKilled = () => { try { localStorage.setItem('pirata-medusa', '1'); } catch (e) { /* sem armazenamento */ } };
