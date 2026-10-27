/* Missões de NPCs (motor genérico). Cada missão tem etapas (coletar, matar, chefe, arremessar); o estado fica em state.quests[id]:
   { s: 'on' | 'ready' | 'done', i: etapa, n: progresso, t: segundos ativa, a: segundos com o AUTO ligado }.
   Balanceamento: XP = % do xpToNext(nível mínimo) · ouro = múltiplo de goldAt(nível mínimo) (ver TIER).
   Auto ganha menos: XP e ouro caem até 40% conforme a fração do tempo com o auto ligado; com menos de 10% de auto (modo manual) há +25%.
   (A "Mão Firme" e a "Lebre" etc. entram aqui com novas definições em QUESTS.) */
import { state } from '../core/state.js';
import { on } from '../core/events.js';
import { P, levelUp } from '../entities/player.js';
import { enemies } from '../core/registry.js';
import { scene } from '../core/engine.js';
import { WEAPONS } from '../data/weapons.js';
import { xpToNext, goldAt, rollQuality } from '../data/scaling.js';
import { addItem, beltAdd } from './inventory.js';
import { spawn } from '../entities/enemies.js';
import { KIND } from '../data/enemies.js';
import { POST_DATA } from '../data/posts.js';
import { npcByShop } from '../entities/npc.js';
import { freePoint } from './steer.js';
import { log, lootText } from '../ui/notify.js';
import { saveGame } from './save.js';
import { WILD, whiteDeer, goldenHare } from '../entities/wildlife.js';
import { isNight } from '../world/daynight.js';
import { hourNow } from '../core/clock.js';
import { pickWeapon } from '../entities/loot.js';
import { walkable, groundY, SEA } from '../world/terrain.js';
import { VILLAGE_R } from '../core/village-const.js';
import { person } from '../entities/character.js';
import { gait, gaitSpeed } from '../entities/gait.js';
import { npcList } from '../entities/npc.js';
import { pois } from '../world/pois.js';
import { slideTo, SEED } from '../world/terrain.js';

/** [fração do XP do nível, múltiplo do ouro] por tamanho da missão */
export const TIER = { curta: [.15, 8], media: [.25, 15], longa: [.4, 30], epica: [.6, 60] };
const wi = name => WEAPONS.findIndex(w => w.n === name);
const give = (name, ct) => { const i = wi(name); if (i >= 0) addItem({ ty: 'wpn', q: 1, wi: i, ct, il: P.lv }); };

/** Pontos das coletas (calculados de novo a cada vez: mesmos lugares ao recarregar). `i` = índice do item */
const around = (post, k, r0 = 6) => { const a = k * 1.57 + .5, r = r0 + (k % 2) * 3; return freePoint(post.x + Math.cos(a) * r, post.z + Math.sin(a) * r, .8); };
/** Ponto em terra firme a ~`r` m do centro, procurando a partir do ângulo `a0` */
const landPoint = (r, a0) => {
  for (let k = 0; k < 24; k++) for (const rr of [r, r - 10, r + 10]) {
    const a = a0 + k * .26, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (walkable(x, z) && groundY(x, z) > SEA + 1.5 && walkable(x + 3, z) && walkable(x - 3, z) && walkable(x, z + 3) && walkable(x, z - 3)) return { x, z };
  }
  return { x: 0, z: 8 };
};
const herbSpots = () => {   // clareiras onde os cervos pastam (uma por manada), das mais próximas da vila para as mais distantes
  const herds = new Map(); WILD.deer.forEach(a => { if (!herds.has(a.herd)) herds.set(a.herd, [a.hx, a.hz]); });
  return [...herds.values()].sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1])).slice(0, 3).map(([x, z]) => freePoint(x + 3, z + 2, .8));
};

const QUESTS = [
  { id: 'barris', giver: 'Zé Carrancudo', title: 'Barris do Zé', lv: 2, tier: 'media',
    say: { ask: 'Hmpf... sumiram três barris do meu melhor rum! Vi uns contrabandistas rondando o cais. Recupere os barris no posto deles e eu te pago um trago... e uns trocados.', on: 'Os barris? Ainda não, marujo. Procure perto do Posto dos Contrabandistas — procure o brilho dourado.', ready: 'Meus barris! Ahh, o cheiro do rum... Tome, você merece.' },
    stages: [{ k: 'collect', n: 4, model: 'barrel', msg: 'Barril recuperado', spot: i => POST_DATA[1] && around(POST_DATA[1], i), hud: q => 'Recupere os barris do Zé (' + q.n + '/4) — perto do Posto dos Contrabandistas' }],
    reward: { pot: 3 }, rewardTxt: '3 poções' },
  { id: 'javalis', giver: 'Seu Zé', title: 'Javalis na Horta', lv: 3, tier: 'curta',
    say: { ask: 'Aqueles javalis estão destruindo minha horta! Mate três deles na mata. E cuidado com o Presa-Torta, um elite que anda com eles...', on: 'A horta ainda sofre! Mate os javalis da mata e depois dê um jeito no Presa-Torta, o elite.', ready: 'Acabou com o Presa-Torta! Minha horta agradece. Leve o couro dele, é seu.' },
    stages: [
      { k: 'kill', n: 3, hud: q => 'Mate javalis na mata (' + q.n + '/3)' },
      { k: 'boss', n: 1, hud: () => 'Derrote o Presa-Torta, o javali elite, perto da granja' }],
    reward: { couro: 5 }, rewardTxt: '5 couros' },
  { id: 'ervas', giver: 'Ysolde Folha-Prata', title: 'Febre das Ervas', lv: 4, tier: 'media',
    say: { ask: 'A febre do mar anda forte na vila, e me faltam folhas-de-lua: só brotam à noite, nas clareiras onde os cervos pastam. Traga três e eu preparo o remédio. Cuidado para não assustar os bichos!', on: 'Folhas-de-lua só brotam à noite, nas clareiras dos cervos. Aproxime-se devagar!', ready: 'Perfeitas, ainda com orvalho! Deixe que eu preparo... Leve estas poções, e a receita fica comigo.' },
    stages: [{ k: 'collect', n: 3, model: 'herb', night: true, msg: 'Folha-de-lua colhida', spot: i => herbSpots()[i], hud: q => 'Colha folhas-de-lua (' + q.n + '/3) — só à noite, nas clareiras dos cervos' + (isNight(hourNow()) ? '' : ' (espere anoitecer)') }],
    reward: { pot: 5 }, rewardTxt: '5 poções' },
  { id: 'mapa', giver: 'Pé-de-Pau Polly', title: 'O Mapa Rasgado', lv: 4, tier: 'longa',
    say: { ask: 'Yo-ho-ho! Achei um velho mapa rasgado em três pedaços, e cada um foi parar num acampamento diferente! Recupere os fragmentos (Náufragos, Cova dos Esqueletos e Bivaque Fantasma) e o tesouro é nosso!', on: 'Os pedaços estão nos acampamentos: Náufragos, Cova dos Esqueletos e Bivaque Fantasma. Depois, siga o X do mapa e cave!', ready: 'Cavou o baú! Que tesouro! Fique com a parte do leão, marujo. Eu fico com as histórias.' },
    stages: [
      { k: 'collect', n: 3, model: 'scroll', msg: 'Fragmento do mapa', spot: i => POST_DATA[[0, 2, 3][i]] && around(POST_DATA[[0, 2, 3][i]], 1, 5), hud: q => 'Recupere os fragmentos do mapa (' + q.n + '/3) nos acampamentos' },
      { k: 'collect', n: 1, model: 'dig', msg: 'Você cavou o tesouro!', spot: () => POST_DATA[0] && freePoint(POST_DATA[0].x - 24, POST_DATA[0].z + 16, 1), hud: () => 'Siga o X do mapa e cave o tesouro, perto do Acampamento dos Náufragos' }],
    reward: { torch: 1, magic: 1 }, rewardTxt: 'uma arma Mágica e uma tocha' },
  { id: 'estrelas', giver: 'Velho Astrolábio', title: 'Estrelas Apagadas', lv: 7, tier: 'media',
    say: { ask: 'Tracei as constelações destas águas por quarenta anos, mas as Sombras das Ondas apagam as marcas nos três círculos de pedra ao redor da vila. À noite, fique dentro de cada círculo até eu refazer o mapa do céu. Elas virão atrás de você!', on: 'Os círculos de pedra ficam ao redor da vila. Só à noite, e não saia deles enquanto as Sombras atacam!', ready: 'O céu está desenhado de novo! Veja, o norte nunca esteve tão claro. Leve estas bombas, vão lhe servir.' },
    stages: [0, 1, 2].map(i => ({ k: 'hold', n: 25, r: 4.5, night: true, model: 'ring', waves: { kind: KIND.SOMBRA, count: 2, every: 9 }, spot: () => landPoint(VILLAGE_R + 50, i * 2.1 + .4),
      hud: q => 'Círculo ' + (i + 1) + '/3: fique dentro por ' + Math.max(0, Math.ceil(25 - q.n)) + 's e defenda-se das Sombras' + (isNight(hourNow()) ? '' : ' (espere anoitecer)') })),
    reward: { bmb: 3 }, rewardTxt: '3 bombas' },
  { id: 'mare', giver: 'Pé-de-Pau Polly', title: 'Maré Subindo', lv: 9, tier: 'media',
    say: { ask: 'O sino do meu velho navio ficou na Praia dos Naufragados! Só que a maré sobe depressa por lá. Pegue o sino e volte para a vila antes de a maré cobrir o caminho. Se não der tempo, terá de buscar de novo!', on: 'O sino está na Praia dos Naufragados. Depois de pegá-lo, volte à vila antes de a maré cobrir o caminho!', ready: 'O sino! Ouça só... soa igualzinho a quando o Kraken me levou a perna. Fique com isto, marujo.' },
    stages: [
      { k: 'collect', n: 1, model: 'bell', msg: 'Sino recuperado! A maré está subindo...', spot: i => POST_DATA[6] && around(POST_DATA[6], 2, 6), hud: () => 'Pegue o sino do navio na Praia dos Naufragados' },
      { k: 'goto', r: 7, limit: 150, back: 0, model: 'ring', spot: () => ({ x: 0, z: 10 }), hud: q => 'A maré sobe! Volte à praça da vila em ' + Math.max(0, Math.ceil(q.tl || 0)) + 's' }],
    reward: { magic: 1 }, rewardTxt: 'uma arma Mágica' },
  { id: 'calafate', giver: 'Mestre Breu', title: 'Escolta do Calafate', lv: 5, tier: 'media',
    say: { ask: 'Meu alcatrão acabou e o casco do barco do porto está vazando! Mas os mortos rondam o caminho... Me escolte até o porto, sem deixar que me matem, e ajude-me a consertar o casco enquanto os malditos atacam!', on: 'Eu sigo você até o porto. Fique perto de mim e não deixe os mortos me alcançarem!', ready: 'Casco selado, alcatrão firme! Ahoy! Aqui estão os machados que forjei com as sobras. Use bem!' },
    stages: [
      { k: 'escort', r: 5, model: 'ring', waves: { kind: KIND.GRUMETE, count: 2, every: 20 }, spot: () => pois[0] ? { x: pois[0].x, z: pois[0].z } : { x: 0, z: 30 },
        hud: q => 'Leve o Mestre Breu até o porto (' + escortInfo() + ')' },
      { k: 'hold', n: 20, r: 5, model: 'ring', waves: { kind: KIND.CONTRA, count: 2, every: 8 }, spot: () => pois[0] ? { x: pois[0].x, z: pois[0].z } : { x: 0, z: 30 },
        hud: q => 'Defenda o Breu enquanto ele conserta o casco (' + Math.max(0, Math.ceil(20 - q.n)) + 's) — ' + escortInfo() }],
    reward: { machado: 10 }, rewardTxt: '10 machados de arremesso' },
  { id: 'cervo', giver: 'Seu Tobias', title: 'O Cervo Branco', lv: 6, tier: 'media',
    say: { ask: 'Dizem que um cervo branco anda pela mata, o mais distante dos rebanhos. Nunca consegui chegar perto, ele foge de quem corre. Aproxime-se DEVAGAR, sem cavalo, e fique perto dele por alguns segundos. Quero saber que é real!', on: 'O cervo branco fica na manada mais distante da vila. Ande devagar e não corra, ou ele foge.', ready: 'Você o viu de perto?! Ha! Pelo menos um de nós viu... Tome, por sua paciência.' },
    stages: [{ k: 'stalk', n: 6, r: 7, hud: q => 'Aproxime-se devagar do Cervo Branco (' + Math.max(0, Math.ceil(6 - q.n)) + 's) — sem correr, sem cavalo' }],
    reward: { couro: 6, pot: 2 }, rewardTxt: '6 couros e 2 poções' },
  { id: 'divida', giver: 'Capitã Sal', title: 'Dívida de Sangue', lv: 8, tier: 'longa',
    say: { ask: 'Um velho devedor, Cão Rouco, sumiu com minha mercadoria e se escondeu entre os contrabandistas. Traga-o a mim... de um jeito ou de outro. Ele é um elite, não o subestime.', on: 'Cão Rouco anda com os contrabandistas, perto do posto deles. Derrote-o e volte aqui.', ready: 'Então o Cão Rouco caiu. Ele tinha esta bolsa. Pode me entregar para eu cobrar a dívida, ou guardar o segredo dele e dizer que fugiu. A escolha é sua, marujo.' },
    stages: [{ k: 'boss', n: 1, kind: KIND.CONTRA, elite: true, name: 'Cão Rouco', at: () => POST_DATA[1] ? freePoint(POST_DATA[1].x + 4, POST_DATA[1].z + 4, 1) : null, hud: () => 'Derrote o Cão Rouco, o devedor elite, no Posto dos Contrabandistas' }],
    choice: [['Entregar a bolsa (mais ouro)', { g: 1.5 }], ['Dizer que ele fugiu (uma arma Mágica, menos ouro)', { g: .5, magic: 1 }]],
    reward: {}, rewardTxt: 'conforme a sua escolha' },
  { id: 'procurado', giver: 'Mural de Missões', title: 'Procurado: Capitão Maldito', lv: 12, tier: 'epica',
    say: { ask: 'PROCURADO: Capitão Maldito, vivo ou morto! A recompensa é generosa. Ele é um chefe de verdade: leve poções, bombas e um bom equipamento. Ele ressurge depois de um tempo, mas só o primeiro abate vale a recompensa.', on: 'O Capitão Maldito vaga pela costa leste, no Fortim. Derrube-o e volte ao Mural.', ready: 'O cartaz está riscado: O Capitão Maldito caiu! Cobre sua recompensa.' },
    stages: [{ k: 'wanted', n: 1, hud: () => 'Derrote o Capitão Maldito (chefe da costa leste, no Fortim)' }],
    reward: { magic: 1, pot: 5, bmb: 3 }, rewardTxt: 'uma arma Mágica, 5 poções e 3 bombas' },
  { id: 'cofre', giver: 'Mestre Breu', title: 'O Cofre do Mestre', lv: 10, tier: 'longa',
    say: { ask: 'Meu antigo mestre guardou o cofre de ferramentas no fundo de uma dungeon, com um guardião para vigiá-lo. Entre numa dungeon de nível 8 ou mais e derrote o chefe. O cofre abre sozinho quando o guardião cai!', on: 'Entre numa dungeon (nível 8 ou mais) e derrote o chefe. Depois, volte aqui.', ready: 'Ahoy! As ferramentas do velho mestre! Tome estes machados, eu fico com o resto.' },
    stages: [{ k: 'dclear', n: 1, min: 8, hud: q => 'Derrote o chefe de uma dungeon de nível 8+ (' + q.n + '/1)' }],
    reward: { machado: 10, pot: 3 }, rewardTxt: '10 machados de arremesso e 3 poções' },
  { id: 'paginas', giver: 'Ysolde Folha-Prata', title: 'Páginas da Tripulação', lv: 8, tier: 'media',
    say: { ask: 'Os mortos das dungeons carregam páginas do diário da antiga tripulação, e eu quero lê-las. Derrote vinte inimigos DENTRO de dungeons e eu junto o que sobrou deles.', on: 'Os inimigos dentro das dungeons guardam as páginas. Derrote vinte deles.', ready: 'Vinte páginas... que história! Tome, foi um bom trabalho.' },
    stages: [{ k: 'dkill', n: 20, hud: q => 'Derrote inimigos dentro de dungeons (' + q.n + '/20)' }],
    reward: { pot: 6 }, rewardTxt: '6 poções' },
  { id: 'cristais', giver: 'Velho Astrolábio', title: 'Cristais que Cantam', lv: 14, tier: 'longa',
    say: { ask: 'Dizem que o fundo das dungeons canta quando o chefe cai, e o canto dá norte às estrelas. Limpe duas dungeons de nível 12 ou mais, derrotando os chefes, para eu ouvir esse canto.', on: 'Limpe duas dungeons de nível 12+ derrotando os chefes.', ready: 'Ouvi o canto a léguas! O céu está mais claro. Fique com isto, marujo.' },
    stages: [{ k: 'dclear', n: 2, min: 12, hud: q => 'Derrote o chefe de dungeons nível 12+ (' + q.n + '/2)' }],
    reward: { magic: 1, bmb: 4 }, rewardTxt: 'uma arma Mágica e 4 bombas' },
  { id: 'rato', giver: 'Zé Carrancudo', title: 'Treinando o Rato', lv: 5, tier: 'curta',
    say: { ask: 'Meu rato de estimação, o Biscoito, fugiu da gaiola de novo! É esperto e corre aos trancos, mas para para respirar. Pegue-o três vezes: toda vez que você o alcança, ele escapa e se esconde noutro lugar. É treino de pernas, marujo!', on: 'O Biscoito corre aos trancos pela vila e pelos arredores. Aproxime-se dele para pegá-lo.', ready: 'Meu Biscoito! Ele nunca esteve tão ágil. Tome, por ajudar a treinar o bicho.' },
    stages: [{ k: 'chase', n: 3, hud: q => 'Alcance o Biscoito, o rato fujão (' + q.n + '/3) — ele corre aos trancos' }],
    reward: { pot: 2, faca: 5 }, rewardTxt: '2 poções e 5 facas de arremesso' },
  { id: 'atlas', giver: 'Velho Astrolábio', title: 'O Atlas do Cartógrafo', lv: 10, tier: 'longa',
    say: { ask: 'Falta completar meu atlas: preciso das bordas de três acampamentos distantes, medidas com os próprios pés. Vá até as proximidades do Bivaque Fantasma e dos dois acampamentos seguintes, e eu desenho o resto. Fique fora do alcance dos guardas, se puder!', on: 'Percorra as bordas dos acampamentos mais distantes para eu medir. Os marcos dourados mostram os pontos.', ready: 'Está tudo no atlas! Veja só: cada enseada, cada pico. Você tem olhos de gaivota. Leve esta recompensa.' },
    stages: [3, 4, 5].map((pi, n) => ({ k: 'goto', r: 6, model: 'ring', spot: () => POST_DATA[pi] && around(POST_DATA[pi], 3, 16), hud: () => 'Marco ' + (n + 1) + '/3: vá até a borda do ' + (POST_DATA[pi] ? POST_DATA[pi].name : 'acampamento') })),
    reward: { magic: 1, bmb: 3, pot: 3 }, rewardTxt: 'uma arma Mágica, 3 bombas e 3 poções' },
  { id: 'lebre', giver: 'Dona Marta', title: 'A Lebre Dourada', lv: 9, tier: 'media',
    say: { ask: 'Uma lebre de pelo dourado anda pelos campos distantes, e dizem que traz sorte a quem a pega. Ela é rápida e esperta, mas se cansa depois de correr um pouco. Alcance-a quando ela parar para respirar!', on: 'A lebre dourada fica nos campos mais distantes da vila. Persiga-a até ela cansar e chegue perto.', ready: 'Você a pegou?! Que sorte linda! Tome, a sorte dela agora também é sua.' },
    stages: [{ k: 'catch', n: 1, hud: () => 'Alcance a Lebre Dourada quando ela parar cansada' }],
    reward: { magic: 1, pot: 3 }, rewardTxt: 'uma arma Mágica e 3 poções' },
  { id: 'corvo', giver: 'Pé-de-Pau Polly', title: 'O Corvo Não Esquece', lv: 8, tier: 'longa',
    say: { ask: 'Meu velho corvo mensageiro foi levado para a Ilha do Corvo e eu nunca soube o destino dele. Vá até lá (o Capitão Remo leva você no porto), recolha três penas negras e defenda o ninho dele dos fantasmas por um tempo. Ele me reconhece pelas penas!', on: 'Na Ilha do Corvo: recolha as três penas negras e defenda o ninho. Para viajar, fale com o Capitão Remo no porto.', ready: 'Estas penas... é ele mesmo! O velho corvo não esquece nada. Tome, marujo, e obrigado.' },
    stages: [
      { k: 'collect', n: 3, isl: 'corvo', model: 'feather', msg: 'Pena negra recolhida', spot: i => landPoint(55 + i * 22, i * 2.3 + .5), hud: q => 'Recolha as penas negras na Ilha do Corvo (' + q.n + '/3)' },
      { k: 'hold', n: 15, r: 5, isl: 'corvo', model: 'ring', waves: { kind: KIND.GHOST, count: 2, every: 7 }, spot: () => landPoint(100, 3.7), hud: q => 'Defenda o ninho do corvo por ' + Math.max(0, Math.ceil(15 - q.n)) + 's' }],
    reward: { magic: 1, pot: 4, bmb: 2 }, rewardTxt: 'uma arma Mágica, 4 poções e 2 bombas' },
  { id: 'viagem', giver: 'Velho Astrolábio', title: 'Faróis da Tormenta', lv: 15, tier: 'longa',
    say: { ask: 'Na Ilha da Tormenta há três faróis apagados que guiavam os navios antigos. Viaje até lá (Capitão Remo, no porto), acenda cada um ficando junto dele por alguns segundos e defenda-o das Sombras que brotam da tempestade.', on: 'Na Ilha da Tormenta: acenda os três faróis, ficando dentro de cada círculo e se defendendo das Sombras.', ready: 'Vi os três faróis acesos daqui, no horizonte! Os navios voltarão a ter norte. Tome, foi uma proeza.' },
    stages: [0, 1, 2].map(i => ({ k: 'hold', n: 14, r: 4.5, isl: 'tormenta', model: 'ring', waves: { kind: KIND.SOMBRA, count: 3, every: 8, add: 2 }, spot: () => landPoint(60 + i * 25, i * 2.1 + 1.1),
      hud: q => 'Farol ' + (i + 1) + '/3: fique dentro do círculo por ' + Math.max(0, Math.ceil(14 - q.n)) + 's e defenda-se das Sombras' })),
    reward: { magic: 1, bmb: 5, pot: 5 }, rewardTxt: 'uma arma Mágica, 5 bombas e 5 poções' },
  { id: 'caveira', giver: 'Capitã Sal', title: 'A Caveira de Ouro', lv: 22, tier: 'epica',
    say: { ask: 'A lenda da Caveira de Ouro é verdadeira: três pedaços dela estão espalhados pela Ilha da Caveira, e o chefe da ilha guarda a testa. Viaje até lá (Capitão Remo, no porto), junte os fragmentos e derrote o chefe. Isto vale uma fortuna... e vai exigir tudo de você.', on: 'Na Ilha da Caveira: recolha os três fragmentos de ouro e derrote o chefe da ilha.', ready: 'A Caveira de Ouro... inteira! Eu juro que nunca vi nada tão bonito. A sua parte, como combinamos, marujo.' },
    stages: [
      { k: 'collect', n: 3, isl: 'caveira', model: 'bell', msg: 'Fragmento de ouro recolhido', spot: i => landPoint(50 + i * 25, i * 2.1 + .9), hud: q => 'Recolha os fragmentos da Caveira de Ouro (' + q.n + '/3) na Ilha da Caveira' },
      { k: 'wanted', n: 1, isl: 'caveira', hud: () => 'Derrote o chefe da Ilha da Caveira' }],
    reward: { magic: 2, pot: 8, bmb: 5 }, rewardTxt: 'duas armas Mágicas, 8 poções e 5 bombas' },
  { id: 'arsenal', giver: 'Capitã Sal', title: 'Mão Firme', lv: 5, tier: 'curta',
    say: { ask: 'Arremesso é arte de quem não perde a calma, marujo. Pegue estas facas e acerte dez inimigos com elas. Equipe-as no espaço de arma de longa distância e use o botão de ataque. Elas acabam, mas as que não quebram ficam no chão.', on: 'Ainda faltam acertos! Equipe a faca de arremesso no espaço de longa distância e atire nos inimigos.', ready: 'Mão firme, olho vivo! Aqui, mais facas e uns trocados pelo treino.' },
    stages: [{ k: 'throw', n: 10, hud: q => 'Acerte inimigos com armas de arremesso (' + q.n + '/10)' }],
    onStart: () => give('Faca de arremesso', 15), reward: { faca: 10 }, rewardTxt: '10 facas de arremesso' },
];
/** Etapas de outra ilha (`isl`): só rodam na ilha certa; nas outras o painel manda viajar */
const ISLN = { corvo: 'Ilha do Corvo', tormenta: 'Ilha da Tormenta', caveira: 'Ilha da Caveira' };
const here = st => !st.isl || st.isl === SEED;
const QMAP = Object.fromEntries(QUESTS.map(d => [d.id, d]));
const Q = () => state.quests || (state.quests = {});
const stageOf = (d, q) => d.stages[q.i];

// ---- Contratos de dungeon (Mural): condição extra numa dungeon, repetível; paga ao derrotar o chefe cumprindo a condição ----
export const CONTRACTS = {
  nopot: { n: 'Sem poções', ic: '🧪', hint: 'derrote o chefe da dungeon sem usar nenhuma poção' },
  trap: { n: 'Sem espinhos', ic: '⚠', hint: 'derrote o chefe sem pisar em nenhuma armadilha' },
  speed: { n: 'Relâmpago', ic: '⏱', hint: 'derrote o chefe em até 8 minutos', limit: 480 },
};
const fmt = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
/** Texto do contrato para o painel ('' se não há) */
export function contractHud() {
  const c = state.contract; if (!c) return '';
  const d = CONTRACTS[c.c], r = c.run;
  if (!d) return '';
  if (!r) return d.ic + ' Contrato ' + d.n + ': entre numa dungeon';
  return d.ic + ' Contrato ' + d.n + (r.fail ? ': ' + r.fail : ': ' + (d.limit ? ' ' + fmt(Math.max(0, d.limit - r.t)) : ''));
}
const failC = why => { const r = state.contract && state.contract.run; if (r && !r.fail) { r.fail = why; log('Contrato falhou: ' + why); } };
on('dungeon:enter', () => { const c = state.contract; if (c && !c.run) { c.run = { lv: state.dunNow.lv, t: 0, a: 0, fail: '' }; log('Contrato valendo: ' + CONTRACTS[c.c].hint); } });
on('potion:used', () => { if (state.contract && state.contract.c === 'nopot') failC('você usou uma poção'); });
on('trap:hit', () => { if (state.contract && state.contract.c === 'trap') failC('você pisou numa armadilha'); });
on('dungeon:leave', () => { const c = state.contract; if (c && c.run) { state.contract = null; log('Contrato cancelado: você saiu da dungeon sem concluí-la'); saveGame(); } });
on('dungeon:clear', () => {
  const c = state.contract; if (!c || !c.run) return;
  const r = c.run, share = r.t > 0 ? Math.min(1, r.a / r.t) : 0, lv = r.lv;
  state.contract = null;
  if (r.fail) { log('Contrato não pago: ' + r.fail); saveGame(); return; }
  const mult = Math.max(.6, 1 - .4 * share) * (share < .1 ? 1.25 : 1), xp = Math.round(xpToNext(lv) * .3 * mult), gold = Math.round(goldAt(lv) * 12 * mult);
  P.xp += xp; P.gold += gold; levelUp();
  if (share < .1 && Math.random() < .35) addItem({ ty: 'wpn', q: 2, wi: pickWeapon(lv + 2, 2), il: lv + 2 });
  log('Contrato cumprido (' + CONTRACTS[c.c].n + '): +' + xp + ' XP · +' + gold + ' ouro' + (share >= .1 ? ' (auto ' + Math.round(share * 100) + '% do tempo: −' + Math.round((1 - mult) * 100) + '%)' : ' (modo manual: +25%)'));
  saveGame();
});

/** Ponte com o painel do Mural (ui/questboard.js registra `open`) */
export const BOARDUI = { open: null };
/** Missão acompanhada (aparece primeiro no painel do HUD) */
/** Cartazes: missões que o jogador "pegou" no Mural (ainda não aceitas) e guarda no inventário */
export const CARTAZ_MAX = 6;
export function pegarCartaz(id) {
  const c = state.cartazes || (state.cartazes = []), d = QMAP[id], q = Q()[id];
  if (!d || q || P.lv < d.lv) return 'no';
  if (c.includes(id)) return 'has';
  if (c.length >= CARTAZ_MAX) { log('Você já guarda ' + CARTAZ_MAX + ' cartazes: solte um antes de pegar outro'); return 'full'; }
  (state.qtaken || (state.qtaken = [])).includes(id) || state.qtaken.push(id);   // só as missões que o jogador pegou no Mural aparecem na aba Missões
  c.push(id); log('Cartaz guardado: ' + d.title + ' — veja na aba Missões do inventário'); saveGame(); return 'ok';
}
export function soltarCartaz(id) { state.cartazes = (state.cartazes || []).filter(x => x !== id); if (!Q()[id]) state.qtaken = (state.qtaken || []).filter(x => x !== id); saveGame(); }
/** Para onde ir numa missão ativa: o item/área mais perto (exato) ou a região; {remo:true} se a etapa é de outra ilha; null se não há local (ex.: dentro de dungeon) */
export function questSpot(id) {
  const d = QMAP[id], q = Q()[id]; if (!d || !q || q.s !== 'on') return null;
  const st = stageOf(d, q); if (!here(st)) return { remo: true };
  let best = null, bd = 1e9;
  PK.filter(p => p.id === id && p.si === q.i).forEach(p => { const dd = Math.hypot(p.x - P.x, p.z - P.z); if (dd < bd) { bd = dd; best = { x: p.x, z: p.z }; } });
  if (best) return best;
  const m = questMarks().find(m => m.t === d.title);
  return m ? { x: m.x, z: m.z, region: true } : null;
}
export const questGiver = id => QMAP[id] ? QMAP[id].giver : '';
export function setTrack(id) { state.qtrack = id || null; }

/** Dados do painel do Mural: uma linha por missão, já com estado, progresso e recompensa estimada */
export function boardData() {
  return QUESTS.map(d => {
    const q = Q()[d.id], [pc, gm] = TIER[d.tier], st = q && q.s !== 'done' && q.s !== 'ready' ? stageOf(d, q) : null;
    const sv = q && q.s === 'done' ? 'done' : q && q.s === 'ready' ? 'ready' : q ? 'on' : P.lv >= d.lv ? 'open' : 'lock';   // (não chamar de state: escondia o estado global e o cartaz nunca aparecia)
    return {
      id: d.id, title: d.title, giver: d.giver, cartaz: (state.cartazes || []).includes(d.id), taken: (state.cartazes || []).includes(d.id) || (state.qtaken || []).includes(d.id), tracked: state.qtrack === d.id, lv: d.lv, tier: d.tier, state: sv, mural: d.giver === 'Mural de Missões',
      xp: Math.round(xpToNext(d.lv) * pc), gold: Math.round(goldAt(d.lv) * gm), reward: d.rewardTxt || '',
      ask: d.say.ask, step: q && q.s === 'on' ? q.i + 1 : 0, steps: d.stages.length,
      hud: st ? st.hud(q) : '', need: st && st.k !== 'hold' && st.k !== 'stalk' && st.k !== 'chase' ? st.n || 0 : 0, n: q && q.s === 'on' ? Math.floor(q.n || 0) : 0,
      isl: st && st.isl ? ISLN[st.isl] : '', away: !!(st && !here(st)),
    };
  });
}
/** Aceita/entrega as missões cujo dador é o próprio Mural. Devolve false se não for possível. */
export function boardAct(id) {
  const d = QMAP[id]; if (!d || d.giver !== 'Mural de Missões') return false;
  const q = Q()[id];
  if (!q && P.lv >= d.lv) { start(d); return true; }
  if (q && q.s === 'ready') { finish(d); return true; }
  return false;
}
export function contractList() { return Object.entries(CONTRACTS).map(([k, c]) => ({ k, ...c, on: !!(state.contract && state.contract.c === k), run: state.contract && state.contract.c === k ? state.contract.run : null })); }
export function setContract(k) { if (k && !CONTRACTS[k]) return; state.contract = k ? { c: k, run: null } : null; saveGame(); }

/** Pílulas de progresso do HUD: até 2 missões ativas */
export function questsHud() {
  const out = [];
  [...QUESTS].sort((a, b) => (state.qtrack === b.id) - (state.qtrack === a.id)).forEach(d => {
    const q = Q()[d.id];
    if (!q || q.s === 'done') return;
    const sh = q.t > 0 ? q.a / q.t : 0, pen = sh >= .1 ? '  auto −' + Math.round(40 * sh) + '%' : '';   // quanto da recompensa o auto já custou
    const st = q.s === 'ready' ? null : stageOf(d, q);
    out.push(q.s === 'ready' ? '📜 ' + d.title + ': volte a ' + d.giver : '📜 ' + d.title + ': ' + (here(st) ? st.hud(q) : 'viaje para a ' + ISLN[st.isl] + ' (Capitão Remo, no porto)') + pen);
  });
  if (state.contract && !state.contract.run) out.push(contractHud());
  const nc = (state.cartazes || []).length;
  if (nc && out.length < 2) out.push('📌 ' + nc + (nc > 1 ? ' cartazes' : ' cartaz') + ' no inventário (aba Missões)');
  return out.slice(0, 2).join('  ·  ') || null;
}

/** Fala do NPC dono de missão (substitui a fala aleatória) ou null */
export function questsSay(cur) {
  for (const d of QUESTS) {
    if (d.giver !== cur.name) continue;
    const q = Q()[d.id];
    if (q && q.s === 'done') continue;
    if (!q) return P.lv >= d.lv ? d.say.ask : 'Tenho um serviço para quem tiver coragem... volte quando for pelo menos Nv ' + d.lv + ', marujo.';
    return q.s === 'ready' ? d.say.ready : d.say.on;
  }
  return null;
}

/** Botões do diálogo: aceitar / receber recompensa */
export function questsButtons(cur) {
  const out = [];
  if (cur.board) {
    out.push(['Abrir o quadro de missões', (say, rebuild) => { if (BOARDUI.open) BOARDUI.open(rebuild); }]);
  }
  QUESTS.forEach(d => {
    if (d.giver !== cur.name) return;
    const q = Q()[d.id];
    if (q && q.s === 'done') return;
    if (!q && P.lv >= d.lv) out.push(['Aceitar missão: ' + d.title + ' (Nv ' + d.lv + ')', (say, rebuild) => { start(d); say(d.say.on); rebuild(); }]);
    else if (!q) out.push(['🔒 ' + d.title + ' — requer Nv ' + d.lv, () => {}]);
    else if (q.s === 'ready' && d.choice) d.choice.forEach(([lb, o]) => out.push([lb, (say, rebuild) => { finish(d, o); say('Negócio fechado, marujo.'); rebuild(); }]));
    else if (q.s === 'ready') out.push(['Receber recompensa: ' + d.title, (say, rebuild) => { finish(d); say('Foi um prazer fazer negócio, marujo!'); rebuild(); }]);
  });
  return out;
}

function start(d) {
  Q()[d.id] = { s: 'on', i: 0, n: 0, t: 0, a: 0 };
  if (d.giver === 'Mural de Missões' && !(state.qtaken || (state.qtaken = [])).includes(d.id)) state.qtaken.push(d.id);   // aceita direto no Mural também conta
  state.cartazes = (state.cartazes || []).filter(x => x !== d.id);   // o cartaz some ao aceitar a missão
  log('Missão aceita: ' + d.title);
  if (d.onStart) d.onStart();
  saveGame();
}

function advance(d, q) {
  q.n = 0; q.wv = 0; q.i++;
  if (q.i >= d.stages.length) { q.s = 'ready'; log('✅ ' + d.title + ': volte a ' + d.giver + ' para receber a recompensa'); }
  else { const nx = stageOf(d, q); q.tl = nx.limit || null; log('📜 ' + d.title + ': ' + nx.hud(q)); }
  saveGame();
}

function finish(d, opt = {}) {
  const q = Q()[d.id], [pc, gm] = TIER[d.tier], share = q.t > 0 ? Math.min(1, q.a / q.t) : 0;
  const mult = Math.max(.6, 1 - .4 * share) * (share < .1 ? 1.25 : 1);   // auto ganha menos · manual ganha bônus de mestria
  const xp = Math.round(xpToNext(d.lv) * pc * mult), gold = Math.round(goldAt(d.lv) * gm * mult * (opt.g || 1));
  P.xp += xp; P.gold += gold; levelUp();
  const r = d.reward || {};
  if (r.pot) beltAdd('pot', r.pot);
  if (r.couro) P.couro += r.couro;
  if (r.bmb) beltAdd('bmb', r.bmb);
  if (r.machado) give('Machado de arremesso', r.machado);
  if (r.faca) give('Faca de arremesso', r.faca);
  if (r.torch) addItem({ ty: 'wpn', q: 1, wi: wi('Tocha'), il: 1 });
  for (let k = 0; k < (r.magic || 0) + (opt.magic || 0); k++) addItem({ ty: 'wpn', q: 2, wi: pickWeapon(d.lv + 2, 2), il: d.lv + 2 });
  if (share < .1 && Math.random() < .35) addItem({ ty: 'wpn', q: 2, wi: Math.max(0, wi('Faca de arremesso')), il: d.lv, ct: 5 });   // mestria: chance de extra
  q.s = 'done';
  log('Missão concluída: ' + d.title + ' · +' + xp + ' XP · +' + gold + ' ouro' + (d.rewardTxt ? ' · ' + d.rewardTxt : '') + (share >= .1 ? ' (auto ' + Math.round(share * 100) + '% do tempo: −' + Math.round((1 - mult) * 100) + '%)' : ' (modo manual: +25%)'));
  lootText('🏆 ' + d.title);
  saveGame();
}

/** Missões ativas cuja etapa atual é do tipo `k` */
const active = k => QUESTS.map(d => [d, Q()[d.id]]).filter(([d, q]) => q && q.s === 'on' && stageOf(d, q).k === k && here(stageOf(d, q)));
const bump = (d, q) => { q.n++; if (q.n >= stageOf(d, q).n) advance(d, q); else saveGame(); };

// ---- eventos do jogo ----
on('enemy:killed', () => {
  const e = state.lastKill;
  if (!e) return;
  active('kill').forEach(([d, q]) => { if (e.t.n === 'Javali' && !e.qid) bump(d, q); });
  if (e.dun) active('dkill').forEach(([d, q]) => bump(d, q));
  active('wanted').forEach(([d, q]) => { if (e.t.boss && !e.dun) bump(d, q); });
  active('boss').forEach(([d, q]) => { if (e.qid === d.id) bump(d, q); });
});
on('dungeon:clear', () => { const lv = (state.dunNow && state.dunNow.lv) || 0; active('dclear').forEach(([d, q]) => { if (lv >= stageOf(d, q).min) bump(d, q); }); });
on('shot:thrown-hit', () => { active('throw').forEach(([d, q]) => bump(d, q)); });

// ---- itens no mundo (coletas): barris, fragmentos, ervas, tesouro ----
const PK = [];   // { m, x, z, id, si, night }
function pickMesh(kind, radius = 4) {
  const g = new THREE.Group(), L = c => new THREE.MeshLambertMaterial({ color: c }), add = (geo, c, y) => { const m = new THREE.Mesh(geo, L(c)); m.position.y = y; g.add(m); return m; };
  let col = 0xffd040;
  if (kind === 'barrel') { add(new THREE.CylinderGeometry(.42, .36, .8, 10), 0x8a5a2a, .4); [.2, .6].forEach(y => add(new THREE.CylinderGeometry(.43, .43, .06, 10), 0x3a2a1a, y)); }
  else if (kind === 'scroll') { const r = add(new THREE.CylinderGeometry(.12, .12, .6, 8), 0xe8d8a0, .45); r.rotation.z = 1.2; add(new THREE.CylinderGeometry(.13, .13, .08, 8), 0x8a5a2a, .45).rotation.z = 1.2; col = 0xffe080; }
  else if (kind === 'herb') { for (let k = 0; k < 5; k++) { const l = add(new THREE.ConeGeometry(.07, .5, 5), k % 2 ? 0x60d890 : 0x40b870, .25); l.position.x = Math.cos(k * 1.26) * .15; l.position.z = Math.sin(k * 1.26) * .15; l.rotation.z = Math.cos(k * 1.26) * .3; l.rotation.x = Math.sin(k * 1.26) * .3; } col = 0x80ffc0; }
  else if (kind === 'feather') { const f = add(new THREE.ConeGeometry(.06, .7, 5), 0x1a1a24, .4); f.rotation.z = 1.1; col = 0x9080ff; }
  else if (kind === 'bell') { add(new THREE.ConeGeometry(.28, .45, 10), 0xd8a830, .4); add(new THREE.SphereGeometry(.07, 6, 5), 0x6a4a1a, .15); col = 0xffd060; }
  else if (kind === 'ring') { const t = new THREE.Mesh(new THREE.TorusGeometry(radius, .12, 6, 40), new THREE.MeshBasicMaterial({ color: 0xa0c8ff, transparent: true, opacity: .75 })); t.rotation.x = Math.PI / 2; t.position.y = .15; g.add(t); col = 0xa0c8ff; }
  else { const m = add(new THREE.SphereGeometry(.6, 8, 5, 0, 6.28, 0, 1.5), 0x6a4a2a, 0); m.scale.y = .45; add(new THREE.BoxGeometry(.7, .06, .12), 0xc02020, .45).rotation.y = .78; add(new THREE.BoxGeometry(.7, .06, .12), 0xc02020, .45).rotation.y = -.78; col = 0xff8060; }   // monte de terra com um X vermelho
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 7, 6), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .35, depthWrite: false })); beam.position.y = 3.6; g.add(beam);   // facho: dá para ver de longe
  return g;
}
function clearPk(keep) { for (let i = PK.length - 1; i >= 0; i--) if (!keep || !keep(PK[i])) { scene.remove(PK[i].m); PK.splice(i, 1); } }
function updateCollects(dt, list) {
  const cur = list.filter(([d, q]) => ['collect', 'goto', 'hold', 'escort'].includes(stageOf(d, q).k));
  clearPk(p => cur.some(([d, q]) => d.id === p.id && q.i === p.si));   // some o que não é da etapa atual
  cur.forEach(([d, q]) => {
    const st = stageOf(d, q);
    if (!PK.some(p => p.id === d.id && p.si === q.i)) {   // cria os que faltam
      const area = st.k !== 'collect';
      for (let k = area ? 0 : q.n; k < (area ? 1 : st.n); k++) {
        const pt = st.spot(k); if (!pt) break;
        const m = pickMesh(st.model, st.r); m.position.set(pt.x, 0, pt.z); scene.add(m); PK.push({ m, x: pt.x, z: pt.z, id: d.id, si: q.i, night: !!st.night, msg: st.msg, area });
      }
    }
  });
  const night = isNight(hourNow());
  for (let i = PK.length - 1; i >= 0; i--) {
    const p = PK[i], hid = p.night && !night;
    p.m.visible = !hid; p.m.rotation.y += dt;
    if (!p.area && !hid && Math.hypot(P.x - p.x, P.z - p.z) < 1.8) {
      const e = cur.find(([d, q]) => d.id === p.id && q.i === p.si);
      scene.remove(p.m); PK.splice(i, 1); lootText(p.msg);
      if (e) bump(e[0], e[1]);
    }
  }
}

// ---- escolta: NPC que segue o jogador e perde vida quando inimigos chegam perto dele ----
const ESC = { g: null, hp: 0, max: 1, bar: null };
const escortInfo = () => ESC.g ? 'vida do Breu ' + Math.round(100 * ESC.hp / ESC.max) + '%' + (Math.hypot(P.x - ESC.g.position.x, P.z - ESC.g.position.z) > 14 ? ' — ele ficou para trás!' : '') : 'procurando o Breu';
function clearEscort() { if (ESC.g) { scene.remove(ESC.g); ESC.g = null; } }
function ensureEscort(d, st) {
  if (ESC.g) return;
  const src = npcList.find(n => n.info && n.info.name === 'Mestre Breu'), sx = src ? src.g.position.x : P.x + 2, sz = src ? src.g.position.z : P.z + 2;
  const g = person(undefined, 0, 0, 0, { sk: 'calafate', f: false, ov: {} });
  const p = freePoint(sx + 2, sz + 2, .6); g.position.set(p.x, groundY(p.x, p.z), p.z); g.scale.setScalar(1.05); scene.add(g);
  const bar = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x40d070, depthTest: false })); bar.scale.set(1.2, .14, 1); bar.position.y = 2.5; bar.renderOrder = 999; g.add(bar);
  Object.assign(ESC, { g, bar, max: 120 + 20 * d.lv, hp: 120 + 20 * d.lv, ex: p.x, ez: p.z, v: 0 });
}
function updateEscort(dt, list) {
  const eq = list.find(([d, q]) => { const k = stageOf(d, q).k; return d.id === 'calafate' && (k === 'escort' || k === 'hold'); });
  if (!eq) { clearEscort(); return; }
  const [d, q] = eq, st = stageOf(d, q);
  ensureEscort(d, st);
  const g = ESC.g, pk = PK.find(p => p.id === d.id && p.si === q.i);
  let x = g.position.x, z = g.position.z;
  // segue o jogador (parado no círculo durante o conserto)
  const tx = st.k === 'hold' && pk ? pk.x : P.x, tz = st.k === 'hold' && pk ? pk.z : P.z, dist = Math.hypot(tx - x, tz - z);
  const want = st.k === 'hold' ? (dist > 1.5 ? 3 : 0) : dist > 14 ? 4.2 : dist > 3 ? 3.3 : 0;
  ESC.v += (want - ESC.v) * (1 - Math.exp(-dt * 6));
  if (ESC.v > .05) { const ang = Math.atan2(tx - x, tz - z); [x, z] = slideTo(x, z, x + Math.sin(ang) * ESC.v * dt, z + Math.cos(ang) * ESC.v * dt); g.rotation.y = ang; }
  g.position.set(x, groundY(x, z), z);
  gait(g, dt, gaitSpeed(ESC.v), { sword: false });
  // inimigos colados no Breu o machucam
  enemies.forEach(e => { if (!e.dead && Math.hypot(e.x - x, e.z - z) < 2.4) ESC.hp -= e.dmg * .25 * dt; });
  ESC.bar.scale.x = Math.max(.02, 1.2 * ESC.hp / ESC.max);
  if (ESC.hp <= 0) {   // Breu caiu: recomeça a escolta
    log('O Mestre Breu caiu! Fale com ele de novo para recomeçar a escolta.');
    q.i = 0; q.n = 0; q.wv = 0; clearEscort(); clearPk(); saveGame(); return;
  }
  if (st.k === 'escort' && pk) {   // chegou ao porto?
    if (Math.hypot(x - pk.x, z - pk.z) < st.r) advance(d, q);
    else if ((q.wv = (q.wv || 0) - dt) <= 0) {
      q.wv = st.waves.every;
      for (let i = 0; i < st.waves.count; i++) {
        const a = Math.random() * 6.28, p = freePoint(x + Math.cos(a) * 14, z + Math.sin(a) * 14, .8);
        spawn(st.waves.kind, p.x, p.z, undefined, { lv: d.lv }); enemies[enemies.length - 1].ag = true;
      }
      log('Inimigos atacam a escolta!');
    }
  }
}

let bossOut = false, T = 0;
function ensureBoss(d) {
  if (bossOut && enemies.some(e => e.qid === d.id && !e.dead)) return;
  const bs = d.stages.find(x => x.k === 'boss');
  if (bs && bs.at) {   // chefe de missão com ponto próprio
    const p = bs.at(); if (!p || Math.hypot(P.x - p.x, P.z - p.z) > 120) return;
    spawn(bs.kind, p.x, p.z, undefined, { lv: Math.max(d.lv, P.lv), elite: true });
    enemies[enemies.length - 1].qid = d.id; bossOut = true; log('⭐ ' + bs.name + ' apareceu!'); return;
  }
  const n = npcByShop('farm-granja');
  const bx = n ? n.g.position.x : P.x, bz = n ? n.g.position.z : P.z;
  if (!n || Math.hypot(P.x - bx, P.z - bz) > 120) return;   // só cria quando o jogador está por perto
  const p = freePoint(bx + 16, bz + 6, 1);
  spawn(KIND.JAVALI, p.x, p.z, undefined, { lv: Math.max(3, P.lv), elite: true });
  enemies[enemies.length - 1].qid = d.id; bossOut = true;
  log('O Presa-Torta apareceu perto da granja!');
}

/** Etapas de área: 'goto' (chegar ao ponto) e 'hold' (ficar dentro do círculo por n segundos, com ondas de inimigos) */
function updateAreas(dt, list) {
  const night = isNight(hourNow());
  list.forEach(([d, q]) => {
    const st = stageOf(d, q);
    if (st.k !== 'goto' && st.k !== 'hold') return;
    const pk = PK.find(p => p.id === d.id && p.si === q.i); if (!pk) return;
    const hid = st.night && !night, r = st.r || 4, dist = Math.hypot(P.x - pk.x, P.z - pk.z);
    pk.m.visible = !hid;
    if (st.k === 'goto') { if (dist < r) advance(d, q); return; }
    if (hid) return;
    if (dist < r) {
      q.n += dt;
      if ((q.wv = (q.wv || 0) - dt) <= 0) {   // nova onda de inimigos ao redor do círculo
        q.wv = st.waves.every;
        for (let i = 0; i < st.waves.count; i++) {
          const a = Math.random() * 6.28, p = freePoint(pk.x + Math.cos(a) * (13 + Math.random() * 4), pk.z + Math.sin(a) * (13 + Math.random() * 4), .8);
          spawn(st.waves.kind, p.x, p.z, undefined, { lv: d.lv + (st.waves.add || 0) });
          enemies[enemies.length - 1].ag = true;
        }
        log('Uma onda de inimigos se aproxima!');
      }
      if (q.n >= st.n) advance(d, q);
    } else q.n = Math.max(0, q.n - dt * .5);   // saiu do círculo: o progresso vai se perdendo devagar
  });
}

/** Cervo Branco: progresso só enquanto o jogador está perto e calmo */
function updateStalk(dt, list) {
  list.forEach(([d, q]) => {
    if (stageOf(d, q).k !== 'stalk') return;
    const w = whiteDeer(); if (!w) return;
    const st = stageOf(d, q), dist = Math.hypot(P.x - w.x, P.z - w.z);
    if (dist < st.r && w.calm) { q.n += dt; if (q.n >= st.n) { lootText('Você viu o Cervo Branco!'); advance(d, q); } }
    else q.n = Math.max(0, q.n - dt * .5);
  });
}

/** Lebre Dourada: conta quando o jogador a alcança */
function updateCatch(dt, list) {
  list.forEach(([d, q]) => {
    if (stageOf(d, q).k !== 'catch') return;
    const g = goldenHare(); if (!g) return;
    if (Math.hypot(P.x - g.x, P.z - g.z) < 2.2 && !P.dead) { lootText('Você alcançou a Lebre Dourada!'); advance(d, q); }
  });
}

/** Biscoito, o rato fujão: foge do jogador aos trancos; ao ser alcançado, conta e reaparece longe */
const RAT = { g: null, x: 0, z: 0, hd: 0, v: 0, tm: 0, pause: 0 };
function ratMesh() {
  const g = new THREE.Group(), L = c => new THREE.MeshLambertMaterial({ color: c });
  const b = new THREE.Mesh(new THREE.SphereGeometry(.2, 8, 6), L(0x8a7a6a)); b.scale.set(1, .7, 1.7); b.position.y = .16; g.add(b);
  const h = new THREE.Mesh(new THREE.SphereGeometry(.11, 8, 6), L(0x9a8a7a)); h.scale.set(1, .9, 1.2); h.position.set(0, .18, .36); g.add(h);
  [-.07, .07].forEach(x => { const e = new THREE.Mesh(new THREE.SphereGeometry(.05, 6, 5), L(0xd8a0a0)); e.position.set(x, .3, .3); g.add(e); });
  const t = new THREE.Mesh(new THREE.CylinderGeometry(.015, .03, .45, 5), L(0xd8a0a0)); t.rotation.x = 1.3; t.position.set(0, .12, -.55); g.add(t);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffe080, transparent: true, opacity: .35, depthWrite: false })); beam.position.y = 3.2; g.add(beam);
  return g;
}
function ratRespawn() {
  const a = Math.random() * 6.28, r = VILLAGE_R * .5 + Math.random() * 40, p = freePoint(Math.cos(a) * r, Math.sin(a) * r, .6);
  RAT.x = p.x; RAT.z = p.z;
}
function updateRat(dt, list) {
  const rq = list.find(([d, q]) => stageOf(d, q).k === 'chase');
  if (!rq) { if (RAT.g) { scene.remove(RAT.g); RAT.g = null; } return; }
  const [d, q] = rq;
  if (!RAT.g) { RAT.g = ratMesh(); scene.add(RAT.g); ratRespawn(); }
  const dx = RAT.x - P.x, dz = RAT.z - P.z, dist = Math.hypot(dx, dz) || 1;
  if ((RAT.tm -= dt) <= 0) { RAT.go = !RAT.go; RAT.tm = RAT.go ? 1.2 + Math.random() * 1.2 : .6 + Math.random() * .5; }   // corre um pouco, para um pouco
  const sp = dist < 14 && RAT.go ? 5 : 0;
  if (sp > 0) {
    const base = Math.atan2(dx, dz);
    let best = base, ok = false;
    for (const off of [0, .6, -.6, 1.2, -1.2, 2]) { const h = base + off; if (walkable(RAT.x + Math.sin(h) * 1.2, RAT.z + Math.cos(h) * 1.2)) { best = h; ok = true; break; } }
    if (!ok) best = base + 3;
    RAT.hd += Math.atan2(Math.sin(best - RAT.hd), Math.cos(best - RAT.hd)) * Math.min(1, dt * 12);
    [RAT.x, RAT.z] = slideTo(RAT.x, RAT.z, RAT.x + Math.sin(RAT.hd) * sp * dt, RAT.z + Math.cos(RAT.hd) * sp * dt);
  }
  RAT.g.position.set(RAT.x, groundY(RAT.x, RAT.z), RAT.z); RAT.g.rotation.y = RAT.hd;
  RAT.g.position.y += sp > 0 ? Math.abs(Math.sin(performance.now() * .02)) * .05 : 0;
  if (dist < 1.6 && !P.dead) { lootText('Pegou o Biscoito! Ele escapou...'); ratRespawn(); RAT.go = false; RAT.tm = 1.5; bump(d, q); }
}

/** Todo quadro: contagem de tempo (para a penalidade do auto) e objetos das missões */
export function updateQuests(dt) {
  const all = QUESTS.map(d => [d, Q()[d.id]]).filter(([d, q]) => q && q.s === 'on');
  all.forEach(([d, q]) => { q.t += dt; if (state.autoOn) q.a += dt; });
  const list = all.filter(([d, q]) => here(stageOf(d, q)));
  const cr = state.contract && state.contract.run;
  if (cr) { cr.t += dt; if (state.autoOn) cr.a += dt; const lim = CONTRACTS[state.contract.c].limit; if (lim && cr.t > lim) failC('o tempo acabou'); }
  updateCollects(dt, list);
  updateAreas(dt, list);
  updateEscort(dt, list);
  updateStalk(dt, list);
  updateRat(dt, list);
  updateCatch(dt, list);
  list.forEach(([d, q]) => {   // limite de tempo da etapa (ex.: voltar antes da maré cobrir)
    const st = stageOf(d, q);
    if (st.limit && q.tl != null && (q.tl -= dt) <= 0) { q.i = st.back || 0; q.n = 0; q.tl = null; clearPk(); log('Tempo esgotado! ' + d.title + ': recomece pela etapa anterior'); saveGame(); }
  });
  if ((T -= dt) > 0) return;
  T = 1.5;
  const jq = list.find(([d, q]) => stageOf(d, q).k === 'boss');
  if (jq) ensureBoss(jq[0]); else bossOut = false;
}

/** Regiões das missões ativas para o mapa: [{ x, z, r, t }] (círculo amarelo). Os pontos exatos recebem um deslocamento fixo: marca a REGIÃO, não o ponto. */
export function questMarks() {
  const out = [], jit = v => ((Math.abs(Math.round(v * 7)) % 11) - 5);
  QUESTS.forEach(d => {
    const q = Q()[d.id];
    if (!q || q.s !== 'on') return;
    const st = stageOf(d, q);
    if (!here(st)) return;
    if (st.k === 'collect' || st.k === 'goto' || st.k === 'hold' || st.k === 'escort') PK.filter(p => p.id === d.id && p.si === q.i).forEach(p => out.push({ x: p.x + jit(p.x), z: p.z + jit(p.z), r: 18, t: d.title }));
    else if (st.k === 'boss') {
      const e = enemies.find(z => z.qid === d.id && !z.dead);
      if (e) out.push({ x: e.x, z: e.z, r: 22, t: d.title });
      else if (st.at) { const p = st.at(); if (p) out.push({ x: p.x, z: p.z, r: 32, t: d.title }); }
      else { const n = npcByShop('farm-granja'); if (n) out.push({ x: n.g.position.x + 16, z: n.g.position.z + 6, r: 32, t: d.title }); }
    } else if (st.k === 'wanted') {
      const e = enemies.find(z => !z.dead && z.t.boss && !z.dun);
      if (e) out.push({ x: e.x, z: e.z, r: 30, t: d.title });
      else { const f = POST_DATA.find(p => /Capitão Maldito/.test(p.n || p.name || '')); if (f) out.push({ x: f.x, z: f.z, r: 34, t: d.title }); }
    } else if (st.k === 'catch') {
      const g = WILD.hares.find(a => a.gold); if (g) out.push({ x: g.x, z: g.z, r: 34, t: d.title });
    } else if (st.k === 'chase') {
      if (RAT.g) out.push({ x: RAT.x, z: RAT.z, r: 30, t: d.title });
    } else if (st.k === 'stalk') {
      const w = WILD.deer.find(a => a.white); if (w) out.push({ x: w.x, z: w.z, r: 34, t: d.title });
    } else if (st.k === 'kill') {
      let b = null, bd = 1e9;
      enemies.forEach(z => { if (!z.dead && z.t.n === 'Javali' && !z.qid) { const dd = Math.hypot(z.x - P.x, z.z - P.z); if (dd < bd) { bd = dd; b = z; } } });
      if (b) out.push({ x: b.x, z: b.z, r: 26, t: d.title });
    }
  });
  return out;
}
