// Suíte: Service Worker (background.js) — comandos, anúncios ARIA
// (mensagens resolvidas via chrome.i18n ANTES da injeção), Modo Leitura
// Essencial, reset-all e mensagens internas.
const test = require('node:test');
const assert = require('node:assert/strict');
const { makeDom, makeChromeStub, sleep, readExt, mensagemPT } = require('./helpers/env');

const HTML_BASE =
  '<!DOCTYPE html><html lang="pt-BR"><body>' +
  '<nav>menu</nav><header>topo</header>' +
  '<main><h1>Título</h1><p>Conteúdo principal da página de teste.</p></main>' +
  '<aside>barrinha</aside><footer>rodapé</footer>' +
  '<div class="ads">propaganda</div><div class="sidebar">lateral</div>' +
  '</body></html>';

async function setup() {
  const dom = makeDom(HTML_BASE);
  const stub = makeChromeStub(dom.window);
  dom.window.eval(readExt('background.js'));
  await sleep(15); // motor de mensagens pré-carrega os JSON de _locales no boot
  return { dom, stub, window: dom.window, document: dom.window.document };
}

test('background: registra exatamente um listener para chrome.commands', async () => {
  const { stub } = await setup();
  assert.equal(stub.calls.commands.length, 1);
  assert.equal(typeof stub.calls.commands[0], 'function');
});

test('background: cada um dos 4 comandos dispara anúncio i18n + ação (2 injeções)', async () => {
  const { stub, window } = await setup();
  const listener = stub.calls.commands[0];
  const sequencia = ['toggle-resumo', 'toggle-leitura', 'toggle-imagens', 'toggle-reset'];
  for (const cmd of sequencia) {
    await listener(cmd);
    await sleep(10);
  }
  assert.equal(stub.calls.executeScript.length, 8, '2 execuções por comando');
  const acoes = stub.calls.executeScript.map((c) => c.args[0]);
  assert.deepEqual(acoes, [
    'summarize', 'summarize',
    'apply-leitura-essencial', 'apply-leitura-essencial',
    'describe-images', 'describe-images',
    'reset-all', 'reset-all'
  ]);
  // Anúncios: mensagem resolvida no service worker (dicionário de _locales)
  // e injetada como argumento — funções na página não têm chrome.*.
  const mensagens = [0, 2, 4, 6].map((i) => stub.calls.executeScript[i].args[1]);
  const esperadas = ['anuncioResumo', 'anuncioLeitura', 'anuncioImagens', 'anuncioReset']
    .map((chave) => mensagemPT(chave));
  assert.deepEqual(mensagens, esperadas);
  for (const m of mensagens) assert.match(m, /^Clarifica\.ai:/);
});

test('background: comando desconhecido é ignorado sem lançar erro', async () => {
  const { stub } = await setup();
  const listener = stub.calls.commands[0];
  await assert.doesNotReject(() => listener('comando-inexistente'));
  await sleep(10);
  assert.equal(stub.calls.executeScript.length, 0);
});

test('background: mensagemParaLeitor cai no anúncio genérico para ação desconhecida', async () => {
  const { window } = await setup();
  assert.equal(window.mensagemParaLeitor('acao-inexistente'), 'Clarifica.ai ativado.');
});

test('background: anúncio usa role=status + aria-live=assertive (WCAG 4.1.3)', async () => {
  const { window, document } = await setup();
  const texto = mensagemPT('anuncioResumo');
  window.anunciarAcao('summarize', texto);
  const el = document.getElementById('clarifica-anuncio');
  assert.ok(el, 'elemento de anúncio criado');
  assert.equal(el.getAttribute('role'), 'status');
  assert.equal(el.getAttribute('aria-live'), 'assertive');
  assert.equal(el.getAttribute('aria-atomic'), 'true');
  assert.match(el.style.cssText, /position:\s*fixed/, 'visualmente oculto, mas legível por leitores de tela');
  assert.equal(el.textContent, texto);
  assert.match(el.textContent, /Resumindo página com inteligência artificial/);
});

test('background: anúncio substitui o anterior e se auto-remove (5s)', async () => {
  const { window, document } = await setup();
  window.anunciarAcao('summarize', mensagemPT('anuncioResumo'));
  window.anunciarAcao('reset-all', mensagemPT('anuncioReset'));
  const todos = document.querySelectorAll('#clarifica-anuncio');
  assert.equal(todos.length, 1, 'sem acúmulo de anúncios');
  assert.match(todos[0].textContent, /Página restaurada ao original/);
  await sleep(60); // temporizadores acelerados no ambiente de teste
  assert.equal(document.getElementById('clarifica-anuncio'), null, 'removido após o tempo');
});

test('background: cada ação tem mensagem específica para o leitor de tela', async () => {
  const { window, document } = await setup();
  const codigos = ['summarize', 'apply-leitura-essencial', 'describe-images', 'reset-all'];
  for (const acao of codigos) {
    const mensagem = window.mensagemParaLeitor(acao);
    window.anunciarAcao(acao, mensagem);
    const el = document.getElementById('clarifica-anuncio');
    assert.ok(el.textContent.startsWith('Clarifica.ai:'), `mensagem de ${acao} começa com o nome da extensão`);
    window.document.getElementById('clarifica-anuncio').remove();
  }
});

test('background: Modo Leitura Essencial silencia ruído e foca o conteúdo', async () => {
  const { window, document } = await setup();
  document.documentElement.style.filter = 'blur(1px)'; // filtro pré-existente
  window.executarAcao('apply-leitura-essencial');
  for (const sel of ['nav', 'footer', 'aside', '.ads', '.sidebar', 'header']) {
    const el = document.querySelector(sel);
    assert.equal(el.getAttribute('aria-hidden'), 'true', `${sel} com aria-hidden`);
    assert.ok(el.hasAttribute('inert'), `${sel} com inert`);
  }
  const main = document.querySelector('main');
  assert.equal(main.getAttribute('role'), 'main');
  assert.equal(document.activeElement, main, 'foco movido para o conteúdo principal');
  assert.equal(document.documentElement.style.filter, '', 'filtro de cor limpo');
});

test('background: reset-all restaura aria-hidden/inert, filtro e caixa de resumo', async () => {
  const { window, document } = await setup();
  window.executarAcao('apply-leitura-essencial');
  const caixa = document.createElement('div');
  caixa.id = 'clarifica-resumo';
  document.body.appendChild(caixa);
  document.documentElement.style.filter = 'grayscale(1)';

  window.executarAcao('reset-all');

  for (const sel of ['nav', 'footer', 'aside', '.ads', '.sidebar', 'header']) {
    const el = document.querySelector(sel);
    assert.equal(el.hasAttribute('aria-hidden'), false, `${sel} sem aria-hidden após reset`);
    assert.equal(el.hasAttribute('inert'), false, `${sel} sem inert após reset`);
  }
  assert.equal(document.getElementById('clarifica-resumo'), null, 'caixa de resumo removida');
  assert.equal(document.documentElement.style.filter, '', 'filtro removido');
});

test('background: reset-all também desmonta os Perfis Neurodivergentes (v1.2.0)', async () => {
  const { window, document } = await setup();

  // Estado sujo dos três perfis, como o popup.js os deixaria na página:
  // estilos, holofote, régua, bloco destacado, GIF convertido em canvas e
  // listeners registrados para limpeza.
  for (const [id, texto] of [
    ['clarifica-perfil-tea', '* { animation-play-state: paused !important; }'],
    ['clarifica-perfil-tdah', '#clarifica-spotlight { position: fixed; }'],
    ['clarifica-perfil-dislexia', 'p { letter-spacing: 0.05em !important; }']
  ]) {
    const estilo = document.createElement('style');
    estilo.id = id;
    estilo.textContent = texto;
    document.documentElement.appendChild(estilo);
  }
  const spot = document.createElement('div');
  spot.id = 'clarifica-spotlight';
  document.body.appendChild(spot);
  const regua = document.createElement('div');
  regua.id = 'clarifica-regua';
  document.body.appendChild(regua);
  const paragrafo = document.querySelector('main p');
  paragrafo.classList.add('clarifica-destaque-leitura');

  const gifOriginal = document.createElement('img');
  gifOriginal.setAttribute('src', 'https://exemplo.teste/animacao.gif');
  const canvasSubstituto = document.createElement('canvas');
  canvasSubstituto.width = 300;
  canvasSubstituto.height = 300;
  document.body.appendChild(canvasSubstituto);
  canvasSubstituto.replaceWith(gifOriginal); // simula restauração: agora gifOriginal está no DOM
  // Estado como o perfil TEA deixa: canvas no DOM, img guardada em memória.
  document.body.appendChild(canvasSubstituto);
  window.__clarificaGifsPerfilTea = [{ canvas: canvasSubstituto, original: gifOriginal }];

  let limpezaChamada = false;
  window.__clarificaLimpezaPerfis = () => { limpezaChamada = true; };
  window.__clarificaIndiceBloco = 3;

  window.executarAcao('reset-all');

  assert.equal(document.getElementById('clarifica-perfil-tea'), null, 'estilo do TEA removido');
  assert.equal(document.getElementById('clarifica-perfil-tdah'), null, 'estilo do TDAH removido');
  assert.equal(document.getElementById('clarifica-perfil-dislexia'), null, 'estilo da dislexia removido');
  assert.equal(document.getElementById('clarifica-spotlight'), null, 'holofote removido');
  assert.equal(document.getElementById('clarifica-regua'), null, 'régua removida');
  assert.equal(document.querySelectorAll('.clarifica-destaque-leitura').length, 0, 'destaque de leitura removido');
  assert.equal(document.querySelector('body > img[src$="animacao.gif"]'), gifOriginal, 'GIF original restaurado no lugar do canvas');
  assert.equal(document.querySelectorAll('canvas').length, 0, 'canvas substituto removido');
  assert.equal(limpezaChamada, true, 'limpeza de listeners dos perfis executada');
  assert.equal(window.__clarificaLimpezaPerfis, null, 'registro de limpeza zerado');
  assert.equal(window.__clarificaIndiceBloco, -1, 'índice do bloco de leitura zerado');
});

test('background: resumo e imagens publicam TRIGGER_ACTION via postMessage', async () => {
  const { window } = await setup();
  const mensagens = [];
  window.addEventListener('message', (e) => mensagens.push(e.data));
  window.executarAcao('summarize');
  window.executarAcao('describe-images');
  await sleep(40);
  // normaliza objetos do realm do jsdom para comparação segura
  const normalizadas = mensagens.map((m) => ({ type: m.type, action: m.action }));
  assert.deepEqual(normalizadas, [
    { type: 'TRIGGER_ACTION', action: 'summarize' },
    { type: 'TRIGGER_ACTION', action: 'describe-images' }
  ]);
});

test('background: comando de tradução (v1.3.0) dispara anúncio i18n + TRIGGER_ACTION', async () => {
  const { stub, window } = await setup();
  const mensagens = [];
  window.addEventListener('message', (e) => mensagens.push(e.data));
  const listener = stub.calls.commands[0];
  await listener('traduzir-selecao');
  await sleep(10);
  assert.equal(stub.calls.executeScript.length, 2, 'anúncio + ação (2 injeções, como nos demais comandos)');
  assert.equal(stub.calls.executeScript[0].args[0], 'translate-selection');
  assert.equal(stub.calls.executeScript[0].args[1], mensagemPT('anuncioTraducao'), 'mensagem resolvida no service worker');
  const normalizadas = mensagens.map((m) => ({ type: m.type, action: m.action }));
  assert.deepEqual(normalizadas, [{ type: 'TRIGGER_ACTION', action: 'translate-selection' }]);
});

test('background: reset-all desmonta o host de legendas da página (v1.4.0)', async () => {
  const { window, document } = await setup();

  // Estado sujo como o prepararLegendasNaPagina deixaria: track com Blob
  // WebVTT, overlay de sobreposição, chip de estado, estilo do pulso e
  // anúncio único.
  const video = document.createElement('video');
  document.querySelector('main').appendChild(video);
  const track = document.createElement('track');
  track.kind = 'captions';
  video.appendChild(track);
  const sobreposicao = document.createElement('div');
  sobreposicao.id = 'clarifica-overlay-legendas';
  document.body.appendChild(sobreposicao);
  const chip = document.createElement('div');
  chip.id = 'clarifica-chip-legendas';
  document.body.appendChild(chip);
  const estilo = document.createElement('style');
  estilo.id = 'clarifica-estilo-legendas';
  document.documentElement.appendChild(estilo);
  const anuncio = document.createElement('div');
  anuncio.id = 'clarifica-anuncio-legendas';
  document.body.appendChild(anuncio);
  let urlRevogada = null;
  window.__clarificaLegendas = {
    trackEl: track,
    sobreposicao,
    chip,
    urlVtt: 'blob:webvtt-simulado'
  };

  window.executarAcao('reset-all');

  assert.ok(!track.isConnected, 'track <kind=captions> removido do vídeo');
  assert.equal(document.getElementById('clarifica-overlay-legendas'), null, 'overlay de sobreposição removido');
  assert.equal(document.getElementById('clarifica-chip-legendas'), null, 'chip de estado removido');
  assert.equal(document.getElementById('clarifica-estilo-legendas'), null, 'estilo do pulso removido');
  assert.equal(document.getElementById('clarifica-anuncio-legendas'), null, 'anúncio removido');
  assert.equal(window.__clarificaLegendas, null, 'host de legendas zerado');
});

test('background: funções de legendas expostas degradam graciosamente sem APIs do Chrome (v1.4.0)', async () => {
  const { window } = await setup();
  // O ambiente de teste não tem chrome.offscreen/tabCapture/runtime — as
  // funções do ciclo de vida existem e não lançam (guardas da casa).
  assert.equal(typeof window.pararLegendas, 'function', 'pararLegendas disponível');
  assert.equal(typeof window.iniciarLegendas, 'function', 'iniciarLegendas disponível');
  assert.equal(typeof window.garantirDocumentoOffscreen, 'function', 'supervisor do offscreen disponível');
  await assert.doesNotReject(() => window.pararLegendas('parada-pedida'), 'parada sem captura é inofensiva (idempotente)');
  // A função de entrega na página limpa o host com retorno estruturado.
  const host = { urlVtt: 'blob:x', trackEl: { remove() {} }, sobreposicao: null, chip: null };
  window.__clarificaLegendas = host;
  const resultado = window.desmontarLegendasNaPagina();
  // Comparação cross-realm: o objeto nasce no realm do jsdom (função
  // avaliada via window.eval) — deepEqual estrito compararia protótipos.
  assert.ok(resultado && resultado.success === true, 'desmontagem idempotente com resposta');
  assert.equal(window.__clarificaLegendas, null, 'host removido da página');
});

test('background: reset-all interrompe a leitura em voz alta da página (v1.3.0)', async () => {
  const { window } = await setup();
  let cancelamentos = 0;
  window.speechSynthesis = { cancel: () => { cancelamentos++; } };
  window.executarAcao('reset-all');
  assert.equal(cancelamentos, 1, 'speechSynthesis.cancel chamado pelo reset');
});

test('background: ações de leitura/reset NÃO publicam postMessage', async () => {
  const { window } = await setup();
  const mensagens = [];
  window.addEventListener('message', (e) => mensagens.push(e.data));
  window.executarAcao('apply-leitura-essencial');
  window.executarAcao('reset-all');
  await sleep(40);
  assert.deepEqual(mensagens, []);
});
