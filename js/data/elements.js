/* Elementos (infraestrutura OPT-IN, Etapa 2): nenhuma arma/habilidade usa isto ainda. Quem quiser dano elemental chama hit(e, dano, { el: 'fire' }).
   Todos os números de balanceamento ficam AQUI (nada solto no código). A lógica está em systems/elements.js.

   Campos de cada elemento:  n = nome · col = cor (puff/tint) · dtype = tipo de dano · idn = identidade
   fx = status que o elemento tenta aplicar depois do dano (lista):
     k      = tipo do status (burn queima · slow lentidão · root preso/congelado · shock choque (atordoa curto) · poison veneno ·
              mark marcado (leva mais dano) · weaken enfraquecido (causa menos dano) · push empurrão instantâneo)
     chance = chance padrão (0–1) · dur = duração em s (0 = instantâneo) · durBoss = duração em chefes (se faltar, usa dur)
     pow    = intensidade (burn/poison: fração do dano do golpe por segundo · mark/weaken: fração · push: força do empurrão)
     stack  = 'renova' (renova a duração, mantém a maior intensidade) · 'acumula' (soma cargas até max) · 'ignora' (se já ativo, não faz nada)
     bossMult = só push: multiplicador do empurrão em chefes
   Resistência do alvo (fração): reduz o dano elemental e a chance/intensidade do status. 1 = imune, negativo = fraqueza. Padrão de todos = 0. */
export const ELEMENTS = {
  fire: { n: 'Fogo', col: 0xff7a20, dtype: 'fogo', idn: 'agressividade e queimadura',
    fx: [{ k: 'burn', chance: .30, dur: 3, pow: .15, stack: 'renova' }] },
  ice: { n: 'Gelo', col: 0x7fd8ff, dtype: 'gelo', idn: 'controle: lentidão e congelamento',
    fx: [{ k: 'slow', chance: .35, dur: 3, stack: 'renova' }, { k: 'root', name: 'Congelamento', chance: .10, dur: 1.2, durBoss: .5, stack: 'ignora' }] },
  lightning: { n: 'Relâmpago', col: 0xf2e45a, dtype: 'relâmpago', idn: 'velocidade: choque e interrupção',
    fx: [{ k: 'shock', chance: .20, dur: .6, durBoss: .25, stack: 'ignora' }] },
  poison: { n: 'Veneno', col: 0x6aff40, dtype: 'veneno', idn: 'desgaste e envenenamento',
    fx: [{ k: 'poison', chance: .40, dur: 4, pow: .10, stack: 'acumula', max: 5 }] },
  water: { n: 'Água', col: 0x3a8cff, dtype: 'água', idn: 'fluidez, pressão e controle',
    fx: [{ k: 'push', chance: .35, dur: 0, pow: 1.0, bossMult: .3, stack: 'renova' }] },
  earth: { n: 'Terra', col: 0xa0804a, dtype: 'terra', idn: 'resistência, impacto e enraizamento',
    fx: [{ k: 'root', name: 'Enraizamento', chance: .20, dur: 1.5, durBoss: .5, stack: 'ignora' }] },
  wind: { n: 'Vento', col: 0xc8f0e0, dtype: 'vento', idn: 'mobilidade, empurrão e deslocamento',
    fx: [{ k: 'push', chance: .50, dur: 0, pow: 1.8, bossMult: .3, stack: 'renova' }] },
  light: { n: 'Luz', col: 0xfff2a0, dtype: 'luz', idn: 'proteção, purificação e bênçãos',
    fx: [{ k: 'mark', name: 'Marcado', chance: .30, dur: 4, pow: .10, stack: 'renova' }],
    purify: { on: false, note: 'Purificação/bênção do jogador: reservada para a Etapa 6 (não há mecânica ainda)' } },
  shadow: { n: 'Trevas', col: 0x6a3a9a, dtype: 'trevas', idn: 'enfraquecimento e ocultação',
    fx: [{ k: 'weaken', name: 'Enfraquecido', chance: .30, dur: 4, pow: .15, stack: 'renova' }],
    hide: { on: false, note: 'Ocultação do jogador: reservada (não há mecânica ainda)' } },
};
export const EL_IDS = Object.keys(ELEMENTS);

/** Efeitos simultâneos por alvo (tipos de status ativos ao mesmo tempo; empurrão é instantâneo e não conta) */
export const MAX_FX = 3;
/** Resistências: limites da soma das fontes e quais campos do alvo são somados (mapas elemento→fração; ausentes = 0) */
export const RES = { min: -1, max: 1, sources: ['res', 'resEq', 'resFx'] };   // res = base do alvo/arquétipo · resEq = equipamento · resFx = efeito temporário
