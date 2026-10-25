/* Personagens do jogador (até 5 vagas): nome, gênero e um save próprio por personagem.
   Sem dependências: é lido antes de o jogo carregar (tela de seleção) e pelo player.js/save.js para saber quem está jogando. */
const KEY = 'pirata-arpg:chars:v1', LEGACY = 'pirata-arpg:save:v1';
export const MAX_CHARS = 5;

let db = { list: [], active: null };
const store = {
  get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sem armazenamento */ } },
  del: k => { try { localStorage.removeItem(k); } catch (e) { /* ignora */ } },
};
function persist() { store.set(KEY, JSON.stringify(db)); }
function load() {
  try { const d = JSON.parse(store.get(KEY)); if (d && Array.isArray(d.list)) db = { list: d.list.filter(c => c && c.id && c.name).slice(0, MAX_CHARS), active: d.active || null }; } catch (e) { /* começa vazio */ }
  // save antigo (um só personagem): vira o primeiro personagem, para ninguém perder progresso
  if (!db.list.length && store.get(LEGACY)) {
    const c = { id: newId(), name: 'Pirata', f: false, t: Date.now() };
    store.set(saveKey(c.id), store.get(LEGACY)); store.del(LEGACY);
    db.list.push(c); db.active = c.id; persist();
  }
}
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

/** Chave do save de um personagem (sem id: a chave antiga, usada só em modo de desenvolvimento) */
export const saveKey = id => id ? LEGACY + ':' + id : LEGACY;

export const chars = () => db.list;
export const activeChar = () => db.list.find(c => c.id === db.active) || null;
/** Chave de armazenamento própria do personagem ativo (`base` + id) */
export const charKey = base => { const c = activeChar(); return c ? base + ':' + c.id : base; };

export function createChar(name, female) {
  name = String(name || '').trim().slice(0, 14);
  if (name.length < 2 || db.list.length >= MAX_CHARS) return null;
  const c = { id: newId(), name, f: !!female, t: Date.now() };
  db.list.push(c); persist();
  return c;
}
export function deleteChar(id) {
  db.list = db.list.filter(c => c.id !== id);
  if (db.active === id) db.active = null;
  store.del(saveKey(id)); store.del('pirata-tesouro-v1:' + id);
  persist();
}
export function setActive(id) { db.active = id; const c = db.list.find(q => q.id === id); if (c) c.last = Date.now(); persist(); }

/** Resumo para a lista: nível e ouro lidos do save do personagem */
export function summary(id) {
  try { const s = JSON.parse(store.get(saveKey(id))); if (s && s.player) return { lv: s.player.lv | 0 || 1, gold: s.player.gold | 0, saved: s.t || 0 }; } catch (e) { /* sem save */ }
  return { lv: 1, gold: 0, saved: 0 };
}
load();
