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
  // Lançamento a frio do Chromium (download recente, varredura do
  // antivírus, criação de perfil) pode exceder o teto herdado de 45 s em
  // máquinas carregadas — test.setTimeout DENTRO de beforeAll altera o
  // timeout DO HOOK (documentação oficial do Playwright), não dos testes.
  test.setTimeout(120000);
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

test('popup abre como página real: 15 botões, barra de status aria-live e zero erros de console', async () => {
  const { popup } = navegador;

  await expect(popup.locator('.mode-btn')).toHaveCount(15);

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

  // Perfis neurodivergentes da v1.2.0 presentes no popup real.
  expect(rotulos.some((t) => /Perfil TEA/.test(t))).toBe(true);
  expect(rotulos.some((t) => /Perfil TDAH/.test(t))).toBe(true);
  expect(rotulos.some((t) => /Perfil Dislexia/.test(t))).toBe(true);

  // Novidades da v1.3.0 — Áudio e Multimodal — presentes no popup real.
  expect(rotulos.some((t) => /Transcrever Áudio/.test(t))).toBe(true);
  expect(rotulos.some((t) => /OCR/.test(t))).toBe(true);
  expect(rotulos.some((t) => /Traduzir Seleção/.test(t))).toBe(true);
  expect(rotulos.some((t) => /Ler em Voz Alta/.test(t))).toBe(true);
  await expect(popup.locator('.mode-btn[data-mode="voz"]')).toHaveAttribute('aria-pressed', 'false');

  // Novidades da v1.4.0 — Legendas ao Vivo — presentes no popup real:
  // toggle com aria-pressed, verificador WCAG 1.2.2 e seletor de idioma
  // com as duas tarefas do Whisper (original × inglês).
  expect(rotulos.some((t) => /Legendas ao Vivo/.test(t))).toBe(true);
  expect(rotulos.some((t) => /Verificar legendas/.test(t))).toBe(true);
  await expect(popup.locator('.mode-btn[data-mode="legendas"]')).toHaveAttribute('aria-pressed', 'false');
  const seletor = popup.locator('#idioma-legendas');
  await expect(seletor).toHaveCount(1);
  expect(await seletor.locator('option').allTextContents()).toHaveLength(2);
  await expect(seletor).toHaveValue('original');

  // Novidades da v1.1 presentes no popup real: slider de intensidade e
  // botão de tema (rotulado, i18n pt-BR aplicado pelo Chrome).
  await expect(popup.locator('#intensidade')).toHaveAttribute('type', 'range');
  await expect(popup.locator('label[for="intensidade"]')).toContainText('Intensidade');
  await expect(popup.locator('#btn-tema')).toContainText('Tema');

  // Nenhum erro de JavaScript no popup real (CSP, recursos ausentes,
  // referências quebradas aparecem aqui antes de quebrarem o usuário).
  expect(navegador.erros).toEqual([]);
});

test('vendor local (v1.1.0): Transformers.js 2.14.0 é servida pela própria extensão e importável', async () => {
  const { popup, idExtensao } = navegador;

  const resultado = await popup.evaluate(async (id) => {
    const url = chrome.runtime.getURL('vendor/transformers.min.js');
    const resposta = await fetch(url);
    if (!resposta.ok) return { ok: false, motivo: `fetch ${resposta.status}` };
    const modulo = await import(url);
    return {
      ok: true,
      versao: modulo.env?.version,
      bytes: (await resposta.arrayBuffer()).byteLength
    };
  }, idExtensao);

  expect(resultado.ok).toBe(true);
  expect(resultado.versao).toBe('2.14.0');
  expect(resultado.bytes).toBeGreaterThan(500_000);

  // E o WASM do onnxruntime também é servido localmente, sem CDN.
  const wasmOk = await popup.evaluate(async () => {
    const resposta = await fetch(chrome.runtime.getURL('vendor/ort-wasm-simd.wasm'));
    if (!resposta.ok) return false;
    const bytes = new Uint8Array(await resposta.arrayBuffer());
    return bytes[0] === 0x00 && bytes[1] === 0x61 && bytes[2] === 0x73 && bytes[3] === 0x6d; // "\0asm"
  });
  expect(wasmOk).toBe(true);

  // Nenhum erro de console durante todo o exercício do vendor.
  expect(navegador.erros).toEqual([]);
});
