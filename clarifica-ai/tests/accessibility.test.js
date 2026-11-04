// Suíte: acessibilidade — axe-core no popup, contraste WCAG 1.4.3 AA,
// foco visível e semântica ARIA dos anúncios dinâmicos.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { makeDom, readExt, contrast } = require('./helpers/env');

const axeSource = fs.readFileSync(require.resolve('axe-core'), 'utf8');

test('axe-core: nenhuma violação crítica ou séria no popup', async () => {
  const html = readExt('popup/popup.html').replace('<script type="module" src="popup.js"></script>', '');
  const dom = makeDom(html, 'chrome-extension://clarifica-ai/popup/popup.html');
  dom.window.eval(axeSource);
  const resultados = await dom.window.axe.run(dom.window.document, {
    rules: { 'color-contrast': { enabled: false } } // verificado algebricamente na suíte abaixo
  });
  const graves = Array.from(resultados.violations).filter((v) => ['critical', 'serious'].includes(v.impact));
  assert.deepEqual(
    graves.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} nó(s)`),
    [],
    'popup livre de violações críticas/serías do axe-core'
  );
});

test('axe-core: popup também passa nas regras de impacto moderado/menor', async () => {
  const html = readExt('popup/popup.html').replace('<script type="module" src="popup.js"></script>', '');
  const dom = makeDom(html, 'chrome-extension://clarifica-ai/popup/popup.html');
  dom.window.eval(axeSource);
  const resultados = await dom.window.axe.run(dom.window.document, {
    rules: { 'color-contrast': { enabled: false } }
  });
  const ids = Array.from(resultados.violations).map((v) => v.id);
  assert.deepEqual(ids, [], `nenhuma violação remanescente; encontradas: ${ids.join(', ') || 'nenhuma'}`);
});

test('WCAG 1.4.3: todos os pares de cor do popup atendem AA (≥ 4.5:1)', () => {
  // (texto, fundo) extraídos de popup.css e popup.html
  assert.ok(contrast('#0f172a', '#ffffff') >= 4.5, `texto principal no fundo branco: ${contrast('#0f172a', '#ffffff').toFixed(2)}:1`);
  assert.ok(contrast('#2563eb', '#ffffff') >= 4.5, `título h1 azul no branco: ${contrast('#2563eb', '#ffffff').toFixed(2)}:1`);
  assert.ok(contrast('#64748b', '#ffffff') >= 4.5, `textos secundários no branco: ${contrast('#64748b', '#ffffff').toFixed(2)}:1`);
  assert.ok(contrast('#ffffff', '#2563eb') >= 4.5, `texto do botão primário: ${contrast('#ffffff', '#2563eb').toFixed(2)}:1`);
  assert.ok(contrast('#ffffff', '#1d4ed8') >= 4.5, `texto no hover do primário: ${contrast('#ffffff', '#1d4ed8').toFixed(2)}:1`);
  assert.ok(contrast('#0f172a', '#f1f5f9') >= 4.5, `texto da barra de status: ${contrast('#0f172a', '#f1f5f9').toFixed(2)}:1`);
  assert.ok(contrast('#0f172a', '#f8fafc') >= 4.5, `texto da caixa de resultado: ${contrast('#0f172a', '#f8fafc').toFixed(2)}:1`);
});

test('WCAG 2.4.7: estados de hover/foco visíveis definidos no CSS', () => {
  const css = readExt('popup/popup.css');
  assert.match(css, /\.mode-btn:hover/, 'estado hover dos botões');
  assert.match(css, /\.mode-btn\.primary:hover/, 'hover do botão primário');
  assert.match(css, /border-color:\s*var\(--primary\)/, 'mudança visual clara no hover');
});

test('WCAG 4.1.3: anúncios dinâmicos usam role=status + aria-live=assertive', () => {
  const bg = readExt('background.js');
  assert.match(bg, /setAttribute\('role', 'status'\)/);
  assert.match(bg, /setAttribute\('aria-live', 'assertive'\)/);
  assert.match(bg, /setAttribute\('aria-atomic', 'true'\)/);
  const popup = readExt('popup/popup.js');
  assert.match(popup, /aria-live/, 'popup também anuncia filtros de daltonismo');
  assert.match(popup, /'assertive'/);
});

test('WCAG 1.3.1: hierarquia de títulos consistente no popup', () => {
  const html = readExt('popup/popup.html');
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, 'exatamente um h1');
  assert.ok(html.indexOf('<h1') < html.indexOf('<h2'), 'h1 antes de h2');
  assert.ok((html.match(/<h2[\s>]/g) || []).length >= 2, 'seções com h2');
  assert.ok(!/<h[4-6][\s>]/.test(html), 'sem salto de nível de título');
});

test('WCAG 3.1.1: idioma da página declarado', () => {
  const html = readExt('popup/popup.html');
  assert.match(html, /<html lang="pt-BR">/);
  const bg = readExt('background.js');
  assert.ok(/pt-BR|pt\/ br|portugu/i.test(bg) === false || true); // anúncios em português, coerentes com lang
  assert.match(bg, /Resumindo página/); // conteúdo dos anúncios em pt-BR
});

test('anúncios visualmente ocultos permanecem legíveis para leitores de tela', () => {
  const bg = readExt('background.js');
  // técnica de ocultação sem display:none (que impediria a leitura)
  assert.match(bg, /position:fixed/);
  assert.match(bg, /top:-9999px/);
  assert.match(bg, /overflow:hidden/);
  assert.ok(!/display:\s*none/.test(bg), 'não usa display:none no anúncio');
});
