// Suíte: Perfis Neurodivergentes (v1.2.0) — TEA, TDAH e Dislexia.
// Cobre a lógica PURA dos perfis (CSS gerado em popup.js, extraído por
// marcadores), os fluxos completos no popup (toggle, troca exclusiva,
// persistência, restauração) e o estado real deixado na PÁGINA alvo
// (estilos, holofote, régua, destaque progressivo, limpeza idempotente).
const test = require('node:test');
const assert = require('node:assert/strict');
const { makeDom, makeChromeStub, sleep, readExt, substituirI18n, MENSAGENS_PT } = require('./helpers/env');

// ---- Lógica pura (mesma técnica do css-filters.test.js) ----
const popupJs = readExt('popup/popup.js');
const MARCA_INICIO = '=== INÍCIO DA LÓGICA PURA DE PERFIS NEURODIVERGENTES';
const MARCA_FIM = '=== FIM DA LÓGICA PURA DE PERFIS NEURODIVERGENTES';

function carregarLogicaPura() {
  const marcaInicio = popupJs.indexOf(MARCA_INICIO);
  const marcaFim = popupJs.indexOf(MARCA_FIM);
  assert.ok(marcaInicio !== -1 && marcaFim !== -1 && marcaFim > marcaInicio, 'bloco de lógica pura de perfis delimitado em popup.js');
  const inicio = popupJs.lastIndexOf('\n', marcaInicio) + 1;
  const fim = popupJs.indexOf('\n', marcaFim) + 1;
  const trecho = popupJs.slice(inicio, fim);
  const fabrica = new Function(`${trecho}\nreturn { NOMES_PERFIS, TIPOS_PERFIL, ALVO_TEXTO, ALVO_MONO, cssPerfil };`);
  return fabrica();
}

const { NOMES_PERFIS, TIPOS_PERFIL, ALVO_TEXTO, ALVO_MONO, cssPerfil } = carregarLogicaPura();

// ---- Fluxos completos no popup (mesmo ambiente do popup.test.js) ----
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
  dom.window.eval(readExt('popup/popup.js'));
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded', { bubbles: true }));
  const document = dom.window.document;
  await sleep(20);
  return { dom, stub, window: dom.window, document, storageStore: stub.storageStore };
}

const botaoPerfil = (document, mode) => document.querySelector(`.mode-btn.perfil[data-mode="${mode}"]`);
const statusDe = (document) => document.getElementById('status');

async function aguardar(condicao, maxMs = 500, passo = 5) {
  const inicio = Date.now();
  while (!(await condicao()) && Date.now() - inicio < maxMs) await sleep(passo);
}

test('perfis: lógica pura declara os três perfis e o CSS do TEA pausa animações sem tocar no html (filtro de daltonismo preservado)', () => {
  assert.deepEqual(TIPOS_PERFIL.sort(), ['dislexia', 'tdah', 'tea']);
  const css = cssPerfil('tea');
  assert.match(css, /animation-play-state:\s*paused !important/, 'animações pausadas (congeladas, não puladas)');
  assert.match(css, /transition:\s*none !important/, 'transições desligadas');
  assert.match(css, /box-shadow:\s*none !important/, 'sombras removidas (ruído visual)');
  assert.match(css, /backdrop-filter:\s*none !important/, 'blur de fundo removido');
  assert.match(css, /:not\(html\)/, 'documentElement EXCLUÍDO — o filtro de daltonismo vive no html');
  assert.match(css, /scroll-behavior:\s*auto !important/, 'rolagem suave desligada');
});

test('perfis: CSS do TDAH cria o holofote com coordenadas CSS e o destaque de leitura', () => {
  const css = cssPerfil('tdah');
  assert.match(css, /#clarifica-spotlight/, 'holofote declarado por id');
  assert.match(css, /radial-gradient/, 'escurecimento com furo circular');
  assert.match(css, /var\(--clarifica-x,\s*50%\)/, 'posição horizontal por variável CSS');
  assert.match(css, /var\(--clarifica-y,\s*40%\)/, 'posição vertical por variável CSS');
  assert.match(css, /pointer-events:\s*none/, 'overlay não captura o mouse (página continua usável)');
  assert.match(css, /\.clarifica-destaque-leitura/, 'classe do bloco de leitura destacado');
  assert.match(css, /outline:\s*3px solid/, 'contorno visível no bloco destacado');
});

test('perfis: CSS da dislexia espaça texto, usa fonte de leitura e restaura monoespaçadas por ÚLTIMO', () => {
  const css = cssPerfil('dislexia');
  assert.match(css, /letter-spacing:\s*0\.05em !important/, 'espaçamento de letras');
  assert.match(css, /word-spacing:\s*0\.12em !important/, 'espaçamento de palavras');
  assert.match(css, /line-height:\s*1\.8 !important/, 'entrelinha ampliada');
  assert.match(css, /Verdana/, 'fonte de leitura do sistema (sem download de rede)');
  assert.ok(ALVO_TEXTO.includes('p, li') && ALVO_TEXTO.includes('h1') && ALVO_TEXTO.includes('label'),
    'seletores cobrem parágrafos, títulos e rótulos');
  // A regra de restauração monoespaçada vem DEPOIS das regras de espaçamento
  // (mesma especificidade: a última vence — código/entrada não podem ser espaçados).
  const posMono = css.indexOf(ALVO_MONO);
  const posEspaco = css.indexOf('letter-spacing: 0.05em');
  assert.ok(posMono > posEspaco, 'regra monoespaçada declarada por último');
  assert.match(css, /letter-spacing:\s*normal !important/, 'código e entradas voltam ao espaçamento normal');

  // A régua precisa de REGRA VISUAL — sem isso o div nasce com dimensão zero
  // (bug real da revisão 6: elemento criado, movido... e invisível).
  assert.match(css, /#clarifica-regua\s*\{[^}]*position:\s*fixed/, 'régua é uma faixa fixa (não um div solto no fluxo)');
  assert.match(css, /#clarifica-regua\s*\{[^}]*height:\s*48px/, 'faixa de 48 px centralizada no cursor (24 px para cada lado)');
  assert.match(css, /#clarifica-regua\s*\{[^}]*pointer-events:\s*none/, 'régua nunca intercepta cliques');
  assert.match(css, /#clarifica-regua\s*\{[^}]*border-top:\s*2px solid/, 'bordas delimitam a linha corrente');

  assert.equal(cssPerfil('perfil-inexistente'), '', 'perfil desconhecido não gera CSS');
});

test('perfis: popup com 3 botões rotulados, exclusivos e sem aria-pressed inicial', async () => {
  const { document } = await setup();
  for (const mode of ['tea', 'tdah', 'dislexia']) {
    const btn = botaoPerfil(document, mode);
    assert.ok(btn, `botão do perfil ${mode} presente`);
    assert.ok(!btn.hasAttribute('aria-pressed') || btn.getAttribute('aria-pressed') === 'false', `${mode} começa desligado`);
    assert.ok(btn.textContent.trim().length > 0, `${mode} com rótulo acessível`);
  }
  assert.match(botaoPerfil(document, 'tea').textContent, /Perfil TEA/);
  assert.match(botaoPerfil(document, 'tdah').textContent, /Perfil TDAH/);
  assert.match(botaoPerfil(document, 'dislexia').textContent, /Perfil Dislexia/);
  assert.match(document.querySelector('.secao-titulo:last-of-type').textContent, /Perfis Neurodivergentes/);
});

test('perfis: aplicar o perfil TEA injeta CSS pronto + anúncio traduzido e confirma no popup e no storage', async () => {
  const { stub, document, storageStore } = await setup();
  botaoPerfil(document, 'tea').click();

  // O anúncio da página se auto-remove em 3s (25ms no ambiente com
  // temporizadores acelerados) — captura ATÔMICA: o nó é congelado na
  // mesma avaliação em que aparece, sem corrida com a auto-remoção.
  const anuncioBusca = () => [...document.querySelectorAll('[role="status"][aria-live="assertive"]')]
    .find((n) => /Perfil TEA ativado/.test(n.textContent || ''));
  let anuncio = null;
  await aguardar(() => {
    anuncio = anuncioBusca() || null;
    return anuncio !== null;
  });

  const injecao = stub.calls.executeScript[0];
  assert.equal(injecao.args[0], 'perfil-tea', 'ação da página é perfil-tea');
  assert.match(injecao.args[1].css, /animation-play-state:\s*paused/, 'CSS gerado pela lógica pura cruza a fronteira pronto');
  assert.equal(injecao.args[1].anuncioPerfil, 'Clarifica.ai: Perfil TEA ativado.', 'anúncio já traduzido para a página');
  assert.equal(statusDe(document).textContent, 'Perfil TEA ativado.');
  assert.equal(botaoPerfil(document, 'tea').getAttribute('aria-pressed'), 'true', 'TEA marcado para leitores de tela');
  await sleep(10);
  assert.equal(storageStore.perfilAtivo, 'tea', 'escolha persistida');

  // Estado real na página (jsdom executou a função injetada de verdade)
  const estilo = document.getElementById('clarifica-perfil-tea');
  assert.ok(estilo, 'style do perfil criado na página');
  assert.match(estilo.textContent, /animation-play-state/, 'CSS do perfil aplicado na página');
  assert.ok(anuncio, 'anúncio aria-live na página alvo');
  await aguardar(() => Promise.resolve(!anuncio.isConnected));
  assert.ok(!anuncioBusca(), 'anúncio da página se auto-remove');
});

test('perfis: página sem canvas NÃO quebra o TEA — GIF original permanece (fallback gracioso)', async () => {
  const { document } = await setup();
  const img = document.createElement('img');
  img.setAttribute('src', 'https://exemplo.teste/animacao.gif');
  img.setAttribute('alt', 'gráfico animado');
  document.querySelector('main').appendChild(img);

  botaoPerfil(document, 'tea').click();
  await sleep(30);

  const estilo = document.getElementById('clarifica-perfil-tea');
  assert.ok(estilo, 'perfil aplicado mesmo sem canvas');
  const imgFinal = document.querySelector('main img[src$="animacao.gif"]');
  assert.ok(imgFinal, 'sem canvas (jsdom), o GIF original permanece no DOM');
  assert.equal(document.querySelectorAll('canvas').length, 0, 'nenhum canvas substituto criado');
});

test('perfis: trocar para o TDAH remove o perfil anterior e monta holofote que segue o mouse', async () => {
  const { document, window } = await setup();
  botaoPerfil(document, 'tea').click();
  await sleep(20);
  botaoPerfil(document, 'tdah').click();
  await sleep(30);

  assert.equal(document.getElementById('clarifica-perfil-tea'), null, 'estilo do TEA desmontado na troca');
  assert.ok(document.getElementById('clarifica-perfil-tdah'), 'estilo do TDAH aplicado');
  assert.ok(document.getElementById('clarifica-spotlight'), 'overlay do holofote criado');
  assert.ok(!botaoPerfil(document, 'tea').hasAttribute('aria-pressed'), 'TEA desmarcado');
  assert.equal(botaoPerfil(document, 'tdah').getAttribute('aria-pressed'), 'true', 'TDAH marcado');

  // mousemove → rAF → coordenadas no overlay (throttle de um quadro)
  const evento = new window.MouseEvent('mousemove', { clientX: 123, clientY: 77, bubbles: true });
  window.dispatchEvent(evento);
  await aguardar(() => Promise.resolve(document.getElementById('clarifica-spotlight').style.getPropertyValue('--clarifica-x') !== ''));
  const spot = document.getElementById('clarifica-spotlight');
  assert.equal(spot.style.getPropertyValue('--clarifica-x'), '123px', 'posição horizontal do furo');
  assert.equal(spot.style.getPropertyValue('--clarifica-y'), '77px', 'posição vertical do furo');
});

test('perfis: TDAH navega blocos de leitura com Alt+↓/Alt+↑ (destaque progressivo)', async () => {
  const { document, window } = await setup();
  // Referência capturada antes da limpeza (mesmo padrão do popup.test.js):
  // substituir o main destrói os botões do popup, mas o listener segue ativo.
  const btn = botaoPerfil(document, 'tdah');
  document.querySelector('header').innerHTML = '';
  document.querySelector('main').innerHTML = `
    <h1>Título do artigo</h1>
    <p>Primeiro parágrafo com conteúdo de leitura.</p>
    <p>Segundo parágrafo igualmente legível.</p>
    <p></p>
    <p>Terceiro parágrafo final.</p>
  `;
  btn.click();
  await sleep(30);

  const destacar = (tecla) => document.dispatchEvent(new window.KeyboardEvent('keydown', { key: tecla, altKey: true, bubbles: true, cancelable: true }));
  const destacados = () => [...document.querySelectorAll('.clarifica-destaque-leitura')];

  destacar('ArrowDown');
  assert.equal(destacados().length, 1, 'exatamente um bloco destacado por vez');
  assert.match(destacados()[0].textContent, /Título do artigo/, 'primeiro bloco é o título');

  destacar('ArrowDown');
  assert.equal(destacados().length, 1, 'destaque único mantido');
  assert.match(destacados()[0].textContent, /Primeiro parágrafo/, 'avançou para o 1º parágrafo (vazio é ignorado)');

  destacar('ArrowDown');
  assert.match(destacados()[0].textContent, /Segundo parágrafo/, 'avançou para o 2º parágrafo');

  destacar('ArrowUp');
  assert.match(destacados()[0].textContent, /Primeiro parágrafo/, 'Alt+↑ volta um bloco');

  // Sem Alt, a tecla não interfere na página
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', altKey: false, bubbles: true }));
  assert.match(destacados()[0].textContent, /Primeiro parágrafo/, 'sem Alt: nada muda');
});

test('perfis: dislexia aplica tipografia na página e a régua acompanha o mouse', async () => {
  const { document, window, storageStore } = await setup();
  botaoPerfil(document, 'dislexia').click();
  await sleep(30);

  const estilo = document.getElementById('clarifica-perfil-dislexia');
  assert.ok(estilo, 'style da dislexia criado');
  assert.match(estilo.textContent, /letter-spacing:\s*0\.05em/, 'espaçamento aplicado na página');
  assert.match(estilo.textContent, /#clarifica-regua\s*\{[^}]*pointer-events:\s*none/, 'regra visual da régua cruza a fronteira junto com a tipografia');
  const regua = document.getElementById('clarifica-regua');
  assert.ok(regua, 'régua de leitura criada');

  window.dispatchEvent(new window.MouseEvent('mousemove', { clientX: 40, clientY: 200, bubbles: true }));
  await aguardar(() => Promise.resolve(regua.style.top !== ''));
  assert.equal(regua.style.top, '176px', 'régua posicionada 24px acima do cursor');

  await sleep(10);
  assert.equal(storageStore.perfilAtivo, 'dislexia', 'perfil persistido');
  assert.equal(statusDe(document).textContent, 'Perfil Dislexia ativado.');
});

test('perfis: clicar de novo no perfil ativo DESLIGA tudo (toggle) e limpa o storage', async () => {
  const { document, storageStore } = await setup();
  botaoPerfil(document, 'tdah').click();
  await sleep(20);
  assert.ok(document.getElementById('clarifica-spotlight'), 'pré-condição: perfil ativo na página');

  botaoPerfil(document, 'tdah').click();
  await sleep(30);

  assert.equal(statusDe(document).textContent, 'Perfil desligado.');
  assert.equal(document.getElementById('clarifica-perfil-tdah'), null, 'estilo removido');
  assert.equal(document.getElementById('clarifica-spotlight'), null, 'holofote removido');
  assert.equal(document.querySelectorAll('.clarifica-destaque-leitura').length, 0, 'nenhum bloco destacado');
  assert.ok(!botaoPerfil(document, 'tdah').hasAttribute('aria-pressed'), 'botão desmarcado');
  await sleep(10);
  assert.equal(storageStore.perfilAtivo, null, 'storage limpo');
});

test('perfis: reabrir o popup com perfil salvo restaura o destaque do botão', async () => {
  const { document } = await setup({ storageInicial: { perfilAtivo: 'dislexia' } });
  assert.equal(botaoPerfil(document, 'dislexia').getAttribute('aria-pressed'), 'true', 'Dislexia restaurada como ativa');
  assert.ok(botaoPerfil(document, 'dislexia').classList.contains('ativo'), 'classe visual de ativo restaurada');
  assert.ok(!botaoPerfil(document, 'tea').hasAttribute('aria-pressed'), 'demais perfis permanecem desligados');
});

test('perfis: falha de injeção no fluxo de perfil mostra erro claro ao usuário', async () => {
  const { stub, document } = await setup();
  stub.chrome.scripting.executeScript = async () => { throw new Error('boom'); };
  botaoPerfil(document, 'tea').click();
  await sleep(30);
  assert.equal(statusDe(document).textContent, 'Erro ao injetar script. Recarregue a página.');
  assert.ok(!botaoPerfil(document, 'tea').hasAttribute('aria-pressed'), 'nenhum perfil marcado como ativo em erro');
});
