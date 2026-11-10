// Suíte: Legendas ao Vivo e Bilinguismo (v1.4.0).
// Três camadas, no padrão da casa (css-filters/perfis/multimodal):
//   1. Lógica pura compartilhada (scripts/clarifica-puro.js, extração por
//      marcadores): planoDeJanelas, montadorVtt, seletorDeVideoAlvo,
//      auditoriaLegendas e reamostrarPara16k;
//   2. Paridade das cópias inline (popup.js e background.js) com a fonte
//      canônica — mesma disciplina da paridade i18n;
//   3. Protocolo de mensagens offscreen ⇄ service worker ⇄ página/popup
//      simulado em memória (sem Chrome): o offscreen.js REAL é avaliado em
//      Node com stubs de mídia/worker, exercitando captura → janelas →
//      Whisper (falso) → WebVTT → entrega e limpeza completa.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { readExt, ext, ROOT } = require('./helpers/env');

// ---- Extração da lógica pura canônica (scripts/clarifica-puro.js) ----
const MARCA_INICIO = '=== INÍCIO DA LÓGICA PURA DE LEGENDAS';
const MARCA_FIM = '=== FIM DA LÓGICA PURA DE LEGENDAS';

function trechoPuro() {
  const fonte = readExt('scripts', 'clarifica-puro.js');
  const marcaInicio = fonte.indexOf(MARCA_INICIO);
  const marcaFim = fonte.indexOf(MARCA_FIM);
  assert.ok(marcaInicio !== -1 && marcaFim !== -1 && marcaFim > marcaInicio,
    'bloco de lógica pura de legendas delimitado em scripts/clarifica-puro.js');
  const inicio = fonte.lastIndexOf('\n', marcaInicio) + 1;
  const fim = fonte.indexOf('\n', marcaFim) + 1;
  return fonte.slice(inicio, fim);
}

const puro = (() => {
  const fabrica = new Function(`${trechoPuro()}\nreturn { JANELA_PADRAO_SEGUNDOS, SOBREPOSICAO_PADRAO_SEGUNDOS, reamostrarPara16k, planoDeJanelas, montadorVtt, seletorDeVideoAlvo, auditoriaLegendas };`);
  return fabrica();
})();

const fonteFonte = (fn) => String(fn).replace(/\s+/g, '');

// ---- 1. planoDeJanelas ----

test('legendas: planoDeJanelas — duração dentro da janela produz uma única janela', () => {
  assert.deepEqual(puro.planoDeJanelas(7, {}), [{ inicio: 0, fim: 7 }], '7 s = janela padrão inteira');
  assert.deepEqual(puro.planoDeJanelas(6.9, {}), [{ inicio: 0, fim: 6.9 }], 'janela final curta sem recorte artificial');
  assert.deepEqual(puro.planoDeJanelas(0.5, {}), [{ inicio: 0, fim: 0.5 }], 'áudio curtíssimo ainda é uma janela');
});

test('legendas: planoDeJanelas — janelas contínuas com passo = janela − sobreposição', () => {
  const plano = puro.planoDeJanelas(20, {});
  assert.equal(plano.length, 4, '20 s com janela 7 e sobreposição 1 → 4 janelas (passo 6)');
  assert.deepEqual(plano[0], { inicio: 0, fim: 7 });
  assert.deepEqual(plano[1], { inicio: 6, fim: 13 });
  assert.deepEqual(plano[2], { inicio: 12, fim: 19 });
  for (let i = 1; i < plano.length; i++) {
    assert.equal(plano[i].inicio, plano[i - 1].fim - puro.SOBREPOSICAO_PADRAO_SEGUNDOS,
      `sobreposição contígua entre as janelas ${i - 1} e ${i}`);
  }
});

test('legendas: planoDeJanelas — a janela final nunca ultrapassa a duração', () => {
  const plano = puro.planoDeJanelas(20, {});
  const ultima = plano[plano.length - 1];
  assert.equal(ultima.fim, 20, 'final clampa na duração');
  assert.ok(ultima.fim - ultima.inicio < puro.JANELA_PADRAO_SEGUNDOS, 'janela final é curta (2 s)');
  for (const janela of plano) {
    assert.ok(janela.fim <= 20 && janela.inicio >= 0 && janela.fim > janela.inicio, 'janela dentro dos limites');
  }
});

test('legendas: planoDeJanelas — entradas inválidas produzem plano vazio (sem laço infinito)', () => {
  assert.deepEqual(puro.planoDeJanelas(0, {}), [], 'duração zero');
  assert.deepEqual(puro.planoDeJanelas(-3, {}), [], 'duração negativa');
  assert.deepEqual(puro.planoDeJanelas('sem-numero', {}), [], 'duração não numérica');
  assert.deepEqual(puro.planoDeJanelas(Infinity, {}), [], 'duração infinita NÃO pode travar o agendador');
  assert.deepEqual(puro.planoDeJanelas(NaN, {}), [], 'NaN');
});

test('legendas: planoDeJanelas — opções customizadas respeitadas e saneadas', () => {
  const plano = puro.planoDeJanelas(15, { janela: 5, sobreposicao: 2 });
  assert.deepEqual(plano[1], { inicio: 3, fim: 8 }, 'passo = 5 − 2 = 3 com opções próprias');
  // Saneamento: sobreposição ≥ janela não pode gerar passo ≤ 0 (laço infinito).
  const seguro = puro.planoDeJanelas(15, { janela: 5, sobreposicao: 50 });
  assert.ok(seguro.length > 0, 'plano sempre termina');
  for (const janela of seguro) assert.ok(janela.fim > janela.inicio, 'nenhuma janela degenerada');
});

// ---- 2. montadorVtt ----

test('legendas: montadorVtt — cabeçalho WEBVTT e carimbos HH:MM:SS.mmm', () => {
  const vtt = puro.montadorVtt([{ inicio: 0, fim: 2.5, texto: 'Olá mundo' }]);
  assert.match(vtt, /^WEBVTT\n\n/), 'começa com WEBVTT e linha em branco';
  assert.match(vtt, /00:00:00\.000 --> 00:00:02\.500\nOlá mundo/, 'carimbo e texto do bloco');
  assert.ok(vtt.endsWith('\n'), 'termina com quebra de linha');
});

test('legendas: montadorVtt — ordenação temporal independentemente da entrada', () => {
  const vtt = puro.montadorVtt([
    { inicio: 13, fim: 20, texto: 'terceira' },
    { inicio: 0, fim: 6, texto: 'primeira' },
    { inicio: 6, fim: 13, texto: 'segunda' }
  ]);
  const posicoes = ['primeira', 'segunda', 'terceira'].map((t) => vtt.indexOf(t));
  assert.ok(posicoes[0] < posicoes[1] && posicoes[1] < posicoes[2], 'blocos ordenados por inicio');
  assert.match(vtt, /00:00:13\.000 --> 00:00:20\.000/, 'carimbo de 13 s correto');
});

test('legendas: montadorVtt — duplicatas (mesmo inicio + texto) entram uma única vez', () => {
  const legenda = { inicio: 3, fim: 9, texto: 'fala repetida' };
  const vtt = puro.montadorVtt([legenda, { ...legenda }, { ...legenda, fim: 10 }]);
  const ocorrencias = vtt.split('fala repetida').length - 1;
  assert.equal(ocorrencias, 1, 'dedupe por (inicio, texto): redeliveries do worker não duplicam cue');
});

test('legendas: montadorVtt — entradas inválidas/vazias descartadas e fim < inicio clampa', () => {
  const vtt = puro.montadorVtt([
    null,
    { inicio: 1, fim: 2, texto: '   ' },
    { inicio: 2, texto: 'sem fim usa o proprio inicio' },
    { inicio: 5, fim: 4, texto: 'fim antes do inicio' },
    { inicio: 1, fim: 2, texto: 'válido' }
  ]);
  const blocos = (vtt.match(/ --> /g) || []).length;
  assert.equal(blocos, 3, 'apenas três cues válidos: nulo e texto só de espaços descartados');
  assert.match(vtt, /00:00:02\.000 --> 00:00:02\.000\nsem fim usa o proprio inicio/, 'sem fim → duração zero no mesmo instante');
  assert.match(vtt, /00:00:05\.000 --> 00:00:05\.000\nfim antes do inicio/, 'fim < inicio clampado ao inicio');
  assert.match(vtt, /00:00:01\.000 --> 00:00:02\.000\nválido/, 'entrada válida preservada');
  const vazio = puro.montadorVtt([]);
  assert.equal(vazio, 'WEBVTT\n\n', 'lista vazia → documento só com cabeçalho');
});

// ---- 3. seletorDeVideoAlvo ----

test('legendas: seletorDeVideoAlvo — o vídeo visível de maior área vence', () => {
  const indice = puro.seletorDeVideoAlvo([
    { visivel: true, area: 100 * 100 },
    { visivel: true, area: 640 * 360 },
    { visivel: true, area: 200 * 200 }
  ]);
  assert.equal(indice, 1, '640×360 é o maior vídeo renderizado');
});

test('legendas: seletorDeVideoAlvo — invisível/área zero descartados; empate vence o primeiro', () => {
  assert.equal(puro.seletorDeVideoAlvo([
    { visivel: false, area: 9999999 },
    { visivel: true, area: 0 },
    { visivel: true, area: 50 * 50 }
  ]), 2, 'vídeo invisível e vídeo com área zero são descartados');
  assert.equal(puro.seletorDeVideoAlvo([
    { visivel: true, area: 300 * 300 },
    { visivel: true, area: 300 * 300 }
  ]), 0, 'empate exato: primeiro na ordem do documento');
});

test('legendas: seletorDeVideoAlvo — ausência de vídeo (podcast) retorna null', () => {
  assert.equal(puro.seletorDeVideoAlvo([]), null, 'lista vazia');
  assert.equal(puro.seletorDeVideoAlvo([{ visivel: false, area: 100 }]), null, 'apenas invisíveis');
  assert.equal(puro.seletorDeVideoAlvo(null), null, 'entrada núla tratada como vazia');
});

// ---- 4. auditoriaLegendas ----

test('legendas: auditoriaLegendas — vídeos sem track são todos reportados', () => {
  const resultado = puro.auditoriaLegendas([
    { temCaptions: false, temSubtitles: false },
    { temCaptions: false, temSubtitles: false },
    { temCaptions: false, temSubtitles: false }
  ]);
  assert.equal(resultado.total, 3);
  assert.equal(resultado.comLegendas, 0);
  assert.equal(resultado.semLegenda, 3, '3 de 3 vídeos sem legendas (exemplo do plano)');
});

test('legendas: auditoriaLegendas — captions e subtitles contam; kind incorreto NÃO conta', () => {
  const comLegendas = puro.auditoriaLegendas([
    { temCaptions: true, temSubtitles: false },
    { temCaptions: false, temSubtitles: true }
  ]);
  assert.equal(comLegendas.semLegenda, 0, 'captions e subtitles atendem o critério 1.2.2');
  const kindErrado = puro.auditoriaLegendas([
    { temCaptions: false, temSubtitles: false, kind: 'chapters' },
    { temCaptions: false, temSubtitles: false, kind: 'metadata' }
  ]);
  assert.equal(kindErrado.semLegenda, 2, 'chapters/metadata não são legendas');
});

test('legendas: auditoriaLegendas — mistura de vídeos e página sem vídeo', () => {
  const mista = puro.auditoriaLegendas([
    { temCaptions: true, temSubtitles: false },
    { temCaptions: false, temSubtitles: false },
    { temCaptions: false, temSubtitles: true },
    { temCaptions: false, temSubtitles: false }
  ]);
  assert.equal(mista.total, 4);
  assert.equal(mista.comLegendas, 2);
  assert.equal(mista.semLegenda, 2);
  assert.equal(mista.detalhes[1].comLegendas, false, 'detalhes por vídeo mantêm o descritor');
  const vazia = puro.auditoriaLegendas([]);
  assert.deepEqual({ total: vazia.total, semLegenda: vazia.semLegenda }, { total: 0, semLegenda: 0 });
});

// ---- 5. Paridade das cópias inline com a fonte canônica ----

test('legendas: paridade — reamostrarPara16k inline do popup.js é idêntica à fonte canônica', () => {
  const popupJs = readExt('popup', 'popup.js');
  const inicio = popupJs.indexOf('=== INÍCIO DA LÓGICA PURA DE ÁUDIO');
  const fim = popupJs.indexOf('=== FIM DA LÓGICA PURA DE ÁUDIO');
  assert.ok(inicio !== -1 && fim !== -1, 'bloco de áudio do popup.js presente (fluxo da v1.3.0 intocado)');
  const trecho = popupJs.slice(popupJs.lastIndexOf('\n', inicio) + 1, popupJs.indexOf('\n', fim) + 1);
  const { reamostrarPara16k: inlinePopup } = new Function(`${trecho}\nreturn { reamostrarPara16k };`)();
  assert.equal(fonteFonte(inlinePopup), fonteFonte(puro.reamostrarPara16k),
    'cópia inline (fluxo injetado) e módulo compartilhado são a MESMA função');
});

test('legendas: paridade — auditoriaLegendas inline do popup.js é idêntica à fonte canônica', () => {
  const popupJs = readExt('popup', 'popup.js');
  const inicio = popupJs.indexOf('=== INÍCIO DA LÓGICA PURA DE AUDITORIA DE LEGENDAS');
  const fim = popupJs.indexOf('=== FIM DA LÓGICA PURA DE AUDITORIA DE LEGENDAS');
  assert.ok(inicio !== -1 && fim !== -1 && fim > inicio, 'bloco de auditoria delimitado em popup.js');
  const trecho = popupJs.slice(popupJs.lastIndexOf('\n', inicio) + 1, popupJs.indexOf('\n', fim) + 1);
  const { auditoriaLegendas: inlinePopup } = new Function(`${trecho}\nreturn { auditoriaLegendas };`)();
  assert.equal(fonteFonte(inlinePopup), fonteFonte(puro.auditoriaLegendas), 'mesma função em popup e módulo');
});

test('legendas: paridade — seletorDeVideoAlvo inline do background.js é idêntico à fonte canônica', () => {
  const backgroundJs = readExt('background.js');
  const inicio = backgroundJs.indexOf('=== INÍCIO DA LÓGICA PURA DE SELEÇÃO DE VÍDEO');
  const fim = backgroundJs.indexOf('=== FIM DA LÓGICA PURA DE SELEÇÃO DE VÍDEO');
  assert.ok(inicio !== -1 && fim !== -1 && fim > inicio, 'bloco de seleção delimitado em background.js');
  const trecho = backgroundJs.slice(backgroundJs.lastIndexOf('\n', inicio) + 1, backgroundJs.indexOf('\n', fim) + 1);
  const { seletorDeVideoAlvo: inlineBackground } = new Function(`${trecho}\nreturn { seletorDeVideoAlvo };`)();
  assert.equal(fonteFonte(inlineBackground), fonteFonte(puro.seletorDeVideoAlvo), 'mesma função em background e módulo');
});

// ---- 6. Protocolo de mensagens (offscreen ⇄ service worker ⇄ página/popup) ----

test('legendas: protocolo — os tipos de mensagem são coerentes nos três contextos', () => {
  const backgroundJs = readExt('background.js');
  const offscreenJs = readExt('offscreen', 'offscreen.js');
  const popupJs = readExt('popup', 'popup.js');

  // Vocabulário acordado da fronteira (mesmos literais nos dois lados):
  // offscreen ⇄ service worker (a 'clarifica-legendas' é só popup→SW).
  for (const tipo of ['legendas-iniciar-captura', 'legendas-parar', 'legenda-pronta', 'legendas-encerradas']) {
    assert.ok(backgroundJs.includes(`'${tipo}'`), `background.js usa '${tipo}'`);
    assert.ok(offscreenJs.includes(`'${tipo}'`), `offscreen.js usa '${tipo}'`);
  }
  assert.ok(backgroundJs.includes(`'clarifica-legendas'`), 'background.js atende o pedido do popup');
  // Broadcasts que o popup consome (o 'legenda-pronta' tem DOIS
  // consumidores: o SW entrega na página; o popup alimenta o transcript).
  for (const tipo of ['clarifica-legendas', 'legenda-pronta', 'clarifica-legendas-estado']) {
    assert.ok(popupJs.includes(`'${tipo}'`), `popup.js usa '${tipo}'`);
  }
  assert.ok(backgroundJs.includes(`'clarifica-legendas-estado'`), 'background.js publica estado ao popup');
  // O destino dos mensajes sempre declarado ('target').
  assert.match(offscreenJs, /target: 'background'/, 'offscreen endereça o service worker');
  assert.match(backgroundJs, /target: 'offscreen'/, 'service worker endereça o offscreen');
  assert.match(popupJs, /target: 'background'/, 'popup endereça o service worker');
});

test('legendas: protocolo — offscreen.js REAL simulado em memória: captura → janelas → Whisper → WebVTT → entrega → limpeza', async () => {
  // O offscreen.js real é avaliado em Node: o import do módulo puro é
  // substituído pelo PRÓPRIO bloco extraído de clarifica-puro.js (mesmas
  // linhas que o navegador roda) e as APIs de mídia/worker/runtime são
  // simuladas — a lógica, o agendador e o protocolo são 100% do produto.
  const offscreenJs = readExt('offscreen', 'offscreen.js');
  const semImport = offscreenJs.replace(/import\s*\{[\s\S]*?\}\s*from\s*'\.\.\/scripts\/clarifica-puro\.js';/, '');
  assert.notEqual(semImport, offscreenJs, 'import do módulo puro localizado no offscreen.js');

  const mensagensParaBackground = [];
  let ouvinteOffscreen = null;
  const chromeSim = {
    runtime: {
      onMessage: { addListener: (cb) => { ouvinteOffscreen = cb; } },
      sendMessage: async (m) => { mensagensParaBackground.push(m); return { ok: true }; },
      getURL: (p) => `chrome-extension://clarifica-ai/${p}`
    }
  };

  // Mídia simulada: fluxo com faixa auditável e AudioContext 16 kHz.
  const faixasParadas = [];
  const fluxoSim = {
    getAudioTracks: () => [{
      addEventListener: (evento, cb) => { if (evento === 'ended') fluxoSim._aoTerminar = cb; }
    }],
    getTracks: () => [{ stop: () => faixasParadas.push('faixa') }]
  };
  class ContextoAudioSim {
    constructor() {
      this.sampleRate = 16000;
      this.destination = { connect: () => {} };
    }
    createMediaStreamSource() { return { connect: () => {}, disconnect: () => {} }; }
    createGain() { return { gain: { value: 0 }, connect: () => {}, disconnect: () => {} }; }
    createScriptProcessor() {
      const no = { connect: () => {}, disconnect: () => {}, onaudioprocess: null };
      ContextoAudioSim._ultimoNo = no;
      return no;
    }
    close() { ContextoAudioSim._fechados.push('contexto'); }
  }
  ContextoAudioSim._fechados = [];
  ContextoAudioSim._ultimoNo = null;

  let workers = [];
  let janelasRecebidas = 0;
  class WorkerSim {
    constructor() {
      this.terminated = false;
      this.recebidas = [];
      workers.push(this);
    }
    postMessage(msg) {
      this.recebidas.push(msg);
      if (msg.type === 'transcribe-audio') {
        janelasRecebidas++;
        const texto = `FALA-TESTE-${janelasRecebidas}`;
        setTimeout(() => this.onmessage && this.onmessage({ data: { type: 'transcription', transcript: texto } }), 5);
      }
    }
    terminate() { this.terminated = true; }
  }

  const URLSim = { createObjectURL: () => 'blob:simulado', revokeObjectURL: () => {} };

  const fabrica = new Function(
    'chrome', 'navigator', 'window', 'AudioContext', 'Worker', 'fetch', 'URL',
    `${trechoPuro()}\n${semImport}`
  );
  fabrica(
    chromeSim,
    { mediaDevices: { getUserMedia: async () => fluxoSim } },
    { AudioContext: ContextoAudioSim },
    ContextoAudioSim,
    WorkerSim,
    async () => ({ ok: true, text: async () => '// código do worker (simulado)' }),
    URLSim
  );

  assert.equal(typeof ouvinteOffscreen, 'function', 'offscreen registrou o listener de mensagens');

  // 1. Início da captura (identificador de uso único → fluxo → worker).
  await new Promise((resolver) => {
    ouvinteOffscreen(
      { target: 'offscreen', type: 'legendas-iniciar-captura', data: { streamId: 'id-unico-teste', tarefa: 'transcrever' } },
      {},
      resolver
    );
  });
  await new Promise((r) => setTimeout(r, 20)); // getUserMedia + fetch + Worker (simulados, imediatos)

  assert.equal(faixasParadas.length, 0, 'captura em andamento: nenhuma faixa parada');
  assert.equal(workers.length, 1, 'um único worker Whisper criado');

  // 2. Áudio fluindo: 10 blocos de 1 s a 16 kHz — o plano (7 s, sobreposição
  //    1 s) emite a janela [0,7] e a janela final curta [6,10].
  const bloco = () => new Float32Array(16000).map((_, i) => Math.sin(i / 40));
  const noColetor = ContextoAudioSim._ultimoNo;
  assert.ok(noColetor, 'nó coletor criado no AudioContext');
  for (let s = 0; s < 10; s++) {
    noColetor.onaudioprocess({ inputBuffer: { getChannelData: () => bloco() } });
  }

  // 3. Transcrições parciais chegam e viram 'legenda-pronta' com WebVTT.
  let prontas = [];
  const inicioEspera = Date.now();
  while ((prontas = mensagensParaBackground.filter((m) => m.type === 'legenda-pronta')).length < 2
    && Date.now() - inicioEspera < 3000) {
    await new Promise((r) => setTimeout(r, 5));
  }
  assert.equal(prontas.length, 2, 'duas janelas transcritas (7 s + final curta de 3 s)');
  assert.ok(prontas[0].vtt.startsWith('WEBVTT'), 'entrega carrega documento WebVTT');
  assert.match(prontas[0].vtt, /FALA-TESTE-1/, 'primeira legenda no VTT');
  assert.match(prontas[1].vtt, /FALA-TESTE-2/, 'segunda legenda acumulada no MESMO VTT');
  const mensagemWorker = workers[0].recebidas[0];
  assert.equal(mensagemWorker.type, 'transcribe-audio');
  assert.equal(mensagemWorker.data.constructor.name, 'Float32Array', 'PCM cruza como Float32Array');
  assert.ok(mensagemWorker.data.length >= 16000, 'janela em 16 kHz com pelo menos 1 s de áudio');
  assert.deepEqual(mensagemWorker.opcoes, { tarefa: 'transcrever' }, 'tarefa repassada ao worker (bilinguismo v1.4.0)');

  // 4. Parada pedida: limpeza total + notificação do service worker.
  await new Promise((resolver) => {
    ouvinteOffscreen({ target: 'offscreen', type: 'legendas-parar', data: { motivo: 'parada-pedida' } }, {}, resolver);
  });
  assert.equal(workers[0].terminated, true, 'worker Whisper encerrado');
  assert.deepEqual(faixasParadas, ['faixa'], 'faixa de mídia parada');
  assert.ok(ContextoAudioSim._fechados.length >= 1, 'AudioContext fechado');
  await new Promise((r) => setTimeout(r, 10));
  assert.ok(mensagensParaBackground.some((m) => m.type === 'legendas-encerradas' && m.motivo === 'parada-pedida'),
    'service worker notificado do encerramento');

  // 5. Parada repetida é inofensiva (idempotência do ciclo de vida).
  await new Promise((resolver) => {
    ouvinteOffscreen({ target: 'offscreen', type: 'legendas-parar', data: { motivo: 'parada-pedida' } }, {}, resolver);
  });
  assert.equal(faixasParadas.length, 1, 'nenhuma segunda limpeza (estado já nulo)');
});

// ---- 7. Fluxos completos no popup (mesmo ambiente das suítes jsdom) ----

const { makeDom, makeChromeStub, sleep, substituirI18n, MENSAGENS_PT } = require('./helpers/env');

async function setup(opts = {}) {
  const html = substituirI18n(readExt('popup/popup.html')).replace('<script type="module" src="popup.js"></script>', '');
  const dom = makeDom(html, 'chrome-extension://clarifica-ai/popup/popup.html');
  const stub = makeChromeStub(dom.window, opts);
  await sleep(10);
  dom.window.fetch = async (url) => {
    if (String(url).includes('_locales/')) {
      return { ok: true, status: 200, json: async () => MENSAGENS_PT, text: async () => JSON.stringify(MENSAGENS_PT) };
    }
    return { ok: true, status: 200, text: async () => '// código do worker (ambiente de teste)' };
  };
  dom.window.URL.createObjectURL = () => 'blob:simulado';
  dom.window.URL.revokeObjectURL = () => {};
  dom.window.eval(readExt('popup', 'popup.js'));
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded', { bubbles: true }));
  const document = dom.window.document;
  await sleep(20);
  return { dom, stub, window: dom.window, document, storageStore: stub.storageStore };
}

const botaoDe = (document, mode) => document.querySelector(`.mode-btn[data-mode="${mode}"]`);
const statusDe = (document) => document.getElementById('status');

async function aguardar(condicao, maxMs = 500, passo = 5) {
  const inicio = Date.now();
  while (!(await condicao()) && Date.now() - inicio < maxMs) await sleep(passo);
}

test('legendas: popup toggle LIGA via service worker, marca aria-pressed e persiste', async () => {
  const { stub, document, storageStore } = await setup();
  botaoDe(document, 'legendas').click();
  await aguardar(() => Promise.resolve(botaoDe(document, 'legendas').getAttribute('aria-pressed') === 'true'), 3000);
  const pedido = stub.calls.sendMessage.find((m) => m.type === 'clarifica-legendas');
  assert.ok(pedido, 'mensagem de runtime enviada ao service worker');
  assert.equal(pedido.target, 'background');
  assert.equal(pedido.action, 'iniciar');
  assert.equal(pedido.idioma, 'original', 'tarefa inicial segue o seletor (original)');
  assert.equal(botaoDe(document, 'legendas').classList.contains('ativo'), true, 'estado visual ativo');
  assert.equal(storageStore.legendasAtivas, true, 'estado persistido para reabertura do popup');
  assert.match(statusDe(document).textContent, /Legendas ativas/);
});

test('legendas: popup toggle DESLIGA (segundo clique) com parada limpa', async () => {
  const { stub, document, storageStore } = await setup();
  botaoDe(document, 'legendas').click();
  await aguardar(() => Promise.resolve(botaoDe(document, 'legendas').getAttribute('aria-pressed') === 'true'), 3000);
  botaoDe(document, 'legendas').click();
  await aguardar(() => Promise.resolve(statusDe(document).textContent === 'Legendas ao vivo paradas.'), 3000);
  const parada = stub.calls.sendMessage.find((m) => m.type === 'clarifica-legendas' && m.action === 'parar');
  assert.ok(parada, 'mensagem de parada enviada ao service worker');
  assert.equal(botaoDe(document, 'legendas').getAttribute('aria-pressed'), 'false', 'toggle desmarcado');
  assert.equal(storageStore.legendasAtivas, false, 'estado persistido');
  assert.match(statusDe(document).textContent, /Legendas ao vivo paradas/);
});

test('legendas: popup recusa de captura (código captura-negada) é traduzido e o toggle permanece desligado', async () => {
  const { document } = await setup({
    respostaLegendasIniciar: { error: 'captura-negada' }
  });
  botaoDe(document, 'legendas').click();
  await aguardar(() => Promise.resolve(statusDe(document).textContent === 'Não foi possível capturar o áudio da aba (permissão negada).'), 3000);
  assert.equal(botaoDe(document, 'legendas').getAttribute('aria-pressed'), 'false', 'estado NÃO afirma ativo');
  assert.equal(statusDe(document).textContent, 'Não foi possível capturar o áudio da aba (permissão negada).');
});

test('legendas: popup troca do seletor para inglês com legendas ativas reinicia a captura com nova tarefa', async () => {
  const { stub, document, window, storageStore } = await setup();
  botaoDe(document, 'legendas').click();
  await aguardar(() => Promise.resolve(botaoDe(document, 'legendas').getAttribute('aria-pressed') === 'true'), 3000);
  const seletor = document.getElementById('idioma-legendas');
  seletor.value = 'ingles';
  seletor.dispatchEvent(new window.Event('change'));
  await aguardar(() => Promise.resolve(stub.calls.sendMessage.filter((m) => m.type === 'clarifica-legendas').length >= 3), 3000);
  const pedidos = stub.calls.sendMessage.filter((m) => m.type === 'clarifica-legendas');
  assert.deepEqual(pedidos.map((m) => m.action), ['iniciar', 'parar', 'iniciar'], 'parada + reinício na troca de idioma');
  assert.equal(pedidos[2].idioma, 'ingles', 'tarefa de tradução pedida ao service worker');
  assert.equal(storageStore.legendasIdioma, 'ingles', 'escolha persistida');
});

test('legendas: popup reaberto restaura o toggle ativo e o idioma persistido', async () => {
  const { document } = await setup({
    storageInicial: { legendasAtivas: true, legendasIdioma: 'ingles' }
  });
  assert.equal(botaoDe(document, 'legendas').getAttribute('aria-pressed'), 'true', 'captura continua no offscreen: popup reflete');
  assert.ok(botaoDe(document, 'legendas').classList.contains('ativo'), 'estado visual restaurado');
  assert.equal(document.getElementById('idioma-legendas').value, 'ingles', 'idioma restaurado');
});

test('legendas: popup verificador WCAG 1.2.2 — página sem vídeos informa e com contagens usa placeholders', async () => {
  // Página sem vídeos: o jsdom do popup não tem <video> → contagens zero.
  const { stub, document } = await setup();
  botaoDe(document, 'verificar-legendas').click();
  await aguardar(() => Promise.resolve(statusDe(document).textContent.length > 0 && statusDe(document).textContent !== 'Processando...'), 3000);
  assert.equal(statusDe(document).textContent, 'Nenhum vídeo na página para auditar.', 'auditoria pura roda DENTRO da página simulada');
  assert.ok(stub.calls.executeScript.some((c) => c.args[0] === 'auditar-legendas'), 'função injetada de leitura');
  assert.equal(document.getElementById('result-area').classList.contains('hidden'), true, 'sem IA: nada na região de resultado');
});

test('legendas: popup verificador WCAG 1.2.2 — contagens da função pura traduzidas com placeholders', async () => {
  const { document } = await setup({
    // Resposta simulada da injeção (2 de 3 vídeos sem legenda — exemplo do plano)
    overrideAuditoria: { descritores: [{}, {}, {}], auditoria: { total: 3, comLegendas: 1, semLegenda: 2, detalhes: [] } }
  });
  botaoDe(document, 'verificar-legendas').click();
  await aguardar(() => Promise.resolve(/Auditoria WCAG 1.2.2/.test(statusDe(document).textContent)), 3000);
  assert.match(statusDe(document).textContent, /2 de 3 vídeos sem legendas/, 'mensagem com $sem$ e $total$ substituídos');
  assert.match(statusDe(document).textContent, /Legendas ao Vivo para gerá-las/, 'ação direta sugerida (ciclo auditar e agir)');
});

test('legendas: popup transcript ao vivo — broadcasts legenda-pronta alimentam o resultado', async () => {
  const { stub, document } = await setup();
  const listener = stub.calls.onMessage[stub.calls.onMessage.length - 1];
  assert.equal(typeof listener, 'function', 'popup registra listener de broadcasts');
  listener({ type: 'legenda-pronta', texto: 'Primeira fala capturada.' });
  listener({ type: 'legenda-pronta', texto: 'Segunda fala capturada.' });
  assert.equal(document.getElementById('ai-output').textContent,
    'Primeira fala capturada. Segunda fala capturada.', 'transcript acumulado ao vivo');
  assert.ok(!document.getElementById('result-area').classList.contains('hidden'), 'resultado visível durante a transmissão');
  assert.match(statusDe(document).textContent, /Legendas ativas/);
  // Mensagens de outros recursos não vazam no transcript.
  listener({ type: 'TRIGGER_ACTION', action: 'summarize' });
  listener({ type: 'legenda-pronta', texto: '   ' });
  assert.equal(document.getElementById('ai-output').textContent,
    'Primeira fala capturada. Segunda fala capturada.', 'broadcasts estranhos e textos vazios ignorados');
});

test('legendas: popup captura encerrada externamente desliga o toggle com mensagem clara', async () => {
  const { stub, document, storageStore } = await setup();
  botaoDe(document, 'legendas').click();
  await aguardar(() => Promise.resolve(botaoDe(document, 'legendas').getAttribute('aria-pressed') === 'true'), 3000);
  const listener = stub.calls.onMessage[stub.calls.onMessage.length - 1];
  listener({ type: 'clarifica-legendas-estado', ativo: false, motivo: 'captura-encerrada' });
  await aguardar(() => Promise.resolve(botaoDe(document, 'legendas').getAttribute('aria-pressed') === 'false'), 3000);
  assert.match(statusDe(document).textContent, /Captura encerrada/, 'navegação/fim do áudio explicados');
});

test('legendas: popup auditoria injetada em página REAL de teste (jsdom) conta videos com e sem track', async () => {
  const { stub, document } = await setup();
  // Vídeos na página alvo: um sem track, um com captions, um com kind errado.
  const pagina = document; // executeScript roda a função injetada de verdade neste DOM
  const video1 = pagina.createElement('video');
  const video2 = pagina.createElement('video');
  const trackCaptions = pagina.createElement('track');
  trackCaptions.setAttribute('kind', 'captions');
  video2.appendChild(trackCaptions);
  const video3 = pagina.createElement('video');
  const trackChapters = pagina.createElement('track');
  trackChapters.setAttribute('kind', 'chapters');
  video3.appendChild(trackChapters);
  pagina.querySelector('main').append(video1, video2, video3);

  botaoDe(document, 'verificar-legendas').click();
  await aguardar(() => Promise.resolve(/Auditoria WCAG 1.2.2/.test(statusDe(document).textContent)), 3000);
  assert.match(statusDe(document).textContent, /2 de 3 vídeos sem legendas/,
    'captions conta como legenda; chapters NÃO conta (função pura real rodando no DOM)');
});

test('legendas: integração — manifest declara tabCapture/offscreen, Chrome 116 e os arquivos offscreen existem', () => {
  const manifest = JSON.parse(readExt('manifest.json'));
  assert.equal(manifest.version, '1.4.0', 'versão da release corrente');
  for (const permissao of ['tabCapture', 'offscreen']) {
    assert.ok(manifest.permissions.includes(permissao), `permissão ${permissao} declarada`);
  }
  assert.equal(parseInt(manifest.minimum_chrome_version, 10), 116,
    'getMediaStreamId no service worker exige Chrome 116+');
  assert.ok(fs.existsSync(ext('offscreen', 'offscreen.html')), 'documento offscreen presente no pacote');
  assert.ok(fs.existsSync(ext('offscreen', 'offscreen.js')), 'lógica do offscreen presente no pacote');
  const html = readExt('offscreen', 'offscreen.html');
  assert.match(html, /<script type="module" src="offscreen.js"><\/script>/, 'offscreen carrega a lógica como módulo');
  // O offscreen importa o módulo puro (nada duplicado em runtime).
  assert.match(readExt('offscreen', 'offscreen.js'), /from\s+'\.\.\/scripts\/clarifica-puro\.js'/,
    'offscreen.js importa a lógica pura compartilhada');
});
