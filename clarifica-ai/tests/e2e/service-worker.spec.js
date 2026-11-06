// E2E — Fluxos dos ATALHOS DE TECLADO (service worker) em página real.
//
// O listener de chrome.commands do background.js executa, para cada
// atalho, duas injeções via chrome.scripting: anunciarAcao (feedback
// aria-live para NVDA/JAWS) e executarAcao (efeito na página). Este
// teste dispara exatamente esse par de injeções a partir do service
// worker REAL da extensão — sem nenhuma adaptação de código — e
// verifica o estado resultante da página alvo.
//
// (O disparo sintático de Ctrl+Shift+L não é suportado pelo Chrome
// automatizado; a via oficial de E2E é invocar o mesmo caminho de
// injeção no contexto real do service worker.)

import { test, expect } from '@playwright/test';
import { iniciarServidor } from './servidor.js';
import { iniciarNavegadorComExtensao } from './auxiliar.js';

let servidor;
let navegador;
let pagina;

test.beforeAll(async () => {
  servidor = await iniciarServidor();
  navegador = await iniciarNavegadorComExtensao();
  const aberta = await navegador.abrirPaginaDeTeste(`${servidor.url}/artigo`);
  pagina = aberta.pagina;
});

test.afterAll(async () => {
  await navegador?.context.close();
  await servidor?.fechar();
});

// Espelho fiel do listener de chrome.commands.onCommand (background.js):
// o par de injeções recebe o CÓDIGO da ação e a MENSAGEM já resolvida pelo
// motor de mensagens do service worker (dicionário de _locales), exatamente
// como o listener real repassa para anunciarAcao.
async function acionarAtalhoNoServiceWorker(acao) {
  await navegador.serviceWorker.evaluate(async (nomeAcao) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: anunciarAcao,
      args: [nomeAcao, mensagemParaLeitor(nomeAcao)]
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: executarAcao,
      args: [nomeAcao]
    });
  }, acao);
}

test('atalho Ctrl+Shift+L: anúncio aria-live assertivo + Leitura Essencial na página real', async () => {
  await pagina.bringToFront();
  await acionarAtalhoNoServiceWorker('apply-leitura-essencial');

  const estado = await pagina.evaluate(() => ({
    anuncio: {
      texto: document.getElementById('clarifica-anuncio')?.textContent || '',
      papel: document.getElementById('clarifica-anuncio')?.getAttribute('role'),
      vivo: document.getElementById('clarifica-anuncio')?.getAttribute('aria-live')
    },
    navOculta: document.querySelector('nav')?.getAttribute('aria-hidden'),
    navInerte: document.querySelector('nav')?.hasAttribute('inert'),
    foco: document.activeElement?.tagName
  }));

  expect(estado.anuncio.texto).toBe('Clarifica.ai: Modo Leitura Essencial ativado. Ruídos silenciados.');
  expect(estado.anuncio.papel).toBe('status');
  expect(estado.anuncio.vivo).toBe('assertive');
  expect(estado.navOculta).toBe('true');
  expect(estado.navInerte).toBe(true);
  expect(estado.foco).toBe('MAIN');
});

test('atalho Ctrl+Shift+R: publica TRIGGER_ACTION na página para o fluxo de resumo', async () => {
  await pagina.evaluate(() => {
    window.__clarificaMensagens = [];
    window.addEventListener('message', (e) => window.__clarificaMensagens.push(e.data));
  });
  await pagina.bringToFront();
  await acionarAtalhoNoServiceWorker('summarize');

  const recebidas = await pagina.evaluate(() => window.__clarificaMensagens);
  const acionamento = recebidas.find((m) => m && m.type === 'TRIGGER_ACTION');
  expect(acionamento).toBeTruthy();
  expect(acionamento.action).toBe('summarize');
});

test('atalho Ctrl+Shift+X: restaura a página ao estado original de verdade', async () => {
  await pagina.bringToFront();

  // Estado sujo: Leitura Essencial + filtro de daltonismo aplicados.
  await acionarAtalhoNoServiceWorker('apply-leitura-essencial');
  await navegador.popup.locator('.mode-btn[data-mode="deuteranopia"]').click();
  const sujo = await pagina.evaluate(() => ({
    filtro: document.documentElement.style.filter,
    algumOculto: !!document.querySelector('[aria-hidden="true"]')
  }));
  expect(sujo.filtro).toContain('feColorMatrix');
  expect(sujo.algumOculto).toBe(true);

  // Restauração pelo atalho real.
  await acionarAtalhoNoServiceWorker('reset-all');

  const limpo = await pagina.evaluate(() => ({
    filtro: document.documentElement.style.filter,
    ocultos: document.querySelectorAll('[aria-hidden="true"]').length,
    inertes: document.querySelectorAll('[inert]').length,
    estiloClarifica: !!document.getElementById('clarifica-style'),
    resumoClarifica: !!document.getElementById('clarifica-resumo')
  }));

  expect(limpo.filtro).toBe('');
  expect(limpo.ocultos).toBe(0);
  expect(limpo.inertes).toBe(0);
  expect(limpo.estiloClarifica).toBe(false);
  expect(limpo.resumoClarifica).toBe(false);
});

test('executarAcao com ação desconhecida não altera a página (robustez do service worker)', async () => {
  await pagina.bringToFront();
  await navegador.serviceWorker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: executarAcao,
      args: ['acao-inexistente']
    });
  });

  const estado = await pagina.evaluate(() => ({
    ocultos: document.querySelectorAll('[aria-hidden="true"]').length,
    filtro: document.documentElement.style.filter
  }));
  expect(estado.ocultos).toBe(0);
  expect(estado.filtro).toBe('');
});
