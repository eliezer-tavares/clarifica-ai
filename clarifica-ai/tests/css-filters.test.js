// Suíte: filtros de daltonismo — validação matemática das matrizes
// feColorMatrix (20 valores, linhas RGB somam 1, canal alfa preservado)
// e integridade do CSS do popup.
const test = require('node:test');
const assert = require('node:assert/strict');
const { readExt } = require('./helpers/env');

const popupJs = readExt('popup/popup.js');
const css = readExt('popup/popup.css');

// Extrai as 3 matrizes de popup.js na ordem: protanopia, deuteranopia, tritanopia.
// As linhas da matriz são separadas por espaço e as colunas por vírgula.
function extrairMatrizes() {
  return [...popupJs.matchAll(/values=\\'([^\\']+)\\'/g)].map((m) =>
    m[1].split(/[\s,]+/).filter((s) => s !== '').map((n) => parseFloat(n))
  );
}

test('filtros: 3 matrizes de daltonismo presentes no código', () => {
  const matrizes = extrairMatrizes();
  assert.equal(matrizes.length, 3, 'protanopia, deuteranopia e tritanopia');
  assert.match(popupJs, /'protanopia'/);
  assert.match(popupJs, /'deuteranopia'/);
  assert.match(popupJs, /'tritanopia'/);
});

test('filtros: cada matriz tem 20 valores (4 linhas × 5 colunas)', () => {
  for (const [i, m] of extrairMatrizes().entries()) {
    assert.equal(m.length, 20, `matriz ${i + 1} com 20 valores`);
    assert.ok(m.every((v) => Number.isFinite(v)), `matriz ${i + 1} apenas com números`);
  }
});

test('filtros: linhas R, G e B preservam a luminância (soma = 1)', () => {
  for (const [i, m] of extrairMatrizes().entries()) {
    for (let linha = 0; linha < 3; linha++) {
      const soma = m.slice(linha * 5, linha * 5 + 5).reduce((a, b) => a + b, 0);
      assert.ok(Math.abs(soma - 1) < 0.001, `matriz ${i + 1}, linha ${linha + 1} soma ${soma.toFixed(3)} (esperado 1.000)`);
    }
  }
});

test('filtros: canal alfa preservado (última linha = 0 0 0 1 0)', () => {
  for (const [i, m] of extrairMatrizes().entries()) {
    const alfa = m.slice(15);
    assert.deepEqual(alfa, [0, 0, 0, 1, 0], `matriz ${i + 1} mantém transparência`);
  }
});

test('filtros: matrizes não são identidade e são distintas entre si', () => {
  const [p, d, t] = extrairMatrizes();
  const identidade = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];
  assert.notDeepEqual(p, identidade);
  assert.notDeepEqual(d, identidade);
  assert.notDeepEqual(t, identidade);
  assert.notDeepEqual(p, d);
  assert.notDeepEqual(p, t);
  assert.notDeepEqual(d, t);
});

test('filtros: simulação — protanopia reduz a percepção de vermelho puro', () => {
  // vermelho puro (1,0,0) deve virar um tom com R reduzido e G/B aumentados
  const p = extrairMatrizes()[0];
  const saida = [p[0], p[1], p[2]]; // R,G,B resultantes para entrada vermelha
  assert.ok(saida[0] < 0.99, 'vermelho percebido diminui');
  assert.ok(saida[1] > 0.2, 'verde aumenta (confusão típica de protanopia)');
});

test('filtros: aplicação limpa o filtro anterior antes de aplicar o novo', () => {
  const trecho = popupJs.match(/if \(acao\.startsWith\('daltonismo-'\)\) \{[\s\S]*?document\.documentElement\.style\.filter = filtros\[tipo\];/);
  assert.ok(trecho, 'bloco de daltonismo localizado');
  assert.match(trecho[0], /style\.filter = ''/, 'reset do filtro anterior dentro do bloco');
});

test('css: variáveis de tema e classes essenciais presentes', () => {
  assert.match(css, /--primary:\s*#2563eb/);
  assert.match(css, /--bg:\s*#ffffff/);
  assert.match(css, /--text:\s*#0f172a/);
  assert.match(css, /\.hidden\s*\{\s*display:\s*none/);
  assert.match(css, /\.status-bar/);
  assert.match(css, /\.mode-btn/);
  assert.match(css, /\.output-box/);
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
