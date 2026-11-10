// Suíte: popup (popup.js + popup.html) — fluxos completos dos 8 controles,
// filtros de daltonismo com INTENSIDADE no DOM, persistência de
// configurações (chrome.storage), tema claro/escuro, interface i18n,
// resumo com Worker simulado, descrição de imagens e tratamento de erros.
const test = require('node:test');
const assert = require('node:assert/strict');
const { makeDom, makeChromeStub, sleep, readExt, substituirI18n, FakeWorker, MENSAGENS_PT } = require('./helpers/env');

async function setup(opts = {}) {
  const html = substituirI18n(readExt('popup/popup.html')).replace('<script type="module" src="popup.js"></script>', '');
  const dom = makeDom(html, 'chrome-extension://clarifica-ai/popup/popup.html');
  const stub = makeChromeStub(dom.window, opts);
  // Deixa o DOMContentLoaded interno do jsdom disparar ANTES do eval,
  // garantindo que os listeners sejam registrados uma única vez.
  await sleep(10);
  FakeWorker.reset();
  dom.window.Worker = FakeWorker;
  // Adaptações do ambiente para o fluxo REAL do popup.js: o worker de IA
  // é criado a partir de Blob (fetch do código na extensão + createObjectURL)
  // e o motor de mensagens carrega os JSON de _locales via fetch + getURL.
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
  await sleep(20); // carregarConfig (chrome.storage) assíncrono
  return { dom, stub, window: dom.window, document, storageStore: stub.storageStore };
}

const botao = (document, mode) => document.querySelector(`.mode-btn[data-mode="${mode}"]`);
const statusDe = (document) => document.getElementById('status');

/** Aguarda até que a condição seja verdadeira (evita corridas com temporizadores). */
async function aguardar(condicao, maxMs = 500, passo = 5) {
  const inicio = Date.now();
  while (!(await condicao()) && Date.now() - inicio < maxMs) await sleep(passo);
}

test('popup: estrutura com 17 botões nativos, slider de intensidade, status ao vivo e região de resultado', async () => {
  const { document } = await setup();
  const botoes = [...document.querySelectorAll('button')];
  assert.equal(botoes.length, 17, '15 modos (6 originais + 3 perfis + 4 áudio/multimodal + 2 legendas da v1.4.0) + fechar + tema');
  assert.ok(botoes.every((b) => b.tagName === 'BUTTON'), 'todos os controles clicáveis são <button> nativos');
  assert.ok(botoes.every((b) => b.getAttribute('tabindex') !== '-1'), 'nenhum botão fora da ordem de TAB');
  assert.ok(botoes.every((b) => b.textContent.trim().length > 0), 'todos com rótulo acessível');
  for (const mode of ['leitura', 'resumo', 'imagens', 'protanopia', 'deuteranopia', 'tritanopia', 'tea', 'tdah', 'dislexia', 'transcrever', 'ocr', 'traduzir', 'voz', 'legendas', 'verificar-legendas']) {
    assert.ok(botao(document, mode), `botão ${mode} presente`);
  }
  // Legendas ao vivo (v1.4.0): toggle com aria-pressed e seletor de idioma.
  const btnLegendas = botao(document, 'legendas');
  assert.equal(btnLegendas.getAttribute('aria-pressed'), 'false', 'legendas inicia desligado (WCAG 4.1.2)');
  const btnVerificar = botao(document, 'verificar-legendas');
  assert.ok(!btnVerificar.hasAttribute('aria-pressed'), 'verificador é ação, não toggle (sem aria-pressed)');
  const seletor = document.getElementById('idioma-legendas');
  assert.equal(seletor.tagName, 'SELECT', 'seletor de idioma das legendas presente');
  assert.equal(seletor.querySelectorAll('option').length, 2, 'duas opções: original × inglês');
  assert.equal(seletor.value, 'original', 'original é o padrão');
  const rotuloSeletor = document.querySelector('label[for="idioma-legendas"]');
  assert.ok(rotuloSeletor && rotuloSeletor.textContent.length > 0, 'seletor rotulado (WCAG 1.3.1/4.1.2)');
  const slider = document.getElementById('intensidade');
  assert.equal(slider.getAttribute('type'), 'range', 'slider de intensidade presente');
  assert.equal(slider.value, '100', 'intensidade padrão 100%');
  assert.ok(slider.getAttribute('min') === '0' && slider.getAttribute('max') === '100', 'faixa 0–100');
  const rotuloSlider = document.querySelector('label[for="intensidade"]');
  assert.ok(rotuloSlider && rotuloSlider.textContent.length > 0, 'slider rotulado (WCAG 1.3.1/4.1.2)');
  const status = statusDe(document);
  assert.equal(status.getAttribute('role'), 'status');
  assert.equal(status.getAttribute('aria-live'), 'polite');
  const saida = document.getElementById('ai-output');
  assert.equal(saida.getAttribute('role'), 'region');
  assert.equal(saida.getAttribute('aria-label'), 'Resultado da IA');
  assert.ok(document.getElementById('result-area').classList.contains('hidden'), 'resultado começa oculto');
  assert.ok(document.getElementById('btn-tema'), 'botão de tema presente');
});

test('popup: interface renderizada em pt-BR via chrome.i18n (placeholders do HTML resolvidos)', async () => {
  const { document } = await setup();
  assert.match(document.querySelector('h1').textContent, /Clarifica\.ai/);
  assert.equal(document.querySelector('header p').textContent, 'IA Local • Privacidade Total');
  assert.equal(botao(document, 'leitura').textContent, '📖 Modo Leitura Essencial');
  assert.equal(document.getElementById('btn-tema').textContent, 'Tema: automático');
});

test('popup: Modo Leitura Essencial injeta ação e confirma no status', async () => {
  const { stub, document } = await setup();
  botao(document, 'leitura').click();
  await sleep(30);
  assert.equal(stub.calls.executeScript[0].args[0], 'apply-leitura-essencial');
  assert.equal(statusDe(document).textContent, 'Modo Leitura Essencial ativado!');
  assert.equal(document.querySelector('main').getAttribute('role'), 'main', 'main recebeu role=main na página alvo');
});

test('popup: filtro de protanopia aplica feColorMatrix no elemento raiz e anuncia com i18n', async () => {
  const { stub, document } = await setup();
  botao(document, 'protanopia').click();
  const anuncioBusca = () => [...document.querySelectorAll('[role="status"]')].find((n) => n.getAttribute('aria-live') === 'assertive');
  // Captura atômica: o nó é congelado na avaliação em que aparece (a
  // auto-remoção agendada não pode vencer a checagem).
  let anuncio = null;
  await aguardar(() => {
    anuncio = anuncioBusca() || null;
    return anuncio !== null;
  });
  const filtro = document.documentElement.style.filter;
  assert.match(filtro, /feColorMatrix/, 'filtro SVG aplicado');
  assert.match(filtro, /0\.567/, 'matriz de protanopia presente');
  assert.equal(statusDe(document).textContent, 'Filtro de daltonismo ativado.');
  const injecao = stub.calls.executeScript[0];
  assert.equal(injecao.args[0], 'daltonismo-protanopia');
  assert.equal(injecao.args[1].intensidade, 100, 'intensidade padrão vai para a página');
  assert.match(injecao.args[1].cssFilter, /0\.567/, 'CSS do filtro construído no popup');
  assert.equal(injecao.args[1].anuncioFiltro, 'Filtro de daltonismo Protanopia ativado.', 'anúncio já traduzido');
  assert.equal(botao(document, 'protanopia').getAttribute('aria-pressed'), 'true', 'filtro ativo marcado');
  assert.ok(anuncio, 'anúncio assertive criado');
  assert.match(anuncio.textContent, /Protanopia/);
  await aguardar(() => Promise.resolve(!anuncio.isConnected));
  assert.ok(!anuncio.isConnected, 'anúncio se auto-remove');
});

test('popup: intensidade 50 interpola a matriz antes de aplicar', async () => {
  const { stub, document, window } = await setup();
  const slider = document.getElementById('intensidade');
  slider.value = '50';
  slider.dispatchEvent(new window.Event('input'));
  assert.equal(document.getElementById('intensidade-valor').textContent, '50%', 'feedback visível do valor');
  botao(document, 'protanopia').click();
  await sleep(30);
  const filtro = document.documentElement.style.filter;
  assert.doesNotMatch(filtro, /0\.567/, 'matriz cheia NÃO é aplicada em 50%');
  assert.match(filtro, /0\.783/, 'interpolação 50% presente (R = 0.783)');
  assert.equal(stub.calls.executeScript[0].args[1].intensidade, 50);
});

test('popup: mover a intensidade e soltar reaplica o último filtro na página', async () => {
  const { stub, document, window } = await setup();
  botao(document, 'protanopia').click();
  await sleep(30);
  assert.equal(stub.calls.executeScript.length, 1);

  const slider = document.getElementById('intensidade');
  slider.value = '25';
  slider.dispatchEvent(new window.Event('input'));
  slider.dispatchEvent(new window.Event('change'));
  await sleep(30);
  assert.equal(stub.calls.executeScript.length, 2, 'filtro reaplicado ao soltar o slider');
  const reaplicacao = stub.calls.executeScript[1];
  assert.equal(reaplicacao.args[0], 'daltonismo-protanopia');
  assert.equal(reaplicacao.args[1].intensidade, 25);
  assert.match(reaplicacao.args[1].cssFilter, /0\.892/, 'interpolação 25% (R = 0.892)');
});

test('popup: trocar de filtro limpa o anterior e anuncia o novo', async () => {
  const { stub, document } = await setup();
  const vivosAgora = () => [...document.querySelectorAll('[role="status"][aria-live="assertive"]')].filter((n) => n.isConnected);
  botao(document, 'protanopia').click();
  // Captura ATÔMICA (anúncios têm auto-remoção agendada — 3s reais, 25ms
  // neste ambiente): o nó é congelado na mesma avaliação em que o estado
  // "1 anúncio vivo, texto Protanopia" é observado — sem corrida.
  let anuncioAnterior = null;
  await aguardar(() => {
    const vivos = vivosAgora();
    anuncioAnterior = vivos.length === 1 ? vivos[0] : null;
    return anuncioAnterior !== null && /Protanopia/.test(anuncioAnterior.textContent);
  });
  assert.ok(anuncioAnterior, 'anúncio do filtro anterior presente na página');

  // Prova SÍNCRONA da limpeza: a MESMA função injetada, aplicada duas vezes
  // em sequência (sem intervalo para temporizadores), deixa exatamente UM
  // anúncio na página — o anterior é removido no ato da troca, e não só
  // quando expira o temporizador de auto-remoção.
  const injetada = stub.calls.executeScript[0].func;
  await injetada('daltonismo-deuteranopia', { cssFilter: '', anuncioFiltro: 'Anúncio da troca (prova de limpeza)' });
  const aposTroca = vivosAgora();
  assert.equal(aposTroca.length, 1, 'apenas o anúncio atual permanece');
  assert.match(aposTroca[0].textContent, /prova de limpeza/);
  assert.ok(!anuncioAnterior.isConnected, 'anúncio do filtro anterior removido pela troca');

  // Fluxo real pelo popup: clicar em deuteranopia aplica a matriz nova,
  // descarta a anterior, marca/desmarca aria-pressed e anuncia na página
  // (captura atômica do estado final, imune ao temporizador do ambiente).
  botao(document, 'deuteranopia').click();
  let vivos = [];
  await aguardar(() => {
    vivos = vivosAgora();
    return vivos.length === 1 && /Deuteranopia/.test(vivos[0].textContent);
  });
  const filtro = document.documentElement.style.filter;
  assert.match(filtro, /0\.625/, 'matriz de deuteranopia aplicada');
  assert.ok(!filtro.includes('0.567'), 'matriz anterior descartada');
  assert.equal(botao(document, 'deuteranopia').getAttribute('aria-pressed'), 'true');
  assert.ok(!botao(document, 'protanopia').hasAttribute('aria-pressed'), 'filtro anterior desmarcado');
  assert.equal(vivos.length, 1, 'apenas o anúncio atual permanece');
  assert.match(vivos[0].textContent, /Deuteranopia/);
});

test('popup: tritanopia aplica sua própria matriz (distinta das outras)', async () => {
  const { document } = await setup();
  botao(document, 'tritanopia').click();
  await sleep(40);
  assert.match(document.documentElement.style.filter, /0\.95,\s*0\.05/, 'matriz de tritanopia aplicada');
});

test('popup: tema cicla auto → claro → escuro → auto e persiste a escolha', async () => {
  const { stub, storageStore, document } = await setup();
  const html = document.documentElement;
  const tema = document.getElementById('btn-tema');

  await tema.click();
  assert.equal(html.getAttribute('data-tema'), 'claro');
  assert.equal(tema.textContent, 'Tema: claro');
  await sleep(10);
  assert.equal(storageStore.tema, 'claro', 'escolha persistida');

  await tema.click();
  assert.equal(html.getAttribute('data-tema'), 'escuro');
  assert.equal(tema.textContent, 'Tema: escuro');
  await sleep(10);
  assert.equal(storageStore.tema, 'escuro');

  await tema.click();
  assert.equal(html.hasAttribute('data-tema'), false, 'auto remove o atributo');
  assert.equal(tema.textContent, 'Tema: automático');
  await sleep(10);
  assert.equal(storageStore.tema, 'auto');
});

test('popup: configurações persistidas são restauradas ao reabrir', async () => {
  const { document } = await setup({
    storageInicial: { tema: 'escuro', intensidade: 40, ultimoFiltro: 'deuteranopia' }
  });
  assert.equal(document.documentElement.getAttribute('data-tema'), 'escuro', 'tema restaurado');
  assert.equal(document.getElementById('intensidade').value, '40', 'intensidade restaurada');
  assert.equal(document.getElementById('intensidade-valor').textContent, '40%');
  assert.equal(botao(document, 'deuteranopia').getAttribute('aria-pressed'), 'true', 'último filtro em destaque');
  assert.ok(botao(document, 'deuteranopia').classList.contains('ativo'));
  assert.equal(document.getElementById('btn-tema').textContent, 'Tema: escuro');
});

test('popup: resumo recusa textos curtos com mensagem clara', async () => {
  const { stub, document } = await setup();
  const btn = botao(document, 'resumo'); // referência capturada antes da limpeza
  const statusEl = document.getElementById('status'); // idem (sai do DOM junto)
  // esvazia o main para simular página alvo curta (o próprio popup tem
  // bastante texto — a função injetada lê o texto do main inteiro)
  document.querySelector('main').innerHTML = '';
  btn.click();
  await sleep(30);
  assert.equal(statusEl.textContent, 'Texto muito curto.', 'erro traduzido do código texto-curto');
  assert.equal(FakeWorker.instances.length, 0, 'nenhum Worker criado');
  assert.ok(!stub.calls.getURL.includes('scripts/ai-worker.js'), 'nenhum acesso ao worker de IA (getURL de _locales é do motor de mensagens)');
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

test('popup: erro codificado do worker real é traduzido para o idioma da interface', async () => {
  const { document } = await setup();
  FakeWorker.reset('worker-status-error');
  const paragrafo = document.createElement('p');
  paragrafo.textContent = 'conteudo '.repeat(250);
  document.querySelector('main').appendChild(paragrafo);
  botao(document, 'resumo').click();
  await sleep(60);
  assert.equal(statusDe(document).textContent, 'Erro ao processar texto.', 'código erro-resumo → mensagem i18n');
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
  assert.equal(statusDe(document).textContent, 'Pronto. Use atalhos ou clique abaixo.');
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
  await aguardar(() => Promise.resolve(statusDe(document).textContent === 'Descrevendo 3 imagens...'), 3000);
  assert.equal(statusDe(document).textContent, 'Descrevendo 3 imagens...', 'quantidade traduzida com placeholder i18n');

  // Espera o Worker terminar (todas as respostas processadas) em vez de
  // tempo fixo — os postMessage e as respostas usam temporizadores que
  // atrasam em máquinas carregadas (corrida intermitente).
  await aguardar(() => Promise.resolve(FakeWorker.instances[0] && FakeWorker.instances[0].terminated), 3000);
  const worker = FakeWorker.instances[0];
  assert.equal(worker.received.length, 3, '3 imagens enviadas ao Worker');
  assert.ok(worker.received.every((m) => m.type === 'describe-image'));
  assert.equal(worker.terminated, true, 'Worker encerrado ao concluir');

  for (const [src, alt] of figuras.slice(0, 3)) {
    const img = [...document.querySelectorAll('img')].find((i) => i.getAttribute('src') === src);
    assert.equal(img.getAttribute('alt'), 'DESC-' + img.src, `alt gerado para ${src}`);
    assert.equal(img.getAttribute('aria-label'), `Descrição por IA: DESC-${img.src}`, 'prefixo i18n aplicado');
    assert.match(img.style.border, /2px/);
    assert.match(img.style.border, /solid/);
    assert.match(img.style.border, /10b981|16,\s*185,\s*129/, 'contorno verde de confirmação');
  }
  const preservada = [...document.querySelectorAll('img')].find((i) => i.getAttribute('src') === 'logo.png');
  assert.equal(preservada.getAttribute('alt'), 'Logotipo do site', 'alt original preservado');
  assert.equal(preservada.style.border, '', 'imagem preservada não recebe contorno');
});

test('popup: erro do worker na descrição de imagens encerra o Worker (sem zumbi)', async () => {
  const { document } = await setup();
  FakeWorker.reset('worker-imagem-erro');
  for (const src of ['a.png', 'b.png']) {
    const img = document.createElement('img');
    img.src = src;
    document.querySelector('main').appendChild(img);
  }
  botao(document, 'imagens').click();
  await sleep(30);
  assert.equal(statusDe(document).textContent, 'Descrevendo 2 imagens...');
  await sleep(80);
  assert.equal(FakeWorker.instances[0].terminated, true, 'Worker encerrado na mensagem de erro');
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
