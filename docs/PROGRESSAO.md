# Progressão: inimigos, níveis, XP e loot

Fórmulas em `js/data/scaling.js` (um só lugar para ajustar o equilíbrio).

## Dificuldade por ilha
- Cada ilha tem um **tier** (0–3): Natal 0, Corvo 1, Tormenta 2, Caveira 3. Sementes desconhecidas (`?seed=`) caem num tier estável pelo hash.
- Bônus de nível da ilha = `tier × 7`.
- Nível do inimigo = nível do papel (`data/enemies.js`, define o anel: perto da vila fácil, borda difícil) + bônus da ilha + 0–1 de variação.
- Ilhas tier ≥ 2 têm postos mais cheios (+1 inimigo a cada 2 tiers, até 6).

## Estatísticas
- Vida = `hm × (28 + 11·L)`, dano = `dm × (3 + 1,1·L)`; `hm`/`dm` são os multiplicadores do arquétipo.
- XP = `xm × 9 × L^1,1`.
- **Elite** (5% + 2%/tier + 2%/anel, só do anel 2 em diante): +2 níveis, vida ×1,8, dano ×1,3, XP ×2,5, 12% maior, barra de vida dourada, loot melhor.
- **Boss** (Capitão Maldito): nível 12 + bônus da ilha, sempre 4 itens.

## XP do jogador
- XP para o próximo nível = `32·L^1,6 + 28` (nível 1 = 60).
- Multiplicador por diferença de nível (inimigo − jogador): ≤ −8 → 5%, −4..−7 → 25%, −1..−3 → −15% por nível, 0..+5 → +12% por nível.

## Loot
- Ouro = `(2 + 2L) × (1 + 0,03L)`.
- Qualidade (lendário/mágico/comum) sobe com o nível do inimigo; elite tem bônus.
- O item guarda o nível (`il`) e o valor escala `×(1 + 0,2·(il − 1))`.

## Respawn
- O inimigo reaparece com o mesmo nível; elite pode voltar comum e vice-versa (6% de chance de elite nova).
