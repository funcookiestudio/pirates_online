/* Proficiências de arma mágica (Etapa 4): Cajado (staff) e Rod. Todos os números ficam AQUI.
   Estado: P.prof = { staff: { xp, lv }, rod: { xp, lv } } — só para quem usa arma mágica (MAGIC_CATS em classes.js; hoje só o Mago).
   Outras classes e personagem sem classe: sem proficiência e sem campos novos no save. */
import { MAGIC_CATS } from './classes.js';
export const PROF_CATS = ['staff', 'rod'];

export const PROF = {
  max: 20,                                      // nível máximo de proficiência (no máximo, o XP deixa de acumular)
  xpNext: L => Math.round(60 * Math.pow(L, 1.4)),   // XP para sair do nível L (nível 1 → 2 = 60)

  /* CAJADO: XP por dano EFETIVAMENTE causado pelo jogador com o Cajado na mão (sem contar o excesso acima da vida restante do alvo).
     Conta também dano periódico (queimadura, veneno, sangramento) e habilidades, desde que o Cajado esteja ativo NO MOMENTO do dano.
     Não conta: companheiro (o.pet), Rod, arma corpo a corpo, outras classes. Fator de nível do inimigo = xpMult(nível do inimigo − seu nível) (data/scaling.js). */
  staff: {
    perDmg: .08,           // XP por ponto de dano efetivo
    killBase: 4, killPerLv: .4,   // bônus pelo abate: killBase + killPerLv × nível do inimigo
    trivialDiff: -8,       // inimigo com 8 ou mais níveis abaixo de você: 0 XP (nem dano nem abate)
    win: 10, capWin: 150,  // anti-abuso: no máximo capWin de XP de Cajado a cada win segundos
  },

  /* ROD: XP só por ações de suporte com BENEFÍCIO REAL (API profRodSupport; as habilidades de suporte chegam na Etapa 6).
     Quantidade efetiva: vida realmente restaurada, dano realmente absorvido pelo escudo, buff realmente aproveitado, etc. Quantidade 0 = XP 0.
     NÃO rende: poção, comida, descanso. */
  rod: {
    rates: { heal: .15, shield: .12, buff: 3, support: 2 },   // XP por unidade efetiva (buff/support: por uso com benefício)
    win: 10, capWin: 40,   // anti-abuso: teto de XP de Rod por janela de win segundos…
    capTarget: 20,         // …e por alvo dentro da janela (curar sempre o mesmo alvo não rende sem fim)
  },
  /* DECISÃO PENDENTE (Bison): XP de Rod pelo ATAQUE BÁSICO. 0 = desligado (padrão). Ex.: .02 = 0,02 XP de Rod por ponto de dano efetivo do tiro do Rod.
     Sem isso o Rod só evolui quando as habilidades de suporte existirem (Etapa 6). */
  ROD_XP_basico: 0,

  /* MIGRAÇÃO de saves antigos (sem bloco prof): o Mago antigo começa com proficiência de Cajado = seu nível geral (limitado ao máximo).
     Motivo: as habilidades futuras exigirão nível geral E proficiência; assim nada que ele já usava fica bloqueado quando as árvores chegarem
     (um requisito de proficiência nunca será maior que o nível geral correspondente). Rod começa no nível 1. XP começa em 0. */
  migrate: { staff: lv => Math.max(1, Math.min(PROF.max, Math.floor(lv) || 1)), rod: () => 1 },
};

/** A classe `k` tem proficiências? (usa armas mágicas) */
export const profClass = k => !!k && !!MAGIC_CATS[k];

/** Requisito de desbloqueio de uma habilidade: { lv: nível geral, prof: nível de proficiência da categoria } — AS DUAS condições valem juntas (ver unlockState em systems/prof.js).
    Nenhuma habilidade atual declara requisito (continuam liberadas só pelo nível geral); a ligação com as árvores é a Etapa 5. */
export const NO_REQ = Object.freeze({ lv: 1, prof: 0 });
