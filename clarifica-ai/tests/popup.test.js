// Suíte: popup (popup.js + popup.html) — fluxos completos dos 7 botões,
// filtros de daltonismo no DOM, resumo com Worker simulado, descrição de
// imagens e tratamento de erros de injeção.
const test = require('node:test');
const assert = require('node:assert/strict');
const { makeDom, makeChromeStub, sleep, readExt, FakeWorker } = require('./helpers/env');

async function setup() {
  const html = readExt('popup/popup.html').replace('<script type="module" src="popup.js"></script>', '');
  const dom = makeDom(html, 'chrome-extension://clarifica-ai/popup/popup.html');
  const stub = makeChromeStub(dom.window);
  // Deixa o DOMContentLoaded interno do jsdom disparar ANTES do eval,
  // garantindo que os listeners sejam registrados uma única vez.
  await sleep(10);
  FakeWorker.reset();
  dom.window.Worker = FakeWorker;
  // Adaptacões do ambiente para o fluxo REAL do popup.js: o worker de IA
  // é criado a partir de Blob (fetch do código na extensão + createObjectURL).
  dom.window.fetch = async () => ({ ok: true, status: 200, text: async () => '// código do worker (ambiente de teste)' });
  dom.window.URL.createObjectURL = () => 'blob:simulado';
  dom.window.URL.revokeObjectURL = () => {};
  dom.window.eval(readExt('popup/popup.js'));
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded', { bubbles: true }));
  const document = dom.window.document;
  return { dom, stub, window: dom.window, document };
}

const botao = (document, mode) => document.querySelector(`.mode-btn[data-mode="${mode}"]`);
const statusDe = (document) => document.getElementById('status');

/** Aguarda até que a condição seja verdadeira (evita corridas com temporizadores). */
async function aguardar(condicao, maxMs = 500, passo = 5) {
  const inicio = Date.now();
  while (!(await condicao()) && Date.now() - inicio < maxMs) await sleep(passo);
}

test('popup: estrutura com 7 botões nativos, status ao vivo e região de resultado', async () => {
  const { document } = await setup();
  const botoes = [...document.querySelectorAll('button')];
  assert.equal(botoes.length, 7, '6 modos + fechar');
  assert.ok(botoes.every((b) => b.tagName === 'BUTTON'), 'todos os controles são <button> nativos');
  assert.ok(botoes.every((b) => b.getAttribute('tabindex') !== '-1'), 'nenhum botão fora da ordem de TAB');
  assert.ok(botoes.every((b) => b.textContent.trim().length > 0), 'todos com rótulo acessível');
  for (const mode of ['leitura', 'resumo', 'imagens', 'protanopia', 'deuteranopia', 'tritanopia']) {
    assert.ok(botao(document, mode), `botão ${mode} presente`);
  }
  const status = statusDe(document);
  assert.equal(status.getAttribute('role'), 'status');
  assert.equal(status.getAttribute('aria-live'), 'polite');
  const saida = document.getElementById('ai-output');
  assert.equal(saida.getAttribute('role'), 'region');
  assert.equal(saida.getAttribute('aria-label'), 'Resultado da IA');
  assert.ok(document.getElementById('result-area').classList.contains('hidden'), 'resultado começa oculto');
});

test('popup: Modo Leitura Essencial injeta ação e confirma no status', async () => {
  const { stub, document } = await setup();
  botao(document, 'leitura').click();
  await sleep(30);
  assert.equal(stub.calls.executeScript[0].args[0], 'apply-leitura-essencial');
  assert.equal(statusDe(document).textContent, 'Modo Leitura Essencial ativado!');
  assert.equal(document.querySelector('main').getAttribute('role'), 'main', 'main recebeu role=main na página alvo');
});

test('popup: filtro de protanopia aplica feColorMatrix no elemento raiz', async () => {
  const { document } = await setup();
  botao(document, 'protanopia').click();
  const anuncioBusca = () => [...document.querySelectorAll('[role="status"]')].find((n) => n.getAttribute('aria-live') === 'assertive');
  await aguardar(() => Promise.resolve(!!anuncioBusca()));
  const filtro = document.documentElement.style.filter;
  assert.match(filtro, /feColorMatrix/, 'filtro SVG aplicado');
  assert.match(filtro, /0\.567/, 'matriz de protanopia presente');
  assert.equal(statusDe(document).textContent, 'Filtro de daltonismo ativado.');
  const anuncio = anuncioBusca();
  assert.ok(anuncio, 'anúncio assertive criado');
  assert.match(anuncio.textContent, /Protanopia/);
  await aguardar(() => Promise.resolve(!anuncio.isConnected));
  assert.ok(!anuncio.isConnected, 'anúncio se auto-remove');
});

test('popup: trocar de filtro limpa o anterior e anuncia o novo', async () => {
  const { document } = await setup();
  const vivosAgora = () => [...document.querySelectorAll('[role="status"][aria-live="assertive"]')].filter((n) => n.isConnected);
  botao(document, 'protanopia').click();
  await aguardar(() => Promise.resolve(vivosAgora().length === 1));
  const anuncioAnterior = vivosAgora()[0];
  assert.match(anuncioAnterior.textContent, /Protanopia/);

  botao(document, 'deuteranopia').click();
  await aguardar(() => Promise.resolve(vivosAgora().some((n) => /Deuteranopia/.test(n.textContent))));
  await aguardar(() => Promise.resolve(!anuncioAnterior.isConnected));
  const filtro = document.documentElement.style.filter;
  assert.match(filtro, /0\.625/, 'matriz de deuteranopia aplicada');
  assert.ok(!filtro.includes('0.567'), 'matriz anterior descartada');
  const vivos = vivosAgora();
  assert.equal(vivos.length, 1, 'apenas o anúncio atual permanece');
  assert.match(vivos[0].textContent, /Deuteranopia/);
});

test('popup: tritanopia aplica sua própria matriz (distinta das outras)', async () => {
  const { document } = await setup();
  botao(document, 'tritanopia').click();
  await sleep(40);
  assert.match(document.documentElement.style.filter, /0\.95,\s*0\.05/, 'matriz de tritanopia aplicada');
});

test('popup: resumo recusa textos curtos com mensagem clara', async () => {
  const { stub, document } = await setup();
  const btn = botao(document, 'resumo'); // referência capturada antes da remoção
  // esvazia o conteúdo textual do popup para simular página curta
  document.querySelectorAll('.grid-buttons').forEach((g) => g.remove());
  btn.click();
  await sleep(30);
  assert.equal(statusDe(document).textContent, 'Texto muito curto.');
  assert.equal(FakeWorker.instances.length, 0, 'nenhum Worker criado');
  assert.equal(stub.calls.getURL.length, 0);
});

test('popup: resumo envia texto ao Worker, exibe resultado e encerra o Worker', async () => {
  const { stub, document } = await setup();
  const paragrafo = document.createElement('p');
  paragrafo.textContent = 'palavra '.repeat(300);
  document.querySelector('main').appendChild(paragrafo);

  botao(document, 'resumo').click();
  await sleep(60);

  assert.equal(FakeWorker.instances.length, 1, 'um Worker criado');
  const worker = FakeWorker.instances[0];
  assert.equal(worker.url, 'blob:simulado', 'worker criado a partir de Blob (código buscado da extensão)');
  assert.ok(stub.calls.getURL.includes('scripts/ai-worker.js'));
  assert.equal(worker.received[0].type, 'summarize');
  assert.ok(worker.received[0].data.length > 200, 'texto longo enviado');
  assert.ok(worker.received[0].data.length <= 3000, 'texto limitado a 3000 caracteres');
  assert.equal(worker.terminated, true, 'Worker encerrado após resposta');
  assert.equal(document.getElementById('ai-output').textContent, 'RESUMO-TESTE');
  assert.ok(!document.getElementById('result-area').classList.contains('hidden'), 'resultado exibido');
  assert.equal(statusDe(document).textContent, 'Concluído!');
});

test('popup: resumo com progresso real do worker — resultado só na mensagem final (loading/processing não encerram)', async () => {
  const { document } = await setup();
  FakeWorker.reset('sequence');
  const paragrafo = document.createElement('p');
  paragrafo.textContent = 'conteudo '.repeat(250);
  document.querySelector('main').appendChild(paragrafo);

  botao(document, 'resumo').click();
  await sleep(10); // apenas as mensagens de progresso chegaram até aqui

  const worker = FakeWorker.instances[0];
  assert.equal(worker.terminated, false, 'Worker vivo durante o progresso (não resolve na 1ª mensagem)');
  assert.notEqual(document.getElementById('ai-output').textContent, 'RESUMO-TESTE', 'resultado ainda não exibido');

  await sleep(60);
  assert.equal(document.getElementById('ai-output').textContent, 'RESUMO-TESTE', 'resumo exibido na mensagem success');
  assert.equal(statusDe(document).textContent, 'Concluído!');
  assert.equal(worker.terminated, true, 'Worker encerrado apenas após o resultado');
});

test('popup: status de erro emitido pelo worker real mostra a mensagem do worker', async () => {
  const { document } = await setup();
  FakeWorker.reset('worker-status-error');
  const paragrafo = document.createElement('p');
  paragrafo.textContent = 'conteudo '.repeat(250);
  document.querySelector('main').appendChild(paragrafo);
  botao(document, 'resumo').click();
  await sleep(60);
  assert.equal(statusDe(document).textContent, 'Erro ao processar texto.');
  assert.ok(document.getElementById('result-area').classList.contains('hidden'), 'resultado permanece oculto');
  assert.equal(FakeWorker.instances[0].terminated, true, 'Worker encerrado após o erro');
});

test('popup: falha do Worker de IA mostra "Falha na IA." sem abrir resultado', async () => {
  const { document } = await setup();
  FakeWorker.reset('error');
  const paragrafo = document.createElement('p');
  paragrafo.textContent = 'conteudo '.repeat(250);
  document.querySelector('main').appendChild(paragrafo);
  botao(document, 'resumo').click();
  await sleep(60);
  assert.equal(statusDe(document).textContent, 'Falha na IA.');
  assert.ok(document.getElementById('result-area').classList.contains('hidden'), 'resultado permanece oculto');
});

test('popup: botão Fechar oculta o resultado', async () => {
  const { document } = await setup();
  const paragrafo = document.createElement('p');
  paragrafo.textContent = 'conteudo '.repeat(250);
  document.querySelector('main').appendChild(paragrafo);
  botao(document, 'resumo').click();
  await sleep(60);
  document.getElementById('close-result').click();
  await sleep(10);
  assert.ok(document.getElementById('result-area').classList.contains('hidden'));
  assert.equal(statusDe(document).textContent, 'Pronto.');
});

test('popup: descrição de imagens — todas com alt → mensagem de página completa', async () => {
  const { document } = await setup();
  botao(document, 'imagens').click();
  await sleep(30);
  assert.equal(statusDe(document).textContent, 'Todas as imagens já têm descrição.');
  assert.equal(FakeWorker.instances.length, 0);
});

test('popup: descrição de imagens — processa apenas imagens sem alt e aplica acessibilidade', async () => {
  const { document } = await setup();
  const figuras = [
    ['sem-alt.png', null],
    ['vazio.png', ''],
    ['generica.png', 'image'],
    ['logo.png', 'Logotipo do site']
  ];
  for (const [src, alt] of figuras) {
    const img = document.createElement('img');
    img.src = src;
    if (alt !== null) img.setAttribute('alt', alt);
    document.querySelector('main').appendChild(img);
  }

  botao(document, 'imagens').click();
  await sleep(30);
  assert.equal(statusDe(document).textContent, 'Descrevendo 3 imagens...', 'ignora a imagem com alt real');

  await sleep(150);
  const worker = FakeWorker.instances[0];
  assert.equal(worker.received.length, 3, '3 imagens enviadas ao Worker');
  assert.ok(worker.received.every((m) => m.type === 'describe-image'));
  assert.equal(worker.terminated, true, 'Worker encerrado ao concluir');

  for (const [src, alt] of figuras.slice(0, 3)) {
    const img = [...document.querySelectorAll('img')].find((i) => i.getAttribute('src') === src);
    assert.equal(img.getAttribute('alt'), 'DESC-' + img.src, `alt gerado para ${src}`);
    assert.equal(img.getAttribute('aria-label'), `Descrição por IA: DESC-${img.src}`);
    assert.match(img.style.border, /2px/);
    assert.match(img.style.border, /solid/);
    assert.match(img.style.border, /10b981|16,\s*185,\s*129/, 'contorno verde de confirmação');
  }
  const preservada = [...document.querySelectorAll('img')].find((i) => i.getAttribute('src') === 'logo.png');
  assert.equal(preservada.getAttribute('alt'), 'Logotipo do site', 'alt original preservado');
  assert.equal(preservada.style.border, '', 'imagem preservada não recebe contorno');
});

test('popup: falha de injeção de script exibe erro nos três fluxos', async () => {
  const { stub, document } = await setup();
  stub.chrome.scripting.executeScript = async () => { throw new Error('boom'); };

  botao(document, 'leitura').click();
  await sleep(30);
  assert.equal(statusDe(document).textContent, 'Erro ao injetar script. Recarregue a página.');

  botao(document, 'protanopia').click();
  await sleep(30);
  assert.equal(statusDe(document).textContent, 'Erro ao injetar script. Recarregue a página.');

  const paragrafo = document.createElement('p');
  paragrafo.textContent = 'conteudo '.repeat(250);
  document.querySelector('main').appendChild(paragrafo);
  botao(document, 'resumo').click();
  await sleep(30);
  assert.equal(statusDe(document).textContent, 'Erro ao injetar script. Recarregue a página.');
});
