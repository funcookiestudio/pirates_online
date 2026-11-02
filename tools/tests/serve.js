/* Uso: node tools/tests/serve.js [porta]  (serve a pasta do jogo; Ctrl+C para parar) */
const path = require('path');
const port = +process.argv[2] || 8765;
require('./lib').serve(path.join(__dirname, '..', '..'), port);
console.log('servindo em http://localhost:' + port);
