// Suíte: Suporte a Firefox (v2.0.0 — WebExtensions).
// O Firefox 115+ não suporta service_worker (MV3) nem as APIs de captura
// tabCapture/offscreen: o suporte é via manifest.firefox.json (MV2, event
// page) com as legendas ao vivo desativadas e os CONTROLES ocultos no
// popup (detecção por navigator.userAgent). Estrutura validada aqui:
//   1. manifest.firefox.json — MV2 íntegro e honesto;
//   2. popup.js — ocultação dos controles de legendas no Firefox e guarda
//      no fluxo (o clique não inicia captura impossível).
const test = require('node:test');
const assert = require('node:assert/strict');
const { makeDom, makeChromeStub, sleep, readExt, substituirI18n, MENSAGENS_PT } = require('./helpers/env');

const manifestFF = JSON.parse(readExt('manifest.firefox.json'));
const manifestChrome = JSON.parse(readExt('manifest.json'));
const POPUP_JS = readExt('popup/popup.js');

// ---- 1. Estrutura do manifesto MV2 ----

test('firefox: manifesto MV2 íntegro (event page, sem service worker)', () => {
  assert.equal(manifestFF.manifest_version, 2, 'MV2 — o Firefox usa event page, não service worker');
  assert.equal(manifestFF.name, 'Clarifica.ai');
  assert.equal(manifestFF.version, '2.0.0', 'versão sincronizada com a release');
  assert.deepEqual(manifestFF.background.scripts, ['background.js'], 'mesmo background, via event page');
  assert.equal(manifestFF.background.persistent, false, 'event page (não persistente)');
  assert.ok(!manifestFF.background.service_worker, 'sem service_worker no Firefox');
  assert.ok(manifestFF.browser_specific_settings.gecko.id, 'gecko id obrigatório para instalação');
  assert.match(manifestFF.browser_specific_settings.gecko.strict_min_version, /^115/, 'Firefox 115+');
  assert.equal(manifestFF.browser_action.default_popup, manifestChrome.action.default_popup, 'mesma UI do popup');
});

test('firefox: permissões mínimas — SEM tabCapture/offscreen (indisponíveis no Firefox)', () => {
  for (const p of ['activeTab', 'scripting', 'storage']) {
    assert.ok(manifestFF.permissions.includes(p), `permissão ${p} presente`);
  }
  assert.ok(!manifestFF.permissions.includes('tabCapture'), 'sem tabCapture no Firefox');
  assert.ok(!manifestFF.permissions.includes('offscreen'), 'sem offscreen no Firefox');
  // MV2: host permissions vivem dentro de permissions
  assert.ok(manifestFF.permissions.includes('<all_urls>'), 'host permissions via permissions (MV2)');
  assert.ok(!Array.isArray(manifestFF.host_permissions), 'MV2 não usa o campo host_permissions');
});

test('firefox: CSP restritiva como STRING (MV2) e recursos web acessíveis', () => {
  assert.equal(typeof manifestFF.content_security_policy, 'string', 'MV2: CSP é string, não objeto');
  assert.ok(manifestFF.content_security_policy.includes("script-src 'self'"), 'script-src restrito');
  assert.ok(manifestFF.content_security_policy.includes('wasm-unsafe-eval'), 'WASM para inferência local');
  assert.ok(!manifestFF.content_security_policy.includes('unsafe-inline'), 'sem unsafe-inline');
  assert.deepEqual(manifestFF.web_accessible_resources, ['scripts/ai-worker.js', 'vendor/*'],
    'MV2: array simples de recursos (worker + vendor)');
});

test('firefox: mesmos comandos, locales e ícone do Chrome', () => {
  assert.deepEqual(Object.keys(manifestFF.commands).sort(), Object.keys(manifestChrome.commands).sort(),
    'mesmos comandos de teclado');
  assert.equal(manifestFF.default_locale, 'pt_BR');
  assert.equal(manifestFF.icons['128'], 'assets/icon.png');
});

// ---- 2. Popup: detecção Firefox e ocultação honesta ----

async function setup(opts = {}) {
  const html = substituirI18n(readExt('popup/popup.html')).replace('<script type="module" src="popup.js"></script>', '');
  const dom = makeDom(html, 'chrome-extension://clarifica-ai/popup/popup.html');
  const stub = makeChromeStub(dom.window, opts);
  if (opts.userAgent) {
    Object.defineProperty(dom.window.navigator, 'userAgent', { get: () => opts.userAgent, configurable: true });
  }
  await sleep(10);
  dom.window.fetch = async (url) => {
    if (String(url).includes('_locales/')) {
      return { ok: true, status: 200, json: async () => MENSAGENS_PT, text: async () => JSON.stringify(MENSAGENS_PT) };
    }
    return { ok: true, status: 200, text: async () => '// código do worker (ambiente de teste)' };
  };
  dom.window.eval(readExt('popup/popup.js'));
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded', { bubbles: true }));
  const document = dom.window.document;
  await sleep(20);
  return { dom, stub, window: dom.window, document };
}

test('firefox: no Firefox os controles de legendas ficam ocultos (display none)', async () => {
  const { document } = await setup({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:115.0) Gecko/20100101 Firefox/115.0' });
  const btnLegendas = document.querySelector('.mode-btn[data-mode="legendas"]');
  assert.equal(btnLegendas.style.display, 'none', 'botão de legendas oculto');
  const seletor = document.getElementById('idioma-legendas');
  assert.equal(seletor.parentElement.style.display, 'none', 'seletor de idioma oculto');
  assert.equal(document.querySelector('.nota-legendas').style.display, 'none', 'nota de latência oculta');
  // Os demais recursos continuam visíveis
  assert.notEqual(document.querySelector('.mode-btn[data-mode="resumo"]').style.display, 'none', 'resumo visível');
  assert.notEqual(document.querySelector('.mode-btn[data-mode="auditoria"]').style.display, 'none', 'painel visível');
});

test('firefox: clique no fluxo de legendas (defesa em profundidade) não inicia captura', async () => {
  const { stub, document } = await setup({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:115.0) Gecko/20100101 Firefox/115.0' });
  const btn = document.querySelector('.mode-btn[data-mode="legendas"]');
  btn.setAttribute('aria-pressed', 'false');
  btn.click();
  await sleep(20);
  assert.equal(stub.calls.sendMessage.length, 0, 'nenhuma mensagem de captura enviada');
  assert.equal(document.getElementById('status').textContent,
    'As legendas ao vivo não são suportadas no Firefox (limitação da plataforma). Demais recursos funcionam normalmente.');
});

test('firefox: no Chrome os controles de legendas permanecem visíveis (regressão zero)', async () => {
  const { document } = await setup({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36' });
  const btnLegendas = document.querySelector('.mode-btn[data-mode="legendas"]');
  assert.notEqual(btnLegendas.style.display, 'none', 'botão visível no Chrome');
  assert.notEqual(document.getElementById('idioma-legendas').parentElement.style.display, 'none', 'seletor visível');
});
