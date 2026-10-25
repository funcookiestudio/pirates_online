/* Gera preview/preview.html: o jogo inteiro (CSS + JS empacotado) em um único arquivo para a prévia online. */
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const css = ['base', 'hud', 'hotbar', 'panels'].map(n => readFileSync(`css/${n}.css`, 'utf8')).join('\n');
const html = readFileSync('index.html', 'utf8');
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('<!-- Three.js'));
const three = html.match(/<script src="(https:\/\/cdnjs[^"]+three[^"]+)">/)[1];

const out = await build({ entryPoints: ['js/boot.js'], bundle: true, format: 'iife', minify: false, write: false });
const js = out.outputFiles[0].text.replaceAll('</script', '<\\/script');

mkdirSync('preview', { recursive: true });
writeFileSync('preview/preview.html',
`<title>Pirata ARPG</title>
<style>
${css}
</style>
${body}
<script src="${three}"></script>
<script>
${js}
</script>
`);
console.log('preview/preview.html', Math.round((css.length + body.length + js.length) / 1024) + ' KB');

// version.json (lido pelo jogo para saber se há atualização): mesma versão de js/core/version.js
const ver = readFileSync('js/core/version.js', 'utf8').match(/VERSION = '([^']+)'/)[1];
writeFileSync('version.json', JSON.stringify({ v: ver }) + '\n');
