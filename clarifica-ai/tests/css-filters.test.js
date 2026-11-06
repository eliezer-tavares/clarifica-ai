// Suíte: filtros de daltonismo — validação matemática das matrizes
// feColorMatrix (20 valores, linhas RGB somam 1, canal alfa preservado),
// da NOVA interpolação de intensidade (v1.1.0) e do CSS com temas
// claro/escuro do popup.
const test = require('node:test');
const assert = require('node:assert/strict');
const { readExt } = require('./helpers/env');

const popupJs = readExt('popup/popup.js');
const css = readExt('popup/popup.css');

// A lógica pura de filtros (matrizes, interpolação e formatação) vive
// entre marcadores explícitos no popup.js para ser exercitada em Node
// sem DOM e sem chrome.* — o MESMO código que roda no navegador.
const MARCA_INICIO = '=== INÍCIO DA LÓGICA PURA DE FILTROS';
const MARCA_FIM = '=== FIM DA LÓGICA PURA DE FILTROS';

function carregarLogicaPura() {
  const marcaInicio = popupJs.indexOf(MARCA_INICIO);
  const marcaFim = popupJs.indexOf(MARCA_FIM);
  assert.ok(marcaInicio !== -1 && marcaFim !== -1 && marcaFim > marcaInicio, 'bloco de lógica pura delimitado em popup.js');
  // Recua ao começo da LINHA do marcador de abertura (o marcador vive em
  // um comentário — sem isso o trecho começaria no meio da linha) e vai
  // até o fim da linha do marcador de fechamento.
  const inicio = popupJs.lastIndexOf('\n', marcaInicio) + 1;
  const fim = popupJs.indexOf('\n', marcaFim) + 1;
  const trecho = popupJs.slice(inicio, fim);
  const fabrica = new Function(`${trecho}\nreturn { MATRIZES_DALTONISMO, matrizComIntensidade, formatarValoresMatriz, filtroDaltonismoCss };`);
  return fabrica();
}

const { MATRIZES_DALTONISMO, matrizComIntensidade, formatarValoresMatriz, filtroDaltonismoCss } = carregarLogicaPura();
const TIPOS = ['protanopia', 'deuteranopia', 'tritanopia'];
const IDENTIDADE = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];

test('filtros: 3 matrizes de daltonismo presentes na lógica pura', () => {
  assert.deepEqual(Object.keys(MATRIZES_DALTONISMO).sort(), TIPOS.sort());
  for (const tipo of TIPOS) assert.equal(MATRIZES_DALTONISMO[tipo].length, 20, `${tipo}: 20 valores`);
});

test('filtros: cada matriz tem 20 valores numéricos finitos', () => {
  for (const tipo of TIPOS) {
    assert.equal(MATRIZES_DALTONISMO[tipo].length, 20);
    assert.ok(MATRIZES_DALTONISMO[tipo].every((v) => Number.isFinite(v)));
  }
});

test('filtros: linhas R, G e B preservam a luminância (soma = 1) e o alfa é intocado', () => {
  for (const tipo of TIPOS) {
    const m = MATRIZES_DALTONISMO[tipo];
    for (let linha = 0; linha < 3; linha++) {
      const soma = m.slice(linha * 5, linha * 5 + 5).reduce((a, b) => a + b, 0);
      assert.ok(Math.abs(soma - 1) < 0.001, `${tipo}, linha ${linha + 1} soma ${soma.toFixed(3)} (esperado 1.000)`);
    }
    assert.deepEqual(m.slice(15), [0, 0, 0, 1, 0], `${tipo}: alfa 0 0 0 1 0`);
  }
});

test('filtros: matrizes não são identidade e são distintas entre si', () => {
  const [p, d, t] = TIPOS.map((k) => MATRIZES_DALTONISMO[k]);
  for (const m of [p, d, t]) assert.notDeepEqual(m, IDENTIDADE);
  assert.notDeepEqual(p, d);
  assert.notDeepEqual(p, t);
  assert.notDeepEqual(d, t);
});

test('filtros: simulação — protanopia reduz a percepção de vermelho puro', () => {
  const p = MATRIZES_DALTONISMO.protanopia;
  const saida = [p[0], p[1], p[2]]; // R,G,B resultantes para entrada vermelha
  assert.ok(saida[0] < 0.99, 'vermelho percebido diminui');
  assert.ok(saida[1] > 0.2, 'verde aumenta (confusão típica de protanopia)');
});

test('intensidade 100 devolve a matriz de referência e 0 devolve a identidade', () => {
  for (const tipo of TIPOS) {
    const original = MATRIZES_DALTONISMO[tipo];
    const cheia = matrizComIntensidade(original, 100);
    cheia.forEach((v, i) => assert.ok(Math.abs(v - original[i]) < 1e-9, `${tipo} @100 célula ${i}`));
    const nula = matrizComIntensidade(original, 0);
    nula.forEach((v, i) => assert.ok(Math.abs(v - IDENTIDADE[i]) < 1e-9, `${tipo} @0 célula ${i}`));
  }
});

test('intensidade: interpolação exata em 50% (protanopia célula R = 0.7835)', () => {
  const meia = matrizComIntensidade(MATRIZES_DALTONISMO.protanopia, 50);
  const esperado = 0.5 * MATRIZES_DALTONISMO.protanopia[0] + 0.5 * 1;
  assert.ok(Math.abs(meia[0] - esperado) < 1e-9, `célula [0] = ${meia[0]} (esperado ${esperado})`);
  const esperadoVerde = 0.5 * MATRIZES_DALTONISMO.protanopia[1] + 0.5 * 0;
  assert.ok(Math.abs(meia[1] - esperadoVerde) < 1e-9);
});

test('intensidade: qualquer valor preserva soma das linhas RGB = 1 e alfa intocado', () => {
  for (const intensidade of [0, 25, 50, 75, 100, -10, 200]) {
    for (const tipo of TIPOS) {
      const m = matrizComIntensidade(MATRIZES_DALTONISMO[tipo], intensidade);
      assert.equal(m.length, 20);
      for (let linha = 0; linha < 3; linha++) {
        const soma = m.slice(linha * 5, linha * 5 + 5).reduce((a, b) => a + b, 0);
        assert.ok(Math.abs(soma - 1) < 1e-9, `${tipo} @${intensidade}, linha ${linha + 1} soma ${soma}`);
      }
      assert.deepEqual(m.slice(15), [0, 0, 0, 1, 0], `${tipo} @${intensidade}: alfa preservado`);
    }
  }
});

test('intensidade: valores fora de 0–100 são saturados (sem matriz invertida/negativa)', () => {
  const saturada = matrizComIntensidade(MATRIZES_DALTONISMO.protanopia, -10);
  saturada.forEach((v, i) => assert.ok(Math.abs(v - IDENTIDADE[i]) < 1e-9, 'negativa satura em identidade'));
  const acima = matrizComIntensidade(MATRIZES_DALTONISMO.protanopia, 250);
  acima.forEach((v, i) => assert.ok(Math.abs(v - MATRIZES_DALTONISMO.protanopia[i]) < 1e-9, 'acima de 100 satura na matriz cheia'));
});

test('formatarValoresMatriz: 20 números em 4 grupos de 5, vírgulas entre colunas', () => {
  const texto = formatarValoresMatriz(MATRIZES_DALTONISMO.protanopia);
  const numeros = texto.split(/[\s,]+/).filter((s) => s !== '').map(parseFloat);
  assert.equal(numeros.length, 20);
  assert.ok(numeros.every((n) => Number.isFinite(n)));
  // Separadores de LINHA são os espaços que NÃO seguem vírgula: exatamente 3
  assert.equal((texto.match(/(?<!,)\s/g) || []).length, 3, '3 quebras de linha dentro da matriz');
  assert.ok(!/,(\s*,)+/.test(texto), 'sem vírgulas duplicadas');
});

test('filtroDaltonismoCss: data URI com feColorMatrix, intensidade aplicada e tipo inválido seguro', () => {
  const cheio = filtroDaltonismoCss('protanopia', 100);
  assert.match(cheio, /data:image\/svg\+xml/);
  assert.match(cheio, /feColorMatrix/);
  assert.match(cheio, /0\.567/);
  assert.match(cheio, /^url\(".*"\)$/);

  const nulo = filtroDaltonismoCss('protanopia', 0);
  assert.match(nulo, /1, 0, 0, 0, 0 0, 1, 0, 0, 0 0, 0, 1, 0, 0 0, 0, 0, 1, 0/, 'intensidade 0 = identidade');

  assert.equal(filtroDaltonismoCss('inexistente', 50), '', 'tipo desconhecido devolve filtro vazio');
});

test('popup: aplicação limpa o filtro anterior antes de aplicar o novo', () => {
  const trecho = popupJs.match(/if \(acao\.startsWith\('daltonismo-'\)\) \{[\s\S]*?document\.documentElement\.style\.filter = \(extras && extras\.cssFilter\)/);
  assert.ok(trecho, 'bloco de daltonismo localizado');
  assert.match(trecho[0], /style\.filter = ''/, 'reset do filtro anterior dentro do bloco');
});

test('css: variáveis de tema claro e escuro, ciclo automático e classes novas', () => {
  // Tema claro (padrão) — cores contratadas permanecem
  assert.match(css, /--primary:\s*#2563eb/);
  assert.match(css, /--bg:\s*#ffffff/);
  assert.match(css, /--text:\s*#0f172a/);
  // Tema automático segue o sistema
  assert.match(css, /@media \(prefers-color-scheme: dark\)/);
  assert.match(css, /:root:not\(\[data-tema="claro"\]\):not\(\[data-tema="escuro"\]\)/);
  // Tema escuro fixado pelo usuário
  assert.match(css, /:root\[data-tema="escuro"\]/);
  // Elementos da v1.1
  assert.match(css, /\.hidden\s*\{\s*display:\s*none/);
  assert.match(css, /\.status-bar/);
  assert.match(css, /\.mode-btn/);
  assert.match(css, /\.output-box/);
  assert.match(css, /\.slider-row/);
  assert.match(css, /\.tema-btn/);
  assert.match(css, /\.mode-btn\.dalton\.ativo/);
});

test('css: caixa de resultado rolável (conteúdo longo não estoura o popup)', () => {
  const bloco = css.match(/\.output-box\s*\{[^}]+\}/)[0];
  assert.match(bloco, /overflow-y:\s*auto/);
  assert.match(bloco, /max-height:\s*200px/);
});

test('css: cores dos indicadores de daltonismo nos botões', () => {
  assert.match(css, /\.mode-btn\.dalton\[data-mode="protanopia"\]\s*\{\s*border-left-color:\s*#ef4444/);
  assert.match(css, /\.mode-btn\.dalton\[data-mode="deuteranopia"\]\s*\{\s*border-left-color:\s*#22c55e/);
  assert.match(css, /\.mode-btn\.dalton\[data-mode="tritanopia"\]\s*\{\s*border-left-color:\s*#3b82f6/);
});
