// E2E — Carregamento da extensão no Chrome real.
//
// Verifica o primeiro momento de verdade de qualquer extensão: o Chrome
// aceita o manifest, registra o service worker MV3 e o popup abre sem
// nenhum erro de console. Falhas aqui significam extensão quebrada para
// o usuário final, antes mesmo de qualquer funcionalidade.

import { test, expect } from '@playwright/test';
import { iniciarServidor } from './servidor.js';
import { iniciarNavegadorComExtensao } from './auxiliar.js';

let servidor;
let navegador;

test.beforeAll(async () => {
  servidor = await iniciarServidor();
  navegador = await iniciarNavegadorComExtensao();
});

test.afterAll(async () => {
  await navegador?.context.close();
  await servidor?.fechar();
});

test('manifest aceito pelo Chrome real: service worker MV3 registrado', async () => {
  const url = navegador.serviceWorker.url();
  expect(url).toMatch(/^chrome-extension:\/\//);
  expect(url).toMatch(/\/background\.js$/);
});

test('popup abre como página real: 6 botões, barra de status aria-live e zero erros de console', async () => {
  const { popup } = navegador;

  await expect(popup.locator('.mode-btn')).toHaveCount(6);

  const status = popup.locator('#status');
  await expect(status).toHaveAttribute('role', 'status');
  await expect(status).toHaveAttribute('aria-live', 'polite');
  await expect(status).toContainText('Pronto');

  // Botões navegáveis e rotulados — a porta de entrada do usuário de
  // leitor de tela precisa existir de verdade, não só no jsdom.
  const rotulos = await popup.locator('.mode-btn').allTextContents();
  expect(rotulos.some((t) => t.includes('Leitura Essencial'))).toBe(true);
  expect(rotulos.some((t) => t.includes('Resumir'))).toBe(true);
  expect(rotulos.some((t) => t.includes('Imagens'))).toBe(true);
  expect(rotulos.filter((t) => /Protanopia|Deuteranopia|Tritanopia/.test(t))).toHaveLength(3);

  // Nenhum erro de JavaScript no popup real (CSP, recursos ausentes,
  // referências quebradas aparecem aqui antes de quebrarem o usuário).
  expect(navegador.erros).toEqual([]);
});
