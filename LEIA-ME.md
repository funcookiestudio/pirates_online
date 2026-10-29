# Chicken Fight TV — jogo + servidor da TV no Cloudflare

## Publicar (uma vez)
```
npm install -g wrangler        # se ainda não tiver (precisa do Node 18+)
wrangler login
cd chicken-fight
wrangler deploy
```
O wrangler mostra o endereço, tipo `https://chicken-fight-live.SEU-USUARIO.workers.dev`.
Abra esse endereço no celular: o jogo e a TV já funcionam, sem editar mais nada.

## Atualizar depois
Mexeu em algo? `wrangler deploy` de novo. Se mudar o `public/index.html`, aumente `VER` em `public/sw.js` (v8, v9...).

## Testar a lógica sem Cloudflare
`node teste.mjs`

## Ver se o servidor está no ar
Abra `https://SEU-ENDERECO.workers.dev/api/tv` — deve aparecer um JSON com a grade de lutas.
Logs ao vivo: `wrangler tail`

## Se hospedar o jogo em outro lugar (GitHub Pages etc.)
Em `public/index.html`, preencha `LIVE_URL` com o endereço do Worker e, em `wrangler.toml`, ative `ORIGINS` com o endereço do seu site.

## Tela inicial da TV
Cada luta da grade aparece como uma prévia (galos, temporizador "EM BREVE 12:34", odds). Faltando 2 min vira "COMEÇA EM ...";
quando a luta está rolando vira "AO VIVO". Tocar na prévia abre a aposta daquela luta, e dá para apostar em várias ao mesmo tempo.
Para mostrar mais (ou menos) prévias, mude `AHEAD` no topo do `worker.mjs` (hoje 6 lutas = 1h30 de antecedência).
