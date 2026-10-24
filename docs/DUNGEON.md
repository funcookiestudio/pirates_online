# Sistema de dungeon — análise e plano de integração

Fonte: `Dungeon_low_poly_v2.html` (gerador procedural 64×64, 3 temas).

## Pontos positivos
- Gerador **determinístico** por (semente + tema): a mesma caverna gera sempre a mesma dungeon, então dá para guardar só a semente.
- **Conectividade garantida**: salas ligadas por árvore geradora (Prim), atalhos que viram ciclos, becos com câmara no fim, e tudo que ficou inalcançável é removido (BFS).
- **Início e saída** são o par de salas mais distantes pelo caminho; já existem papéis (início, saída, salão, beco, sala).
- Três temas distintos: cripta (salas e corredores), ruínas (cripta erodida) e caverna (autômato celular).
- Renderização barata: piso e paredes em `InstancedMesh`, poucas luzes, neblina; as paredes entre a câmera e o herói baixam (equivalente ao nosso raio-X).
- Colisão em grade simples, minimapa com névoa de exploração e estrutura leve para celular.

## Pontos negativos
- Gerador e visual estão misturados e usam variáveis globais; foi preciso separar (feito em `js/dungeon/dungeongen.js`).
- Escala própria (1 célula = 1 unidade, herói a 0,6): nosso personagem tem ~2 m; as células precisam de 2 m ou o mapa fica apertado.
- Não tem inimigos, loot, baús, portas, chaves nem chefe; os becos são só "pontos futuros".
- Não tem conceito de **nível**/dificuldade (salas fixas em 11–16, sempre 64×64).
- A saída é um portal para a "próxima dungeon", não de volta à ilha.
- Até 7 luzes de ponto; no celular isso pesa.
- A caverna às vezes gera salões enormes e vazios; a cripta tem corredores longos e repetitivos.
- Personagem duplicado no arquivo (`person`), diferente do nosso.

## Como entra no jogo (fases)
1. **Entradas nas encostas + aviso** (feito): `terrain.js` escolhe até 3 encostas (perto, meio, borda da ilha) com a montanha subindo atrás e chão plano à frente; `caves.js` desenha a boca de pedra e pergunta se quer entrar, com nível e informações geradas pelo próprio gerador.
2. **Cena da dungeon**: construir o mapa em instâncias (célula = 2 m), com o nosso personagem, câmera e raio-X; esconder a ilha enquanto o jogador está dentro (mesma cena, outro local), e trocar o chão/colisão do terreno pelo da grade.
3. **Inimigos e chefe**: salas recebem grupos com `spawn()` no nível da dungeon (`tier + 3 + distância`), chefe no fim (+4 níveis) e elites.
4. **Loot e segredos**: baús nos becos, baú do chefe, itens com o nível da dungeon.
5. **Saída**: portal ao fim volta para a boca da caverna com a recompensa; a runa de início também sai.
6. **Ajustes**: tamanho e número de salas crescendo com o nível, tema por ilha, nome e recompensa fixos por semente.

## Nível da dungeon
`Nv = bônus da ilha + 3 + (distância da vila − 34) / 10` (arredondado); o chefe tem +4.

## Fase 2 (feita)
`dungeon/dgrid.js` guarda a grade ativa (colisão, chão e BFS); `terrain.js` e `steer.js` consultam quando o jogador está dentro. `dungeon/dungeon-scene.js` constrói piso/paredes (instâncias, célula 2 m, paredes com raio-X) em (3000,3000), nasce inimigos por sala (nível da dungeon, 12% elites), chefe (+4) no fim, baús nos becos e do chefe, portal de entrada e portal de saída (abre ao matar o chefe). Morrer dentro devolve ao último posto.

## Fase 3 (feita)
Minimapa da dungeon com névoa de exploração (só células vistas, portais, baús e inimigos já avistados); recompensa de 1ª vitória (ouro, XP e Tocha mágica) salva em `state.dunDone` (por semente) e indicada no card (✔).

## Fase 4 (feita)
`dungeon/dungeon-gimmicks.js`: **porta trancada** num gargalo do caminho até o chefe (procura uma célula onde bloquear 1–5 células corta o início do chefe; se o mapa é aberto demais, não há porta). A porta é parede na grade (A* e colisão a respeitam) até o jogador chegar com a **chave**, que cai de um **guardião elite** (+2 níveis) posto na sala alcançável mais distante do início. **Armadilhas de espinhos** (5 + nível/6, máx. 14) com ciclo de 3,4 s (aviso → sobem → recolhem); dano 6% da vida + 2×nível, a rolada esquiva. Dungeons de nível ≥ 20 / ≥ 40 ganham +1 inimigo por sala e mais elites. Minimapa marca a porta (vermelho) e a chave (amarelo). A grade da dungeon é copiada a cada entrada (a porta não altera o gerador em cache).
