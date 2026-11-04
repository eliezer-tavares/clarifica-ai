// Helpers compartilhados da suíte de testes do Clarifica.ai.
// Fornece DOM simulado (jsdom), stub da API chrome://, Web Worker falso,
// cálculo de contraste WCAG e utilidades de tempo.

const path = require('node:path');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

// Raiz do projeto da extensão (pasta acima de tests/)
const ROOT = path.resolve(__dirname, '..', '..');
const ext = (...p) => path.join(ROOT, ...p);
const readExt = (...p) => fs.readFileSync(ext(...p), 'utf8');

/** Cria um JSDOM com temporizadores acelerados e polyfill de innerText. */
function makeDom(html = '<!DOCTYPE html><html lang="pt-BR"><body></body></html>', url = 'https://pagina-de-teste.exemplo/') {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url, pretendToBeVisual: true });
  const { window } = dom;

  // Encurta temporizadores para manter a suíte rápida
  const realSetTimeout = window.setTimeout.bind(window);
  window.setTimeout = (fn, ms, ...rest) => realSetTimeout(fn, Math.min(ms ?? 0, 25), ...rest);

  // Garante innerText mesmo em versões do jsdom sem suporte completo
  const desc = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, 'innerText');
  if (!desc || !desc.get) {
    Object.defineProperty(window.HTMLElement.prototype, 'innerText', {
      get() { return this.textContent; },
      configurable: true
    });
  }
  return dom;
}

/** Stub da API chrome.* com registro de chamadas; executeScript roda a função injetada de verdade no jsdom. */
function makeChromeStub(window, opts = {}) {
  const calls = { executeScript: [], commands: [], getURL: [] };
  const fakeTab = { id: opts.tabId ?? 7, active: true, currentWindow: true };
  const chrome = {
    runtime: {
      getURL: (p) => { calls.getURL.push(p); return `chrome-extension://clarifica-ai/${p}`; }
    },
    tabs: { query: async () => [fakeTab] },
    scripting: {
      executeScript: async (details) => {
        calls.executeScript.push(details);
        const result = await details.func(...(details.args || []));
        return [{ result }];
      }
    },
    commands: {
      onCommand: { addListener: (cb) => { calls.commands.push(cb); } }
    },
    storage: { local: { get: async () => ({}), set: async () => {} } }
  };
  window.chrome = chrome;
  return { chrome, calls, fakeTab };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- Cálculo de contraste (WCAG 2.1, fórmula oficial) ----
function srgbToLinear(c) {
  c /= 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function luminance(hex) {
  const v = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}
function contrast(h1, h2) {
  const l1 = luminance(h1);
  const l2 = luminance(h2);
  const [a, b] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (a + 0.05) / (b + 0.05);
}

/** Web Worker falso que responde como o ai-worker.js real responderia. */
class FakeWorker {
  constructor(url) {
    this.url = url;
    this.terminated = false;
    this.received = [];
    FakeWorker.instances.push(this);
  }
  postMessage(msg) {
    this.received.push(msg);
    if (FakeWorker.mode === 'error') {
      setTimeout(() => this.onerror && this.onerror(new Error('falha simulada')), 5);
      return;
    }
    // Reproduz a sequência REAL do ai-worker.js: progresso ("loading",
    // "processing") antes do resultado final — para travar regressões
    // onde o popup resolvesse a Promise na primeira mensagem.
    if (FakeWorker.mode === 'sequence') {
      setTimeout(() => this.onmessage && this.onmessage({ data: { status: 'loading', message: 'Carregando modelo...' } }), 5);
      setTimeout(() => this.onmessage && this.onmessage({ data: { status: 'processing', message: 'Analisando texto...' } }), 15);
      setTimeout(() => this.onmessage && this.onmessage({ data: { status: 'success', summary: 'RESUMO-TESTE' } }), 30);
      return;
    }
    if (FakeWorker.mode === 'worker-status-error') {
      setTimeout(() => this.onmessage && this.onmessage({ data: { status: 'error', error: 'Erro ao processar texto.' } }), 5);
      return;
    }
    if (msg.type === 'summarize') {
      setTimeout(() => this.onmessage && this.onmessage({ data: { status: 'success', summary: 'RESUMO-TESTE' } }), 5);
    } else if (msg.type === 'describe-image') {
      setTimeout(() => this.onmessage && this.onmessage({ data: { type: 'image-description', description: 'DESC-' + msg.data, imageUrl: msg.data } }), 5);
    }
  }
  terminate() { this.terminated = true; }
  // Compatibilidade: popup.js registra listener para revogar o Blob URL.
  addEventListener() {}
  static reset(mode = 'ok') { FakeWorker.instances = []; FakeWorker.mode = mode; }
}
FakeWorker.instances = [];
FakeWorker.mode = 'ok';

module.exports = { makeDom, makeChromeStub, sleep, contrast, luminance, FakeWorker, readExt, ext, ROOT };
