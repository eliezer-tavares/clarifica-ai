// Configuração do Playwright para os testes E2E da extensão.
//
// workers: 1 — cada arquivo de teste lança seu próprio Chromium com a
// extensão (isolamento total entre suítes); tudo roda em série para não
// disputar perfis de navegador.
//
// headless vem de auxiliar.js (channel 'chromium', novo headless com
// suporte a extensões) — não é definido aqui para não duplicar a fonte
// de verdade.

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 45000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : [['list']],
  outputDir: 'resultados-teste'
});
