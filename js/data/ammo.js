/* Armas de arremesso são FINITAS: cada item é uma pilha (it.ct = unidades). Cada arremesso gasta 1; o projétil pode quebrar
   (brk = chance) ou cair no chão para ser recolhido. Consumíveis (rede, bomba de fumaça) nunca voltam.
   max = pilha máxima · brk = chance de quebrar · price = preço por unidade · pack = unidades por compra na mercadora. */
import { WEAPONS } from './weapons.js';

export const AMMO = {
  'Faca de arremesso':          { max: 20, brk: .25, price: 6,  pack: 5 },
  'Dardo metálico':             { max: 30, brk: .35, price: 5,  pack: 5 },
  'Adaga de arremesso':         { max: 15, brk: .2,  price: 12, pack: 5 },
  'Machado de arremesso':       { max: 10, brk: .2,  price: 22, pack: 5 },
  'Tomahawk':                   { max: 10, brk: .2,  price: 25, pack: 5 },
  'Azagaia':                    { max: 10, brk: .3,  price: 28, pack: 5 },
  'Lança curta':                { max: 8,  brk: .3,  price: 40, pack: 5 },
  'Boleadeiras':                { max: 8,  brk: .4,  price: 30, pack: 5 },
  'Rede de captura':            { max: 5,  brk: 1,   price: 45, pack: 2, consume: true },
  'Bomba de fumaça fantástica': { max: 5,  brk: 1,   price: 60, pack: 2, consume: true },
};
const DEF = { max: 10, brk: .3, price: 15, pack: 5 };

/** É uma arma de arremesso (item de mochila)? */
export const isThrown = it => !!it && it.ty === 'wpn' && it.w != null && !!WEAPONS[it.w] && !!WEAPONS[it.w].thrown;
/** Dados de munição da arma de índice `w` */
export const ammoInfo = w => AMMO[WEAPONS[w].n] || DEF;
/** Define a quantidade da pilha e atualiza o nome exibido ("Faca de arremesso ×12") */
export function setCt(it, c) { it.ct = Math.max(0, c); it.n = WEAPONS[it.w].n + ' ×' + it.ct; }
/** Quantidade da pilha (itens sem contagem, de saves antigos ou do chão, ganham meia pilha) */
export function ammoCt(it) { if (it.ct == null) setCt(it, Math.ceil(ammoInfo(it.w).max / 2)); return it.ct; }
