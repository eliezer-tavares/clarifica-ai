// Suíte: Sincronização de perfis e filtros (v2.0.0).
// Três camadas, no padrão da casa:
//   1. Paridade das cópias canônicas no background.js (LÓGICA PURA DE
//      FILTROS e LÓGICA PURA DE PERFIS) com os blocos originais do popup.js
//      — comparação fonte a fonte normalizada (mesma disciplina das
//      legendas v1.4.0);
//   2. Função injetada aplicarEstadoNaPagina avaliada em DOM real (jsdom):
//      filtro com intensidade, perfil TEA/Dislexia/TDAH, idempotência;
//   3. Orquestração do service worker com stubs: aplicação nas abas http(s)
//      já abertas (aba ativa poupada, teto de 20, opção desligada ignora),
//      limpeza via executarAcao('reset-all') e listener de navegação.
const test = require('node:test');
const assert = require('node:assert/strict');
const { makeDom, makeChromeStub, sleep, readExt } = require('./helpers/env');

const POPUP_JS = readExt('popup/popup.js');
const BACKGROUND_JS = readExt('background.js');

// ---- Extração dos blocos marcados ----
function bloco(fonte, marcaInicio, marcaFim, msg) {
  const ini = fonte.indexOf(marcaInicio);
  const fim = fonte.indexOf(marcaFim);
  assert.ok(ini !== -1 && fim !== -1 && fim > ini, msg);
  const inicio = fonte.lastIndexOf('\n', ini) + 1;
  const fimLinha = fonte.indexOf('\n', fim) + 1;
  return fonte.slice(inicio, fimLinha);
}
const normalizar = (fonte) => fonte.replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ').trim();

// ---- 1. Paridade das cópias canônicas ----

test('sincronizacao: cópia de FILTROS no background é idêntica à lógica pura do popup', () => {
  const noPopup = normalizar(bloco(POPUP_JS, '=== INÍCIO DA LÓGICA PURA DE FILTROS', '=== FIM DA LÓGICA PURA DE FILTROS', 'bloco de filtros delimitado no popup'));
  const noBackground = normalizar(bloco(BACKGROUND_JS, '=== INÍCIO DA CÓPIA CANÔNICA DE FILTROS', '=== FIM DA CÓPIA CANÔNICA DE FILTROS', 'cópia de filtros delimitada no background'));
  // A cópia extrai as MESMAS declarações (matrizes + 3 funções): comparamos
  // cada símbolo fonte a fonte.
  for (const simbolo of ['const MATRIZES_DALTONISMO', 'function matrizComIntensidade(matriz, intensidade) {', 'function formatarValoresMatriz(matriz) {', 'function filtroDaltonismoCss(tipo, intensidade) {']) {
    assert.ok(noPopup.includes(simbolo.replace(/\s+/g, ' ')), `${simbolo} presente no popup`);
    assert.ok(noBackground.includes(simbolo.replace(/\s+/g, ' ')), `${simbolo} presente na cópia do background`);
  }
  // Prova comportamental: a cópia avaliada produz o MESMO CSS da original
  // para as 3 matrizes e várias intensidades.
  const cssDaCopia = (() => {
    const trecho = bloco(BACKGROUND_JS, '=== INÍCIO DA CÓPIA CANÔNICA DE FILTROS', '=== FIM DA CÓPIA CANÔNICA DE FILTROS', 'cópia presente');
    return new Function(`${trecho}\nreturn filtroDaltonismoCss;`)();
  })();
  const cssDoPopup = (() => {
    const trecho = bloco(POPUP_JS, '=== INÍCIO DA LÓGICA PURA DE FILTROS', '=== FIM DA LÓGICA PURA DE FILTROS', 'bloco presente');
    return new Function(`${trecho}\nreturn filtroDaltonismoCss;`)();
  })();
  for (const tipo of ['protanopia', 'deuteranopia', 'tritanopia']) {
    for (const intensidade of [0, 25, 50, 100]) {
      assert.equal(cssDaCopia(tipo, intensidade), cssDoPopup(tipo, intensidade),
        `CSS idêntico: ${tipo} @ ${intensidade}%`);
    }
  }
});

test('sincronizacao: cópia de PERFIS no background é idêntica à lógica pura do popup', () => {
  const noPopup = normalizar(bloco(POPUP_JS, '=== INÍCIO DA LÓGICA PURA DE PERFIS NEURODIVERGENTES', '=== FIM DA LÓGICA PURA DE PERFIS NEURODIVERGENTES', 'bloco de perfis delimitado no popup'));
  const noBackground = normalizar(bloco(BACKGROUND_JS, '=== INÍCIO DA CÓPIA CANÔNICA DE PERFIS', '=== FIM DA CÓPIA CANÔNICA DE PERFIS', 'cópia de perfis delimitada no background'));
  const cssDaCopia = (() => {
    const trecho = bloco(BACKGROUND_JS, '=== INÍCIO DA CÓPIA CANÔNICA DE PERFIS', '=== FIM DA CÓPIA CANÔNICA DE PERFIS', 'cópia presente');
    return new Function(`${trecho}\nreturn cssPerfil;`)();
  })();
  const cssDoPopup = (() => {
    const trecho = bloco(POPUP_JS, '=== INÍCIO DA LÓGICA PURA DE PERFIS NEURODIVERGENTES', '=== FIM DA LÓGICA PURA DE PERFIS NEURODIVERGENTES', 'bloco presente');
    return new Function(`${trecho}\nreturn cssPerfil;`)();
  })();
  for (const perfil of ['tea', 'tdah', 'dislexia']) {
    assert.equal(cssDaCopia(perfil), cssDoPopup(perfil), `CSS do perfil ${perfil} idêntico`);
  }
  assert.equal(cssDaCopia('inexistente'), '', 'perfil desconhecido → CSS vazio nas duas');
});

// ---- 2. Função injetada avaliada em DOM real ----

function carregarAplicarEstadoNaPagina() {
  // Extrai a função injetada do background (avaliada como função livre —
  // o Chrome serializa apenas o corpo, e é exatamente isso que o teste
  // reproduz).
  const ini = BACKGROUND_JS.indexOf('function aplicarEstadoNaPagina(estado) {');
  assert.ok(ini !== -1, 'aplicarEstadoNaPagina presente no background');
  // Fim: a função termina na linha "}" que precede a próxima seção de
  // comentários de nível superior (padrão do arquivo).
  const marcadorFim = BACKGROUND_JS.indexOf('// =====================================================================', ini);
  assert.ok(marcadorFim > ini, 'fim da função localizado');
  const fim = BACKGROUND_JS.lastIndexOf('}', marcadorFim);
  const corpo = BACKGROUND_JS.slice(ini, fim + 1);
  return new Function(`return (${corpo});`)();
}

async function domParaEstado() {
  const dom = makeDom('<!DOCTYPE html><html lang="pt-BR"><body><main><h1>Portal</h1><p>Conteúdo.</p></main></body></html>');
  return dom.window;
}

// A função injetada usa document/window GLOBAIS (no navegador eles são o
// contexto da página): o teste os define temporariamente para a mesma
// semântica.
async function comGlobals(window, fn) {
  global.window = window;
  global.document = window.document;
  try {
    return await fn();
  } finally {
    delete global.window;
    delete global.document;
  }
}

test('sincronizacao: aplicarEstadoNaPagina aplica filtro com intensidade e anuncia por efeito', async () => {
  const aplicar = carregarAplicarEstadoNaPagina();
  const window = await domParaEstado();
  await comGlobals(window, async () => {
    const resultado = aplicar({ filtro: 'protanopia', intensidade: 50, perfil: null });
    assert.equal(resultado.success, true);
    assert.match(window.document.documentElement.style.filter, /feColorMatrix/, 'filtro aplicado');
    assert.match(window.document.documentElement.style.filter, /0\.783/, 'interpolação de 50% (mesma matemática do popup)');
  });
});

test('sincronizacao: perfil dislexia sincronizado cria estilo + régua; segunda aplicação é idempotente', async () => {
  const aplicar = carregarAplicarEstadoNaPagina();
  const window = await domParaEstado();
  await comGlobals(window, async () => {
    const primeiro = aplicar({ filtro: null, intensidade: 100, perfil: 'dislexia' });
    assert.equal(primeiro.success, true);
    assert.ok(window.document.getElementById('clarifica-perfil-dislexia'), 'estilo do perfil criado');
    const regua = window.document.getElementById('clarifica-regua');
    assert.ok(regua, 'régua de leitura criada (elemento do perfil)');

    // Segunda aplicação (troca de perfil): limpa o anterior antes de aplicar.
    const segundo = aplicar({ filtro: null, intensidade: 100, perfil: 'tea' });
    assert.equal(segundo.success, true);
    assert.equal(window.document.getElementById('clarifica-perfil-dislexia'), null, 'estilo do perfil anterior removido');
    assert.equal(window.document.getElementById('clarifica-regua'), null, 'régua do perfil anterior removida');
    assert.ok(window.document.getElementById('clarifica-perfil-tea'), 'estilo do perfil novo criado');
  });
});

test('sincronizacao: perfil tdah sincronizado cria holofote e registra limpeza (reset compatível)', async () => {
  const aplicar = carregarAplicarEstadoNaPagina();
  const window = await domParaEstado();
  await comGlobals(window, async () => {
    aplicar({ filtro: null, intensidade: 100, perfil: 'tdah' });
    assert.ok(window.document.getElementById('clarifica-spotlight'), 'holofote criado');
    assert.equal(typeof window.__clarificaLimpezaPerfis, 'function', 'limpeza registrada para o reset-all');
    window.__clarificaLimpezaPerfis(); // não deve lançar
    assert.equal(window.__clarificaIndiceBloco, -1, 'índice de leitura zerado');
  });
});

test('sincronizacao: sem filtro e sem perfil → estado limpo (filter vazio)', async () => {
  const aplicar = carregarAplicarEstadoNaPagina();
  const window = await domParaEstado();
  await comGlobals(window, async () => {
    window.document.documentElement.style.filter = 'url("data:image/svg+xml,xyz")';
    const resultado = aplicar({ filtro: null, intensidade: 100, perfil: null });
    assert.equal(resultado.success, true);
    assert.equal(window.document.documentElement.style.filter, '', 'filtro anterior removido');
  });
});

// ---- 3. Orquestração no service worker (stubs) ----

// Envia a mensagem para TODOS os roteadores registrados (legendas +
// sincronização — ordem de registro não importa: cada um responde só ao
// seu target/type) e devolve a primeira resposta não nula.
function enviarViaRoteadores(stub, mensagem) {
  return new Promise((resolver) => {
    let resposta = null;
    for (const roteador of stub.calls.onMessage) {
      try { roteador(mensagem, {}, (r) => { if (r && !resposta) resposta = r; }); } catch (e) { /* roteador alheio */ }
    }
    setTimeout(() => resolver(resposta), 15);
  });
}

// Dispara a navegação em TODOS os listeners de onUpdated (legendas +
// sincronização): só o da sincronização injeta o estado.
async function navegar(stub, tabId, mudancas, aba) {
  for (const listener of stub.calls.onUpdated) {
    try { await listener(tabId, mudancas, aba); } catch (e) { /* alheio */ }
  }
  await sleep(20);
}

// Objeto criado no REALM do jsdom (via window.eval) tem protótipo de
// outro mundo — deepStrictEqual do Node falharia mesmo com conteúdo
// idêntico. Desserializar via JSON traz o objeto para o reino do Node.
const doReinoNode = (valor) => JSON.parse(JSON.stringify(valor));

async function setupBackground(opts = {}) {
  const dom = makeDom('<!DOCTYPE html><html lang="pt-BR"><body><main><h1>T</h1><p>C</p></main></body></html>');
  const stub = makeChromeStub(dom.window, opts);
  dom.window.eval(BACKGROUND_JS);
  await sleep(15);
  return { dom, stub, window: dom.window, document: dom.window.document };
}

test('sincronizacao: registra listeners de onUpdated/onRemoved e o roteador de mensagens', async () => {
  const { stub } = await setupBackground();
  assert.equal(stub.calls.onUpdated.length, 2, 'onUpdated: legendas (v1.4.0) + sincronização (v2.0.0)');
  assert.equal(stub.calls.onRemoved.length, 1, 'onRemoved das legendas');
  assert.equal(stub.calls.onMessage.length, 2, 'roteadores: legendas + sincronização');
});

test('sincronizacao: aplicar propaga o estado às abas http(s), poupando a aba ativa', async () => {
  const { stub, window } = await setupBackground({
    storageInicial: { ultimoFiltro: 'deuteranopia', intensidade: 60, perfilAtivo: null, sincronizacaoAtiva: true },
    abasConsulta: [
      { id: 7, url: 'https://a.exemplo/' },   // aba ATIVA (poupada)
      { id: 8, url: 'https://b.exemplo/' },
      { id: 9, url: 'http://c.exemplo/' }
    ]
  });
  const resposta = await enviarViaRoteadores(stub, { target: 'background', type: 'clarifica-sincronizar', action: 'aplicar' });
  assert.ok(resposta && resposta.success, 'resposta de sucesso');
  assert.equal(resposta.abas, 2, 'duas abas NÃO ativas sincronizadas');
  const alvos = stub.calls.executeScript.map((c) => c.target.tabId);
  assert.deepEqual(alvos, [8, 9], 'aba ativa (7) poupada; 8 e 9 recebem o estado');
  const estados = stub.calls.executeScript.map((c) => c.args[0]);
  assert.deepEqual(doReinoNode(estados), [
    { filtro: 'deuteranopia', intensidade: 60, perfil: null },
    { filtro: 'deuteranopia', intensidade: 60, perfil: null }
  ], 'estado lido do storage (fonte única) cruza a fronteira');
});

test('sincronizacao: teto de 20 abas e ação inválida rejeitada', async () => {
  const abas = [];
  for (let i = 0; i < 25; i++) abas.push({ id: 100 + i, url: 'https://x.exemplo/' });
  const { stub, window } = await setupBackground({
    storageInicial: { ultimoFiltro: 'tritanopia', intensidade: 100, perfilAtivo: null, sincronizacaoAtiva: true },
    abasConsulta: abas
  });
  const resposta = await enviarViaRoteadores(stub, { target: 'background', type: 'clarifica-sincronizar', action: 'aplicar' });
  assert.equal(resposta.abas, 20, 'no máximo 20 abas sincronizadas por ciclo');
  assert.equal(stub.calls.executeScript.length, 20);

  const respostaInvalida = await enviarViaRoteadores(stub, { target: 'background', type: 'clarifica-sincronizar', action: 'explodir' });
  assert.deepEqual(doReinoNode(respostaInvalida), { error: 'falha-sincronizacao' }, 'ação desconhecida rejeitada');
});

test('sincronizacao: sincronizacaoAtiva=false ignora tudo; sem estado não injeta nada', async () => {
  const { stub } = await setupBackground({
    storageInicial: { ultimoFiltro: 'protanopia', intensidade: 100, perfilAtivo: 'dislexia', sincronizacaoAtiva: false },
    abasConsulta: [{ id: 8, url: 'https://b.exemplo/' }]
  });
  const resposta = await enviarViaRoteadores(stub, { target: 'background', type: 'clarifica-sincronizar', action: 'aplicar' });
  assert.deepEqual(doReinoNode(resposta), { success: true, ignorado: true }, 'opção desligada → ignorado com sucesso');
  assert.equal(stub.calls.executeScript.length, 0, 'nenhuma injeção com sincronização desligada');
});

test('sincronizacao: limpar executa executarAcao reset-all nas abas não ativas', async () => {
  const { stub } = await setupBackground({
    storageInicial: { ultimoFiltro: 'protanopia', intensidade: 100, perfilAtivo: 'tea', sincronizacaoAtiva: true },
    abasConsulta: [{ id: 7, url: 'https://a.exemplo/' }, { id: 8, url: 'https://b.exemplo/' }]
  });
  const resposta = await enviarViaRoteadores(stub, { target: 'background', type: 'clarifica-sincronizar', action: 'limpar' });
  assert.equal(stub.calls.executeScript.length, 1, 'uma aba limpa (a ativa é poupada)');
  const injecao = stub.calls.executeScript[0];
  assert.deepEqual(doReinoNode(injecao.args), ['reset-all'], 'limpeza usa o MESMO reset-all do Ctrl+Shift+X');
});

test('sincronizacao: navegação completa em página http(s) aplica o estado salvo', async () => {
  const { stub } = await setupBackground({
    storageInicial: { ultimoFiltro: 'tritanopia', intensidade: 30, perfilAtivo: null, sincronizacaoAtiva: true }
  });
  // http(s) → aplica; página interna → não aplica.
  await navegar(stub, 42, { status: 'complete' }, { id: 42, url: 'https://portal.exemplo/artigo' });
  assert.equal(stub.calls.executeScript.length, 1);
  assert.equal(stub.calls.executeScript[0].target.tabId, 42);
  assert.deepEqual(doReinoNode(stub.calls.executeScript[0].args[0]), { filtro: 'tritanopia', intensidade: 30, perfil: null });

  await navegar(stub, 42, { status: 'complete' }, { id: 42, url: 'chrome://settings/' });
  assert.equal(stub.calls.executeScript.length, 1, 'chrome:// não recebe injeção');

  await navegar(stub, 42, { status: 'loading' }, { id: 42, url: 'https://portal.exemplo/artigo' });
  assert.equal(stub.calls.executeScript.length, 1, 'status != complete não aplica');
});
