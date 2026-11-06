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

test('background: ações de leitura/reset NÃO publicam postMessage', async () => {
  const { window } = await setup();
  const mensagens = [];
  window.addEventListener('message', (e) => mensagens.push(e.data));
  window.executarAcao('apply-leitura-essencial');
  window.executarAcao('reset-all');
  await sleep(40);
  assert.deepEqual(mensagens, []);
});
