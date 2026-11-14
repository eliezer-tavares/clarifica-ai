// Suíte: Assistente de Perguntas e Respostas (v2.0.0).
// Quatro camadas, no padrão da casa (css-filters/perfis/legendas):
//   1. Lógica pura compartilhada (scripts/clarifica-puro.js, extração por
//      marcadores): parametrosDeGeracao (Português Claro assistido por
//      modelo) e paridade da cópia inline no ai-worker.js;
//   2. Estrutura do popup (campo de pergunta rotulado, botão, seletor de
//      idioma de saída, checkbox de Português Claro);
//   3. Fluxo ponta a ponta no jsdom com Worker simulado: pergunta vazia,
//      página com pouco texto (contexto-curto), resposta exibida e Worker
//      encerrado, erro codificado traduzido;
//   4. Registry: o modelo QA fixado em VERSOES_MODELOS.md é confrontado
//      com o worker (cobertura reforçada aqui para a frente de QA).
const test = require('node:test');
const assert = require('node:assert/strict');
const { makeDom, makeChromeStub, sleep, aguardar, readExt, substituirI18n, FakeWorker, MENSAGENS_PT } = require('./helpers/env');

// ---- Extração da lógica pura canônica (scripts/clarifica-puro.js) ----
const MARCA_INICIO = '=== INÍCIO DA LÓGICA PURA DE AUDITORIA WCAG';
const MARCA_FIM = '=== FIM DA LÓGICA PURA DE AUDITORIA WCAG';

function trechoPuro(fonte, marcaInicio, marcaFim, mensagem) {
  const ini = fonte.indexOf(marcaInicio);
  const fim = fonte.indexOf(marcaFim);
  assert.ok(ini !== -1 && fim !== -1 && fim > ini, mensagem);
  const inicio = fonte.lastIndexOf('\n', ini) + 1;
  const fimLinha = fonte.indexOf('\n', fim) + 1;
  return fonte.slice(inicio, fimLinha);
}

const puro = (() => {
  const trecho = trechoPuro(readExt('scripts/clarifica-puro.js'), MARCA_INICIO, MARCA_FIM,
    'bloco de lógica pura de auditoria WCAG delimitado em scripts/clarifica-puro.js');
  const fabrica = new Function(`${trecho}\nreturn { parametrosDeGeracao, auditarAcessibilidade, ehTextoLinkGenerico, headingsForaDeOrdem };`);
  return fabrica();
})();

const WORKER_JS = readExt('scripts/ai-worker.js');

async function setup(opts = {}) {
  const html = substituirI18n(readExt('popup/popup.html')).replace('<script type="module" src="popup.js"></script>', '');
  const dom = makeDom(html, 'chrome-extension://clarifica-ai/popup/popup.html');
  const stub = makeChromeStub(dom.window, opts);
  await sleep(10);
  FakeWorker.reset();
  dom.window.Worker = FakeWorker;
  dom.window.fetch = async (url) => {
    if (String(url).includes('_locales/')) {
      return { ok: true, status: 200, json: async () => MENSAGENS_PT, text: async () => JSON.stringify(MENSAGENS_PT) };
    }
    return { ok: true, status: 200, text: async () => '// código do worker (ambiente de teste)' };
  };
  dom.window.URL.createObjectURL = () => 'blob:simulado';
  dom.window.URL.revokeObjectURL = () => {};
  dom.window.eval(readExt('popup/popup.js'));
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded', { bubbles: true }));
  const document = dom.window.document;
  await sleep(20);
  return { dom, stub, window: dom.window, document, storageStore: stub.storageStore };
}

const botao = (document, mode) => document.querySelector(`.mode-btn[data-mode="${mode}"]`);
const statusDe = (document) => document.getElementById('status');

// ---- 1. Lógica pura: Português Claro assistido por modelo ----

test('qa: parametrosDeGeracao (lógica pura) — padrão da v1.0.0 e modo claro com teto menor', () => {
  const padrao = puro.parametrosDeGeracao(false);
  const claro = puro.parametrosDeGeracao(true);
  assert.deepEqual(padrao, { max_new_tokens: 150, min_new_tokens: 50, do_sample: false }, 'padrão idêntico aos parâmetros da v1.0.0');
  assert.equal(claro.max_new_tokens, 90, 'claro: teto de saída reduzido (frases curtas)');
  assert.equal(claro.min_new_tokens, 30, 'claro: piso de saída reduzido');
  assert.equal(claro.do_sample, false, 'claro: determinístico');
  // Entradas não booleanas caem no padrão (opção é aditiva, nunca surpresa)
  assert.deepEqual(puro.parametrosDeGeracao(undefined), padrao);
  assert.deepEqual(puro.parametrosDeGeracao('sim'), padrao);
});

test('qa: paridade da cópia de parametrosDeGeracao no ai-worker.js com a fonte canônica', () => {
  // A cópia inline no worker (avaliado sem bundler) deve ser idêntica,
  // fonte a fonte, à função canônica do módulo puro.
  const fonteCanonica = trechoPuro(readExt('scripts/clarifica-puro.js'), MARCA_INICIO, MARCA_FIM, 'bloco puro presente');
  const extrair = (fonte) => {
    const m = fonte.match(/function parametrosDeGeracao\(claro\) \{[\s\S]*?\n\}/);
    assert.ok(m, 'função parametrosDeGeracao presente');
    return m[0].replace(/\s+/g, ' ').trim();
  };
  const noModulo = extrair(fonteCanonica);
  const noWorker = extrair(WORKER_JS);
  assert.equal(noWorker, noModulo, 'cópia do worker idêntica à fonte canônica (normalizada)');
});

test('qa: o worker declara a tarefa question-answering com o modelo e a revisão do registry', () => {
  assert.match(WORKER_JS, /pipeline\('question-answering',\s*'Xenova\/distilbert-base-cased-distilled-squad'/, 'pipeline de QA no worker');
  assert.match(WORKER_JS, /revision:\s*'bdbb0a5e9c617c3c7ea9f3cbaf2be3ad871bcd7d'/, 'revisão (SHA) fixada do modelo QA');
  assert.match(WORKER_JS, /type:\s*'qa-answer'/, 'resposta no type qa-answer');
  assert.match(WORKER_JS, /error:\s*"erro-qa"/, 'código de erro erro-qa');
});

test('qa: o popup passa opcoes de idioma/claro no summarize e na descrição de imagens', () => {
  const popup = readExt('popup/popup.js');
  assert.match(popup, /type:\s*'summarize',\s*data:\s*texto\.substring\(0,\s*3000\),\s*opcoes:/, 'opcoes cruzam a fronteira no summarize');
  assert.match(popup, /type:\s*'describe-image',\s*data:\s*img\.src,\s*opcoes:/, 'opcoes cruzam a fronteira na descrição de imagens');
  assert.match(popup, /type:\s*'question-answering',\s*data:\s*\{\s*pergunta,\s*contexto\s*\}/, 'QA envia pergunta + contexto');
});

// ---- 2. Estrutura do popup ----

test('qa: campo de pergunta rotulado com placeholder e botão dedicado', async () => {
  const { document } = await setup();
  const campo = document.getElementById('pergunta');
  assert.ok(campo, 'campo de pergunta presente');
  assert.equal(campo.getAttribute('type'), 'text', 'campo de texto');
  const rotulo = document.querySelector('label[for="pergunta"]');
  assert.ok(rotulo && rotulo.textContent.length > 0, 'campo rotulado (WCAG 1.3.1/4.1.2)');
  assert.ok((campo.getAttribute('placeholder') || '').length > 0, 'placeholder de exemplo');
  assert.ok(botao(document, 'perguntar'), 'botão perguntar presente');
  // Seletor de idioma de saída com 2 opções + checkbox de Português Claro
  const saida = document.getElementById('idioma-saida');
  assert.equal(saida.tagName, 'SELECT');
  assert.equal(saida.querySelectorAll('option').length, 2, 'original × português');
  assert.equal(saida.value, 'original', 'inglês é o padrão (comportamento da v1.0.0)');
  const claro = document.getElementById('claro');
  assert.equal(claro.getAttribute('type'), 'checkbox');
  assert.ok(document.querySelector('label[for="claro"]'), 'checkbox de Português Claro rotulado');
});

// ---- 3. Fluxo ponta a ponta no jsdom ----

test('qa: pergunta vazia é recusada ANTES de qualquer injeção', async () => {
  const { stub, document } = await setup();
  botao(document, 'perguntar').click();
  await sleep(20);
  assert.equal(statusDe(document).textContent, 'Digite uma pergunta antes de usar o assistente.');
  assert.equal(stub.calls.executeScript.length, 0, 'nenhuma injeção sem pergunta');
  assert.equal(FakeWorker.instances.length, 0, 'nenhum Worker criado');
});

test('qa: fluxo completo — pergunta sai do campo, resposta exibida e Worker encerrado', async () => {
  const { stub, document } = await setup();
  const paragrafo = document.createElement('p');
  paragrafo.textContent = 'Conteúdo suficiente da página para responder perguntas. '.repeat(4);
  document.querySelector('main').appendChild(paragrafo);
  document.getElementById('pergunta').value = 'O que a página diz?';
  botao(document, 'perguntar').click();
  // Espera ATIVA pelas etapas do fluxo em vez de tempo fixo: em máquinas
  // carregadas (ex.: 8 GB de RAM rodando a suíte completa após os testes
  // reais de IA) os temporizadores do sistema atrasam e o sleep fixo de
  // 60 ms afirmava antes da resposta do Worker chegar (corrida intermitente
  // observada em campo). Mesmo padrão de multimodal.test.js.
  await aguardar(() => Promise.resolve(stub.calls.executeScript.length === 1), 3000);
  assert.equal(stub.calls.executeScript.length, 1, 'uma injeção (perguntar)');
  assert.equal(stub.calls.executeScript[0].args[0], 'perguntar');
  assert.equal(stub.calls.executeScript[0].args[1].pergunta, 'O que a página diz?', 'pergunta cruza a fronteira');
  await aguardar(() => Promise.resolve(FakeWorker.instances.length > 0 && FakeWorker.instances[0].received.length > 0), 3000);
  const worker = FakeWorker.instances[0];
  assert.ok(worker, 'Worker criado');
  assert.equal(worker.received[0].type, 'question-answering', 'tarefa de QA no worker');
  assert.ok(worker.received[0].data.pergunta === 'O que a página diz?', 'pergunta enviada');
  assert.ok(worker.received[0].data.contexto.length >= 50, 'contexto coletado da página');
  assert.ok(worker.received[0].data.contexto.length <= 4000, 'contexto limitado a 4000 caracteres');
  await aguardar(() => Promise.resolve(worker.terminated), 3000);
  assert.equal(worker.terminated, true, 'Worker encerrado após a resposta');
  await aguardar(() => Promise.resolve(document.getElementById('ai-output').textContent.includes('RESPOSTA-TESTE')), 3000);
  assert.ok(document.getElementById('ai-output').textContent.includes('RESPOSTA-TESTE'), 'resposta exibida');
  assert.equal(statusDe(document).textContent, 'Resposta encontrada na página!');
});

test('qa: página com pouco texto recusa com mensagem clara e sem Worker', async () => {
  const { stub, document } = await setup();
  // Referências capturadas ANTES da limpeza (o main do popup contém os
  // controles E a barra de status — o innerHTML apaga tudo junto).
  const campo = document.getElementById('pergunta');
  const btn = botao(document, 'perguntar');
  const statusEl = document.getElementById('status');
  document.querySelector('main').innerHTML = '<p>curto</p>';
  campo.value = 'O que diz a página?';
  btn.click();
  await sleep(30);
  assert.equal(statusEl.textContent, 'A página tem pouco texto para perguntas e respostas.', 'código contexto-curto traduzido');
  assert.equal(FakeWorker.instances.length, 0, 'nenhum Worker criado');
});

test('qa: erro codificado do worker (erro-qa) é traduzido para a interface', async () => {
  const { document } = await setup();
  FakeWorker.reset('worker-qa-erro');
  const paragrafo = document.createElement('p');
  paragrafo.textContent = 'Conteúdo suficiente da página para responder perguntas. '.repeat(4);
  document.querySelector('main').appendChild(paragrafo);
  document.getElementById('pergunta').value = 'O que diz a página?';
  botao(document, 'perguntar').click();
  // Espera ATIVA pelo fim do fluxo (Worker encerrado) em vez de tempo fixo —
  // mesma corrida intermitente corrigida no teste de fluxo completo acima.
  await aguardar(() => Promise.resolve(FakeWorker.instances[0] && FakeWorker.instances[0].terminated), 3000);
  await aguardar(() => Promise.resolve(statusDe(document).textContent === 'Falha ao responder a pergunta.'), 3000);
  assert.equal(statusDe(document).textContent, 'Falha ao responder a pergunta.');
  assert.equal(FakeWorker.instances[0].terminated, true, 'Worker encerrado no erro');
});
