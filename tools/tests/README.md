# Testes headless do jogo

Scripts de verificação automática (Playwright + Edge/Chromium, three r128 local, sem GPU). Não são parte do jogo: nada aqui entra no build.

## Preparar (uma vez)

```bash
cd tools/tests
npm init -y && npm i playwright-core          # só a biblioteca, sem baixar navegador
mkdir three && cd three && npm pack three@0.128.0 && tar xzf three-0.128.0.tgz && cd ..   # three r128 local (a CDN fica bloqueada no teste)
```

Navegador: no Windows usa o Edge instalado; em outro sistema defina `BROWSER=/caminho/do/chromium`.
Outro local do three: `THREE_JS=/caminho/three.min.js`. (`node_modules/` e `three/` não vão para o git.)

## Rodar

Em um terminal, sirva a pasta do jogo: `node tools/tests/serve.js 8765`. Em outro, a partir de `tools/tests`:

| Script | O que confere |
| --- | --- |
| `node test-skills-ui.js 8765 [classes]` | botões das habilidades na hotbar, diamante de mana, clique e teclas 1/2/3, medição de caixas (1280×720, 390×800, 780×360) |
| `node test-weapons.js 8765 [classes]` | arma inicial de cada classe, ataque, flecha/mana gasta, poses de todas as armas novas, save/load |
| `node test-progress.js 8765 [classes] [WxH]` | painéis de Habilidades e Talentos, pontos, ranks, talentos, save/load, escudo/adaga, auto, migração |
| `node test-extra.js 8765 [classes]` | flechas no chão, compra automática, volta ao arco, bônus de talentos, teclas em Ajustes, tabela TUNE |

`classes` = lista separada por vírgula entre `guerreiro,cacador,mago,ladino,none` (`none` = personagem sem classe, que deve ficar idêntico ao jogo base). Cada script imprime `errors: nenhum` quando não há erro de console.

Limites: o headless roda a poucos FPS (os scripts avançam as habilidades por quadros simulados), não mede desempenho de celular e não substitui o teste em aparelho real.
