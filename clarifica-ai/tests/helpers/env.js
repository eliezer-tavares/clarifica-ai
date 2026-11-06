// Helpers compartilhados da suíte de testes do Clarifica.ai.
// Fornece DOM simulado (jsdom), stub da API chrome:// (incluindo i18n
// com as mensagens REAIS de _locales/pt_BR e storage.local com estado),
// Web Worker falso, cálculo de contraste WCAG e utilidades de tempo.

const path = require('node:path');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

// Raiz do projeto da extensão (pasta acima de tests/)
const ROOT = path.resolve(__dirname, '..', '..');
const ext = (...p) => path.join(ROOT, ...p);
const readExt = (...p) => fs.readFileSync(ext(...p), 'utf8');

// Mensagens reais de pt_BR — os testes usam o MESMO conteúdo que o
// Chrome entrega ao usuário com o navegador em português do Brasil.
const MENSAGENS_PT = JSON.parse(readExt('_locales', 'pt_BR', 'messages.json'));

/** Resolve placeholders do chrome.i18n: "$nome$" → args[N-1] do content "$N". */
function resolverMensagem(definicao, args = []) {
  let texto = definicao.message;
  for (const [nome, ph] of Object.entries(definicao.placeholders || {})) {
    const indice = Number(String(ph.content).replace('$', '')) - 1;
    texto = texto.split(`$${nome}$`).join(args[indice] ?? '');
  }
  return texto;
}

const mensagemPT = (chave, args) => {
  const definicao = MENSAGENS_PT[chave];
  return definicao ? resolverMensagem(definicao, args) : '';
};

/** Replica a substituição de __MSG_chave__ que o Chrome faz na carga do HTML da extensão. */
function substituirI18n(html) {
  return html.replace(/__MSG_(\w+)__/g, (original, chave) => {
    const definicao = MENSAGENS_PT[chave];
    return definicao ? definicao.message : original;
  });
}

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

/** Stub da API chrome.* com registro de chamadas; executeScript roda a função injetada de verdade no jsdom.
 * opts.storageInicial pré-popula o chrome.storage.local (testes de persistência). */
function makeChromeStub(window, opts = {}) {
  const calls = { executeScript: [], commands: [], getURL: [], onChanged: [] };
  const fakeTab = { id: opts.tabId ?? 7, active: true, currentWindow: true };
  const storageStore = { ...(opts.storageInicial || {}) };

  // fetch padrão do stub: entrega as mensagens REAIS de _locales (o motor
  // de mensagens v1.1 carrega os JSON via fetch + getURL) e um corpo neutro
  // para o resto (ex.: código do worker de IA).
  const fetchPadrao = async (url) => {
    if (String(url).includes('_locales/')) {
      return { ok: true, status: 200, json: async () => MENSAGENS_PT, text: async () => JSON.stringify(MENSAGENS_PT) };
    }
    return { ok: true, status: 200, json: async () => ({}), text: async () => '' };
  };
  window.fetch = window.fetch || fetchPadrao;

  // navigator.languages: fonte primária do idioma no motor de mensagens
  // (em produção reflete a configuração do navegador do usuário).
  try {
    Object.defineProperty(window.navigator, 'languages', {
      get: () => opts.idiomasAceitos || ['pt-BR', 'pt'],
      configurable: true
    });
  } catch (e) { /* ambiente sem navigator configurável */ }

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
    // chrome.i18n: getAcceptLanguages segue o cenário do teste (padrão pt-BR,
    // como o Playwright fixa nos E2E); getMessage mantém o comportamento nativo.
    i18n: {
      getAcceptLanguages: async () => opts.idiomasAceitos || ['pt-BR', 'pt'],
      getMessage: (chave, args) => mensagemPT(chave, args)
    },
    storage: {
      onChanged: { addListener: (cb) => { calls.onChanged.push(cb); } },
      local: {
        async get(chaves) {
          if (chaves === null || chaves === undefined) return { ...storageStore };
          const padrao = Array.isArray(chaves)
            ? Object.fromEntries(chaves.map((k) => [k, undefined]))
            : chaves;
          const saida = {};
          for (const [k, padraoValor] of Object.entries(padrao)) {
            saida[k] = storageStore[k] !== undefined ? storageStore[k] : padraoValor;
          }
          return saida;
        },
        async set(obj) { Object.assign(storageStore, obj); }
      }
    }
  };
  window.chrome = chrome;
  return { chrome, calls, fakeTab, storageStore };
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
      // O worker real emite CÓDIGO de erro; o popup traduz via i18n.
      setTimeout(() => this.onmessage && this.onmessage({ data: { status: 'error', error: 'erro-resumo' } }), 5);
      return;
    }
    if (FakeWorker.mode === 'worker-imagem-erro') {
      setTimeout(() => this.onmessage && this.onmessage({ data: { type: 'error', error: 'erro-imagem' } }), 5);
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

module.exports = { makeDom, makeChromeStub, sleep, contrast, luminance, FakeWorker, readExt, ext, ROOT, mensagemPT, substituirI18n, MENSAGENS_PT };
