# Pirata ARPG

ARPG 3D (Three.js) de pirata: explore a ilha, enfrente esqueletos, piratas fantasmas e o Capitão Maldito, colete loot e evolua junto com seu companheiro.

## Como rodar

O jogo usa módulos ES, então **não abre com duplo clique** no `index.html` (o navegador bloqueia `import` em `file://`). Sirva a pasta com qualquer servidor local:

```bash
python3 -m http.server 8000     # depois abra http://localhost:8000
# ou:  npm start
# ou:  extensão "Live Server" do VS Code
```

## Controles

| Ação | Tecla / toque |
|---|---|
| Mover / atacar | Clique ou toque no chão / no inimigo |
| Giro de espada | `Q` |
| Bomba (vai até o ponto apontado) | `W` |
| Poção de vida | `E` |
| Esquiva (rolada para trás, invulnerável) | `Espaço` |
| Zoom da câmera | roda do mouse, `+` / `-` ou pinça (dois dedos) |
| Girar a câmera | arrastar com o botão direito, setas `←` `→` ou girar dois dedos |
| Sentar / levantar (teste da animação) | `G` |
| Companheiro ataca / só coleta | `R` |
| Auto combate | `T` |
| Personagem, mochila e companheiros | `I` (ou `C`) · `Esc` fecha |

## Estrutura

```
index.html          Estrutura da página (HUD, hotbar, painel) e carregamento dos scripts
css/
  base.css          Página e canvas
  hud.css           Status, vida do inimigo, minimapa, missão, log, avisos, XP
  hotbar.css        Hotbar em forma de navio, diamantes de vida e habilidades
  panels.css        Painel do personagem, mochila, companheiros e árvore de habilidades
js/
  main.js           Ponto de entrada: monta tudo e roda o loop do jogo
  core/             Base compartilhada
    engine.js         Cena, câmera, renderizador e luzes
    state.js          Estado global (hit-stop, tremor, auto combate, pet ativo…)
    registry.js       Listas do mundo (inimigos, loot, partículas, balas, bombas…)
    events.js         Mini barramento de eventos (lógica avisa a interface)
    utils.js          Atalhos ($, materiais, caixas) e helpers
  data/             Apenas dados, sem lógica
    weapons.js        Armas, raridades e armaduras
    enemies.js        Tipos de inimigos
    pets.js           Companheiros e árvore de habilidades
  world/
    world.js          Chão, árvores e pedras
  entities/         Coisas que existem no mundo
    character.js      Corpo "de blocos" (jogador e inimigos)
    player.js         Dados do jogador, dano recebido, nível
    player-weapon.js  Arma na mão e pose de mira (IK)
    enemies.js        Criação, IA, animação e reaparecimento
    loot.js           Queda, coleta e efeito dos itens
  systems/          Regras que rodam a cada frame
    player-update.js  Movimento, ataque e animação do jogador
    combat.js         Dano, golpes, balas, giro, bomba e poção
    inventory.js      Mochila e equipamento
    auto.js           Auto combate
    input.js          Mouse/toque, teclado e botões
    camera.js         Câmera que segue o jogador
    effects.js        Partículas
  pets/             Companheiros
    manager.js        Troca de pet, ataque ligado/desligado, vida do pet
    stats.js          Nível, XP e bônus das habilidades
    strike.js         Golpe do companheiro (crítico, sangramento, área…)
    common.js         Funções compartilhadas (em combate? loot mais próximo)
    models.js         Modelos 3D: papagaio, corvo, cachorro e macaco
    flyer.js          Comportamento do papagaio e do corvo
    monkey.js         Comportamento do macaco
    dog.js            Comportamento do cachorro
  ui/               Interface
    notify.js         Log, banner de nível, números de dano, fim de jogo
    hud.js            Barras, status, missão e atualização do HUD
    hotbar.js         Botão do companheiro
    minimap.js        Minimapa
    panel.js          Painel do personagem e mochila
    pet-panel.js      Companheiros e árvore de habilidades
```

## Convenções

- **`P`** é o jogador (vida `hp/max`, nível `lv`, dano `dmg`, posição `x/z`…). Os campos estão comentados em `entities/player.js`.
- **Dependências em uma direção:** `data` e `core` não dependem de ninguém; `entities`, `systems` e `pets` usam o núcleo; `ui` só recebe avisos da lógica pelo `events.js`.
- **Para adicionar algo:** nova arma → `data/weapons.js` · novo inimigo → `data/enemies.js` · nova habilidade de pet → `data/pets.js` · novo atalho → `systems/input.js`.

## Depuração
Abra a página com `#dev` no endereço para expor `window.__game` (`P`, `state`, `enemies`, `mountWeapon`) no console.
