# O que testar à mão (celular e PC)

Os testes automáticos não substituem o aparelho real. Marque cada item ao testar; crie um personagem novo de cada classe e, para o "sem classe", use um personagem antigo.

## Para todos
- [ ] Personagem **sem classe**: hotbar, diamantes (o da direita mostra a vida do companheiro), painéis e combate iguais aos de antes; Cutelo na mão.
- [ ] **Desempenho no celular** usando cada habilidade em combate com vários inimigos (FPS estável, sem travadas ao lançar a Tempestade, a Chuva de Balas e a Dança).
- [ ] Salvar, fechar e reabrir: ranks, talentos, flechas, armas e equipamento voltam iguais.
- [ ] Sair e entrar numa **dungeon** com habilidades ativas: nada fica no chão ou preso (armadilhas, bolas, adagas, raios).

## Hotbar e mana
- [ ] Botões 1/2/3 ao lado do Q (PC e celular deitado) e em coluna no arco (celular em pé): sem sobreposição, toque certo.
- [ ] Anel de recarga, custo de mana, cadeado cinza "Nv 6 / Nv 12" e tooltip (segure/passe o mouse).
- [ ] Diamante azul de mana: enche e esvazia; pisca ao faltar mana; o número aparece.
- [ ] Editor de layout (Ajustes ▸ Posição dos botões): os 3 botões de habilidade arrastam e mudam de tamanho.
- [ ] Teclas 1/2/3 e remapear (Ajustes ▸ Teclas das habilidades e painel de Habilidades).

## Habilidades (conferir visual, dano e recarga)
- [ ] **Guerreiro:** Pele de Ferro (bolha dourada a cada 3 golpes), Golpe Cataclísmico (salto, rachaduras, atordoa), Grito de Guerra (aura vermelha, inimigos te miram), Muralha (casco de pedra que quebra e dá onda de choque).
- [ ] **Caçador:** Olho de Águia (retículo a mais de 6 de distância), Tiro Perfurante (atravessa vários), Armadilha (máx. 2, prende e sangra), Chuva de Balas (área verde, 8 tiros).
- [ ] **Mago:** Fluxo Arcano (orbes girando, mana volta rápido), Bola de Fogo (queima), Nova de Gelo (lentidão, inimigos azulados), Tempestade (levita, raios, céu violeta).
- [ ] **Ladino:** Golpe Furtivo (X branco no 1º golpe; +velocidade ao esquivar), Passo Sombrio (some e reaparece atrás), Adagas Venenosas (veneno acumula até 3×), Dança das Lâminas (invulnerável e semitransparente).
- [ ] Passo Sombrio/Dança/salto **não atravessam parede nem entram em casa**.
- [ ] O 1º golpe furtivo também vale contra **chefes** (dragão, hidra, Medusa).

## Painéis
- [ ] **Habilidades:** lista da classe com custo/recarga/descrição; "Melhorar" gasta 1 ponto (1 por nível a partir do 2) e muda recarga e custo; rank máximo 3; Redefinir devolve os pontos.
- [ ] **Talentos:** 3 ramos por classe; Aprender (1 ponto a cada 2 níveis a partir do 3); o nó seguinte só abre depois do anterior; Redefinir tira também a vida/mana extra; vida máx. e mana máx. sobem ao aprender talentos de vida/mana.
- [ ] Painéis cabem na tela no celular em pé e deitado, sem cortar botões.

## Armas
- [ ] Arma inicial certa na mão: Guerreiro (Espada Longa + escudo na mão livre), Caçador (Arco Curto + Cutelo reserva + 30 flechas), Mago (Cajado + Cutelo reserva), Ladino (uma adaga em cada mão).
- [ ] **Arco/besta:** puxar a corda, flecha encaixada, soltar; gasta flecha/virote; sem munição mostra a mensagem e o auto troca para o corpo a corpo.
- [ ] **Flechas no chão:** as que acertam caem perto do alvo e são recolhidas ao passar; não passa de 99; o auto só recolhe se usar a arma.
- [ ] **Cajado/rod:** orbe colorido, gasta mana; sem mana vira pancada curta.
- [ ] **Escudo:** reduz o dano recebido (8%); ao equipar arma de duas mãos o escudo sai.
- [ ] **Loja do ferreiro:** arcos, bestas, cajados, rods, escudo e adaga; Flechas ×20 e Virotes ×15 (preço e limite 99).
- [ ] **Save antigo:** personagem com classe e Cutelo nv1 recebe a arma da classe uma vez.

## Auto-combate
- [ ] Usa as 3 skills da classe (a mais forte primeiro) sem zerar a mana.
- [ ] **Compra flechas sozinho** no ferreiro quando ≤ o mínimo (Ajustes ▸ Auto ▸ "Flechas e virotes") e volta ao arco depois.
- [ ] Sem flechas ele guarda o arco e usa a arma corpo a corpo; com flechas de novo (e inimigo longe), volta ao arco.

## Conhecido / não verificado
- Visual do escudo, da adaga na mão livre e das poses de arco e cajado (só medidos por ângulo).
- Balanceamento: tudo é estimativa; ajuste em `js/data/skills.js` (TUNE, RANK, TALENTS) e `js/data/weapons-class.js`.
