// Lançamento do Chromium REAL com a extensão Clarifica.ai carregada
// (unpacked) — o mesmo procedimento de um usuário no "Modo do
// desenvolvedor", automatizado pelo Playwright.
//
// Requisitos atendidos por esta configuração:
//   - context persistente: exigência do Chrome para carregar extensões;
//   - channel 'chromium': headless moderno (novo headless), que suporta
//     extensões — o E2E roda sem display no CI;
//   - service worker MV3 aguardado antes de qualquer interação.
//
// Única adaptação de teste: quando um fluxo do POPUP precisa saber qual
// é a "aba ativa" (chrome.tabs.query), o alvo é resolvido para a página
// de teste real carregada no mesmo navegador; todas as chamadas
// seguintes (chrome.scripting.executeScript) e o DOM são 100% reais.
// O fluxo dos ATALHOS DE TECLADO (service worker) não precisa de
// adaptação alguma.

'use strict';
const { chromium } = require('@playwright/test');
const path = require('node:path');

// tests/e2e/auxiliar.js → dois níveis acima = raiz do Clarifica.ai
const RAIZ_EXTENSAO = path.resolve(__dirname, '..', '..');

async function iniciarNavegadorComExtensao() {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    // pt-BR fixado: os textos da interface são resolvidos por chrome.i18n
    // (default_locale pt_BR) — os asserts E2E cobrem o idioma do usuário
    // brasileiro, determinístico em qualquer máquina de CI.
    locale: 'pt-BR',
    args: [
      `--disable-extensions-except=${RAIZ_EXTENSAO}`,
      `--load-extension=${RAIZ_EXTENSAO}`,
      '--no-first-run',
      '--no-default-browser-check'
    ]
  });

  const [sw] = context.serviceWorkers();
  const serviceWorker = sw || await context.waitForEvent('serviceworker', { timeout: 20000 });

  // Semeia o idioma do teste no chrome.storage: o service worker resolve o
  // idioma pelo storage publicado pelo popup (navigator.languages e as APIs
  // de locale não são confiáveis no SW do Chromium headless) — adaptação de
  // teste da mesma família da resolução da "aba ativa", documentada no
  // TEST_REPORT.md. Em produção o popup publica o idioma real do usuário.
  await serviceWorker.evaluate(() => chrome.storage.local.set({ idioma: 'pt_BR' }));
  await new Promise((r) => setTimeout(r, 200)); // onChanged do SW re-carrega as mensagens

  const idExtensao = serviceWorker.url().match(/chrome-extension:\/\/([^/]+)\//)[1];
  const urlPopup = `chrome-extension://${idExtensao}/popup/popup.html`;

  // Abre o popup como aba real (o Chrome não permite âncora de popup em
  // contexto automatizado; a página é exatamente a mesma que o popup).
  const popup = await context.newPage();
  await popup.goto(urlPopup);

  const erros = [];
  popup.on('pageerror', (e) => erros.push(String(e)));
  popup.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });

  // Resolve a aba de teste REAL para os fluxos do popup (ver nota acima).
  // addInitScript só vigora na próxima navegação — o popup é recarregado
  // para que o redirecionamento do alvo entre em vigor. Chamadas
  // sucessivas empilham scripts; o último override vence.
  async function abrirPaginaDeTeste(url) {
    const pagina = await context.newPage();
    await pagina.goto(url);
    const tabId = await serviceWorker.evaluate(async (u) => {
      const [tab] = await chrome.tabs.query({ url: u });
      return tab ? tab.id : null;
    }, url);
    await popup.addInitScript((id) => {
      chrome.tabs.query = async () => [{ id, active: true, currentWindow: true }];
    }, tabId);
    await popup.reload();
    return { pagina, tabId };
  }

  return { context, serviceWorker, idExtensao, urlPopup, popup, erros, abrirPaginaDeTeste };
}

module.exports = { RAIZ_EXTENSAO, iniciarNavegadorComExtensao };
