// Suíte: Painel de Auditoria WCAG em tempo real (v2.0.0).
// Três camadas, no padrão da casa (css-filters/perfis/legendas):
//   1. Lógica pura compartilhada (scripts/clarifica-puro.js, extração por
//      marcadores): auditarAcessibilidade, ehTextoLinkGenerico,
//      headingsForaDeOrdem — o JULGAMENTO dos critérios WCAG;
//   2. Paridade da cópia inline no popup.js com a fonte canônica;
//   3. Painel real no jsdom: a função injetada abre/fecha o dialog
//      acessível, coleta descritores de um DOM real, atualiza em tempo
//      real (MutationObserver com debounce) e fecha com Esc.
const test = require('node:test');
const assert = require('node:assert/strict');
const { makeDom, makeChromeStub, sleep, readExt, substituirI18n, MENSAGENS_PT, mensagemPT } = require('./helpers/env');

// ---- Extração da lógica pura canônica (scripts/clarifica-puro.js) ----
const MARCA_INICIO = '=== INÍCIO DA LÓGICA PURA DE AUDITORIA WCAG';
const MARCA_FIM = '=== FIM DA LÓGICA PURA DE AUDITORIA WCAG';
const MARCA_LEGENDAS_INICIO = '=== INÍCIO DA LÓGICA PURA DE LEGENDAS';
const MARCA_LEGENDAS_FIM = '=== FIM DA LÓGICA PURA DE LEGENDAS';

function trechoPuro(fonte, marcaInicio, marcaFim, msg) {
  const ini = fonte.indexOf(marcaInicio);
  const fim = fonte.indexOf(marcaFim);
  assert.ok(ini !== -1 && fim !== -1 && fim > ini, msg);
  const inicio = fonte.lastIndexOf('\n', ini) + 1;
  const fimLinha = fonte.indexOf('\n', fim) + 1;
  return fonte.slice(inicio, fimLinha);
}

const puro = (() => {
  const fontePuro = readExt('scripts/clarifica-puro.js');
  // A auditoria consome auditoriaLegendas (critério 1.2.2): a fábrica
  // extrai o bloco de LEGENDAS + o bloco de AUDITORIA na mesma função —
  // exatamente como o módulo ESM é importado pelo offscreen.
  const blocoLegendas = trechoPuro(fontePuro, MARCA_LEGENDAS_INICIO, MARCA_LEGENDAS_FIM, 'bloco de legendas delimitado em clarifica-puro.js');
  const blocoAuditoria = trechoPuro(fontePuro, MARCA_INICIO, MARCA_FIM, 'bloco puro de auditoria delimitado em clarifica-puro.js');
  const fabrica = new Function(`${blocoLegendas}\n${blocoAuditoria}\nreturn { auditarAcessibilidade, ehTextoLinkGenerico, headingsForaDeOrdem, TEXTOS_LINK_GENERICOS, auditoriaLegendas };`);
  return fabrica();
})();

// ---- 1. Lógica pura: julgamento dos critérios ----

test('auditoria: página acessível (todos os descritores corretos) → zero barreiras', () => {
  const a = puro.auditarAcessibilidade({
    htmlLang: 'pt-BR',
    imagens: [{ temAlt: true }, { temAlt: true }],
    videos: [{ temCaptions: true }, { temSubtitles: true }],
    controles: [{ tag: 'button', nome: 'Enviar' }],
    links: ['Acessibilidade digital avança no Brasil'],
    iframes: [{ temTitle: true }],
    headings: [1, 2]
  });
  assert.equal(a.totalBarreiras, 0);
  assert.equal(a.criterios, 0);
  assert.deepEqual(a.achados, []);
});

test('auditoria: cada violação gera o achado do critério certo com contagem correta', () => {
  const a = puro.auditarAcessibilidade({
    htmlLang: '',
    imagens: [{ temAlt: true }, { temAlt: false }, { temAlt: false }],
    videos: [{ temCaptions: false }],
    controles: [{ tag: 'button', nome: '' }, { tag: 'input', nome: 'Buscar' }],
    links: ['Clique aqui', 'leia mais', 'Portal de notícias'],
    iframes: [{ temTitle: false }],
    headings: [1, 4]
  });
  const porCriterio = Object.fromEntries(a.achados.map((x) => [x.criterio, x]));
  assert.equal(porCriterio['1.1.1'].contagem, 2, 'duas imagens sem alt');
  assert.equal(porCriterio['1.1.1'].chaveMensagem, 'dicaCriterio111');
  assert.equal(porCriterio['1.2.2'].contagem, 1, 'vídeo sem legendas');
  assert.equal(porCriterio['4.1.2'].contagem, 1, 'um botão sem nome');
  assert.equal(porCriterio['2.4.4'].contagem, 2, 'dois links genéricos');
  assert.equal(porCriterio['2.4.1'].contagem, 1, 'um iframe sem title');
  assert.equal(porCriterio['3.1.1'].contagem, 1, 'html sem lang');
  assert.equal(porCriterio['1.3.1'].contagem, 1, 'h1 → h4 pula nível');
  assert.equal(a.criterios, 7, 'sete critérios afetados');
  assert.equal(a.totalBarreiras, 2 + 1 + 1 + 2 + 1 + 1 + 1, 'soma das contagens');
});

test('auditoria: ehTextoLinkGenerico — lista fechada, minúscula e sem falsos positivos', () => {
  for (const t of ['Clique aqui', ' aqui ', 'LEIA MAIS', 'saiba mais', 'Read More', 'click here', 'more', 'aqui']) {
    assert.equal(puro.ehTextoLinkGenerico(t), true, `"${t}" é genérico`);
  }
  for (const t of ['Acessibilidade digital avança', 'Portal', 'Baixar o relatório (PDF)', '', null, undefined, 'clique aqui para baixar o relatório']) {
    assert.equal(puro.ehTextoLinkGenerico(t), false, `"${t}" NÃO é genérico`);
  }
});

test('auditoria: headingsForaDeOrdem — só saltos para baixo são violação', () => {
  assert.equal(puro.headingsForaDeOrdem([1, 2, 3]), false, 'sequência perfeita');
  assert.equal(puro.headingsForaDeOrdem([2, 3, 3, 2]), false, 'começar em h2 é legítimo');
  assert.equal(puro.headingsForaDeOrdem([2, 4]), true, 'h2 → h4 salta nível');
  assert.equal(puro.headingsForaDeOrdem([1, 6]), true, 'h1 → h6 salta nível');
  assert.equal(puro.headingsForaDeOrdem([1, 2, 6, 3]), true, 'salto no meio da sequência');
  assert.equal(puro.headingsForaDeOrdem([3, 2, 1]), false, 'subir níveis é permitido');
  assert.equal(puro.headingsForaDeOrdem([]), false, 'sem títulos → sem achado');
  assert.equal(puro.headingsForaDeOrdem(undefined), false, 'entrada inválida → sem achado');
});

test('auditoria: entradas nulas/vazias nunca quebram a função pura', () => {
  // null = página sem NENHUM descritor e sem lang → a única barreira
  // possível (3.1.1) ainda é relatada — leitura de estado honesta.
  const a = puro.auditarAcessibilidade(null);
  assert.equal(a.totalBarreiras, 1);
  assert.equal(a.achados[0].criterio, '3.1.1');
  const b = puro.auditarAcessibilidade({ imagens: 'não é array', controles: null });
  assert.equal(b.totalBarreiras, 1, 'htmlLang ausente ainda conta (página sem lang)');
  assert.equal(b.achados[0].criterio, '3.1.1');
  // Com lang presente e descritores inválidos: zero barreiras, sem erro.
  const c = puro.auditarAcessibilidade({ htmlLang: 'pt-BR', imagens: 42, links: null, headings: 'x' });
  assert.deepEqual(c, { achados: [], totalBarreiras: 0, criterios: 0 });
});

// ---- 2. Paridade da cópia inline no popup.js ----

test('auditoria: paridade da cópia inline no popup.js com a fonte canônica', () => {
  const popup = readExt('popup/popup.js');
  const blocoPopup = trechoPuro(popup, MARCA_INICIO, MARCA_FIM, 'bloco puro de auditoria delimitado em popup.js');
  const trechoCanonico = trechoPuro(readExt('scripts/clarifica-puro.js'), MARCA_INICIO, MARCA_FIM, 'bloco canônico presente');
  // Símbolos compartilhados presentes nos dois lados (julgamento idêntico).
  for (const funcao of ['function ehTextoLinkGenerico(texto) {', 'function headingsForaDeOrdem(niveis) {', 'function auditarAcessibilidade(descritores) {']) {
    assert.ok(blocoPopup.includes(funcao), `${funcao} presente na cópia do painel`);
    assert.ok(trechoCanonico.includes(funcao), `${funcao} presente na canônica`);
  }
  // Prova comportamental da paridade: cópia e canônica produzem o MESMO
  // resultado para o mesmo cenário. A fábrica inclui o bloco de legendas
  // (auditarAcessibilidade consome auditoriaLegendas no critério 1.2.2),
  // com o nome ajustado à cópia do painel (auditoriaLegendasPainel).
  const executar = (fonte, nomeLegenda) => {
    const fontePuro = readExt('scripts/clarifica-puro.js');
    const blocoLegendas = trechoPuro(fontePuro, '=== INÍCIO DA LÓGICA PURA DE LEGENDAS', '=== FIM DA LÓGICA PURA DE LEGENDAS', 'bloco de legendas presente');
    const legendasAjustado = nomeLegenda === 'auditoriaLegendasPainel'
      ? blocoLegendas.replace(/auditoriaLegendas/g, 'auditoriaLegendasPainel')
      : blocoLegendas;
    const fabrica = new Function(`${legendasAjustado}\n${fonte}\nreturn auditarAcessibilidade;`);
    const auditar = fabrica();
    return auditar({
      htmlLang: '',
      imagens: [{ temAlt: false }, { temAlt: true }],
      videos: [{ temCaptions: false }],
      controles: [{ tag: 'button', nome: '' }],
      links: ['clique aqui', 'Portal'],
      iframes: [{ temTitle: false }],
      headings: [1, 5]
    });
  };
  const daCanonica = executar(trechoCanonico, 'auditoriaLegendas');
  const daCopia = executar(blocoPopup, 'auditoriaLegendasPainel');
  assert.deepEqual(daCopia, daCanonica, 'cópia e canônica produzem o MESMO resultado');
});

// ---- 3. Painel real no jsdom (função injetada avaliada de verdade) ----

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

const botao = (document, mode) => document.querySelector(`.mode-btn[data-mode="${mode}"]`);
const statusDe = (document) => document.getElementById('status');

/** Captura o resultado da função injetada do painel: o stub do popup já
 * executa a função no clique (1ª execução — cria o painel); para LER o
 * resultado com a auditoria, fechamos e reabrimos pelo mesmo caminho
 * (2ª execução fecha, 3ª abre e devolve { aberto, auditoria }). */
async function resultadoDaAbertura(stub) {
  const injecao = stub.calls.executeScript.filter((c) => c.args[0] === 'painel-auditoria').pop();
  assert.ok(injecao, 'injeção do painel aconteceu');
  await injecao.func(...injecao.args); // fecha (o clique já abriu)
  return injecao.func(...injecao.args); // reabre e devolve o resultado
}

test('auditoria: painel abre na página real com dialog acessível e contagens corretas', async () => {
  const { stub, window, document } = await setup();
  // Barreiras deliberadas ADICIONADAS à página (padrão da casa: o stub
  // injeta no mesmo documento do jsdom) — a coleta real roda no DOM real.
  const main = document.querySelector('main');
  const imgBarreira = document.createElement('img');
  imgBarreira.src = 'sem-alt.png';
  main.appendChild(imgBarreira);
  const btnVazio = document.createElement('button');
  btnVazio.textContent = ' ';
  main.appendChild(btnVazio);
  const linkGenerico = document.createElement('a');
  linkGenerico.href = '/x';
  linkGenerico.textContent = 'Clique aqui';
  main.appendChild(linkGenerico);
  const frame = document.createElement('iframe');
  frame.src = '/frame';
  main.appendChild(frame);

  botao(document, 'auditoria').click();
  await sleep(30);
  const injecao = stub.calls.executeScript.find((c) => c.args[0] === 'painel-auditoria');
  assert.ok(injecao, 'injeção do painel aconteceu');
  // As dicas/rotulos chegam JÁ TRADUZIDAS (padrão da casa)
  assert.equal(injecao.args[1].dicas.dicaCriterio111, mensagemPT('dicaCriterio111'));
  assert.equal(injecao.args[1].rotulos.titulo, mensagemPT('painelTitulo'));

  // Executa a função injetada REAL no jsdom e LÊ o resultado da abertura.
  const resultado = await resultadoDaAbertura(stub);
  assert.equal(resultado.aberto, true, 'painel aberto');
  assert.equal(resultado.auditoria.totalBarreiras, 4, 'img sem alt + botão sem nome + link genérico + iframe sem title');
  assert.equal(resultado.auditoria.criterios, 4);
  const painel = document.getElementById('clarifica-painel-auditoria');
  assert.ok(painel, 'painel presente no DOM da página');
  assert.equal(painel.getAttribute('role'), 'dialog', 'role dialog');
  assert.equal(painel.getAttribute('aria-modal'), 'false', 'dialog NÃO modal');
  assert.equal(painel.getAttribute('aria-label'), mensagemPT('painelTitulo'), 'rótulo acessível do dialog');
  const listaTexto = painel.querySelector('ul').textContent;
  assert.match(listaTexto, /1\.1\.1/, 'achado de imagens listado');
  assert.match(listaTexto, /4\.1\.2/, 'achado de controles listado');
  assert.match(listaTexto, /2\.4\.4/, 'achado de links listado');
  assert.match(listaTexto, /2\.4\.1/, 'achado de iframes listado');
  assert.match(painel.querySelector('[role="status"]').textContent, /Resumo:/, 'região viva com resumo');
});

test('auditoria: tempo real — mutação externa atualiza o painel; Esc fecha; toggle fecha', async () => {
  const { stub, window, document } = await setup();
  botao(document, 'auditoria').click();
  await sleep(30);
  const primeiro = await resultadoDaAbertura(stub);
  assert.equal(primeiro.auditoria.totalBarreiras, 0, 'página sem barreiras → zero barreiras');
  assert.match(document.getElementById('clarifica-painel-auditoria').querySelector('ul').textContent, /Nenhuma barreira/, 'mensagem de página completa');

  // Tempo real: adiciona uma imagem sem alt na página (mutação EXTERNA ao
  // painel) — o debounce de 1,2 s reexecuta a auditoria.
  const img = document.createElement('img');
  img.src = 'nova.png';
  document.querySelector('main').appendChild(img);
  await sleep(1500);
  const painel = document.getElementById('clarifica-painel-auditoria');
  assert.ok(painel, 'painel segue aberto');
  assert.match(painel.querySelector('ul').textContent, /1\.1\.1/, 'achado novo apareceu SEM reabrir o painel (tempo real)');

  // Segundo clique = toggle → fecha pelo caminho real do popup (o stub
  // executa a função no clique — o painel sai do DOM). O RETORNO do
  // fechamento é comprovado re-executando: 1ª re-execução abre (o painel
  // já estava fechado pelo clique), 2ª fecha e devolve { fechado: true }.
  botao(document, 'auditoria').click();
  await sleep(30);
  assert.equal(document.getElementById('clarifica-painel-auditoria'), null, 'clique fechou o painel (toggle real)');
  const injecao2 = stub.calls.executeScript.filter((c) => c.args[0] === 'painel-auditoria').pop();
  const rAbre = await injecao2.func(...injecao2.args);
  assert.equal(rAbre.aberto, true, 're-execução abre (estado consistente)');
  const resultado2 = await injecao2.func(...injecao2.args);
  assert.equal(resultado2.fechado, true, 'segunda chamada fecha');
  assert.equal(document.getElementById('clarifica-painel-auditoria'), null, 'painel removido do DOM');

  // Reabre e fecha com Esc (teclado — WCAG 2.1.1)
  botao(document, 'auditoria').click();
  await sleep(30);
  const injecao3 = stub.calls.executeScript.filter((c) => c.args[0] === 'painel-auditoria').pop();
  await injecao3.func(...injecao3.args); // (clique abriu; re-execução fecha; próxima abre)
  await injecao3.func(...injecao3.args);
  assert.ok(document.getElementById('clarifica-painel-auditoria'), 'painel reaberto');
  const eventoEsc = new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
  document.dispatchEvent(eventoEsc);
  await sleep(10);
  assert.equal(document.getElementById('clarifica-painel-auditoria'), null, 'Esc fecha o painel (WCAG 2.1.1)');
});
