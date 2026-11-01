# Ilhas de ruínas: Vampiros, Hidra e Múmia

Três ilhas temáticas de chefe, no mesmo molde das ilhas da Medusa e dos Dragões, mas **sem vila nem castelo**: só o barqueiro no cais, um acampamento de chegada
(zona segura, no centro, no lugar da vila), ruínas e acampamentos em cada posto inimigo e peças temáticas soltas pela ilha.
Abra com `?seed=vampiros`, `?seed=hidra` ou `?seed=mumia` (ou escolha o destino com o barqueiro: 90, 110 e 130 de ouro).

| Ilha | Semente | Inimigos | Chefe | Cenário |
|---|---|---|---|---|
| Vampiros | `vampiros` | Zumbi, Esqueleto, Esqueleto Guerreiro, Pirata Fantasma, Múmia, Vampiro | **Conde Vampiro** (Castelo do Conde Vampiro) | cemitérios, capelas, abadias e catacumbas em ruínas, caixões, torres, céu roxo-sangue |
| Hidra | `hidra` | Esqueleto, Esqueleto Guerreiro, Serpente, Cria da Hidra | **Hidra** (Covil da Hidra) | brejo: poças, juncos, árvores de pântano, estátuas de cabeças de hidra, altar das 7 cabeças |
| Múmia | `mumia` | Caveira, Bandido do Deserto, Múmia | **Faraó Múmia** (Pirâmide do Faraó) | deserto: tendas de bandidos, mercado saqueado, sarcófagos, obeliscos, esfinges, pirâmide |

A **Múmia** também aparece na Ilha da Medusa (3 postos e a dungeon da Medusa) e na Ilha dos Vampiros.
Cada ilha tem 8 postos (do mais fácil ao mais difícil; o último é o do chefe) e as dungeons usam os monstros e o chefe da ilha.

## Inimigos (data/enemies.js · KIND.*)
- **Zumbi** (ZUMBI): lento e resistente, pele podre em 3 tons, olho leitoso e olho brilhante, costelas à mostra, mão decepada, moscas em volta; anda arrastando a perna e de braços esticados.
- **Vampiro** (VAMPIRO): 3 casas (carmesim, roxo real, azul-noite), capa articulada, presas, olhos vermelhos. **Investida Sombria** (agacha e salta sobre o jogador) e o golpe **cura** o vampiro (`drain`).
- **Conde Vampiro** (CONDE, chefe): coroa, ombreiras de espinhos e morcegos em volta. Alterna golpe normal e **Enxame de Morcegos** (paira de braços abertos, anel vermelho no chão); abaixo de 50% fica furioso.
- **Múmia** (MUMIA): 3 tipos de bandagem, 4 cores de olho, tiras soltas; o golpe aplica **maldição** (lentidão, `slow`).
- **Faraó Múmia** (FARAO, chefe): máscara e nemes de ouro, colar usekh e cajado; pancada em área (Tempestade de Areia) e fúria abaixo de 50%.
- **Bandido do Deserto** (BANDIDO) e **Caveira** (CAVEIRA, esqueleto do deserto com faixa de ouro e olhos verdes).
- **Hidra** (HIDRA, chefe, 7 cabeças + 2 que brotam na fúria) e **Cria da Hidra** (HIDRINHA, 3 cabeças): as cabeças dão o bote uma de cada vez; a Hidra cospe o **Jato Venenoso** (cone verde no chão: saia ou role) e regenera 8% da vida ao enfurecer.

## Arquivos
- `js/core/isle.js`: `VAMPIRE_ISLE`, `HYDRA_ISLE`, `MUMMY_ISLE` e `RUINS_ISLE`.
- `js/data/enemies.js` (tipos 15–23), `posts.js` (`VAMPIRE_CAMPS`, `HYDRA_CAMPS`, `MUMMY_CAMPS`), `npcs.js` (`ISLANDS`), `scaling.js` (tier 3).
- `js/entities/undead-model.js` (zumbi, vampiro, múmia, bandido, caveira) · `undead.js` (investida, cura, maldição, fúria) · `hydra-model.js` · `hydra.js`.
- `js/world/ruins-isle.js`: acampamento de chegada, ruínas dos postos, peças soltas e árvores temáticas; `terrain-mesh.js` (cor do chão e vegetação), `daynight.js` (céu), `terrain.js` (sem castelo), `world.js` e `main.js` (sem vila, castelo, fazenda e animais).
- `js/dungeon/dungeon-scene.js` e `js/world/caves.js`: monstros, chefe e nomes das dungeons de cada ilha.
- `js/systems/player-update.js`: `P.slow` (lentidão da maldição e do veneno); `js/systems/combat.js`: mensagem de morte do chefe (`msg`).
