// E2E — Fluxos acionados pelo POPUP da extensão em página real.
//
// Cada clique em botão do popup dispara o fluxo real do popup.js:
// chrome.tabs.query → chrome.scripting.executeScript → manipulação do
// DOM de uma página HTTP de verdade. O que se verifica no final é o
// estado REAL da página alvo (ARIA, filtros, foco, anúncios).
//
// Única adaptação documentada: a resolução da "aba ativa" aponta para a
// página de teste (ver auxiliar.js). Execução de script, permissões,
// protocolo de mensagens e DOM são integralmente reais.

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

test('Modo Leitura Essencial: silencia ruído, marca conteúdo principal e move o foco — na página real', async () => {
  await navegador.popup.locator('.mode-btn[data-mode="leitura"]').click();
  await expect(navegador.popup.locator('#status')).toHaveText('Modo Leitura Essencial ativado!');

  const estado = await pagina.evaluate(() => ({
    navOculta: document.querySelector('nav')?.getAttribute('aria-hidden'),
    navInerte: document.querySelector('nav')?.hasAttribute('inert'),
    propagandaOculta: document.querySelector('.ads')?.getAttribute('aria-hidden'),
    lateralOculta: document.querySelector('aside')?.getAttribute('aria-hidden'),
    papelPrincipal: document.querySelector('main')?.getAttribute('role'),
    foco: document.activeElement?.tagName
  }));

  expect(estado.navOculta).toBe('true');
  expect(estado.navInerte).toBe(true);
  expect(estado.propagandaOculta).toBe('true');
  expect(estado.lateralOculta).toBe('true');
  expect(estado.papelPrincipal).toBe('main');
  expect(estado.foco).toBe('MAIN');
});

for (const filtro of ['protanopia', 'deuteranopia', 'tritanopia']) {
  test(`filtro de daltonismo ${filtro}: feColorMatrix aplicado ao documento real com anúncio para leitor de tela`, async () => {
    await navegador.popup.locator(`.mode-btn[data-mode="${filtro}"]`).click();
    await expect(navegador.popup.locator('#status')).toContainText('Filtro de daltonismo ativado');

    const estado = await pagina.evaluate(() => ({
      filtro: document.documentElement.style.filter,
      anuncio: document.body.querySelector('[role="status"]:not(#clarifica-anuncio)')?.textContent || ''
    }));

    expect(estado.filtro).toContain('feColorMatrix');
    expect(estado.filtro).toContain('url("data:image/svg+xml');
    expect(estado.anuncio).toContain('Filtro de daltonismo');
  });
}

test('Perfil TEA (v1.2.0): pausa estímulos na página real e o segundo clique desliga', async () => {
  const btn = navegador.popup.locator('.mode-btn[data-mode="tea"]');
  await btn.click();
  await expect(navegador.popup.locator('#status')).toContainText('Perfil TEA ativado');

  const estado = await pagina.evaluate(() => {
    const estilo = document.getElementById('clarifica-perfil-tea');
    return {
      estiloPresente: !!estilo,
      pausaAnimacoes: (estilo?.textContent || '').includes('animation-play-state'),
      anuncio: [...document.querySelectorAll('[role="status"]')].some((n) => /Perfil TEA ativado/.test(n.textContent || ''))
    };
  });
  expect(estado.estiloPresente).toBe(true);
  expect(estado.pausaAnimacoes).toBe(true);
  expect(estado.anuncio).toBe(true);

  // Toggle: clicar de novo desliga e restaura a página.
  await btn.click();
  await expect(navegador.popup.locator('#status')).toHaveText('Perfil desligado.');
  const limpo = await pagina.evaluate(() => !!document.getElementById('clarifica-perfil-tea'));
  expect(limpo).toBe(false);
});

test('Perfil Dislexia (v1.2.0): aplica tipografia de leitura e cria a régua na página real', async () => {
  const btn = navegador.popup.locator('.mode-btn[data-mode="dislexia"]');
  await btn.click();
  await expect(navegador.popup.locator('#status')).toContainText('Perfil Dislexia ativado');

  const estado = await pagina.evaluate(() => {
    const estilo = document.getElementById('clarifica-perfil-dislexia');
    return {
      espacamento: (estilo?.textContent || '').includes('letter-spacing'),
      entrelinha: (estilo?.textContent || '').includes('line-height'),
      fonteLeitura: (estilo?.textContent || '').includes('Verdana'),
      monoespacadasPreservadas: (estilo?.textContent || '').includes('monospace'),
      regua: !!document.getElementById('clarifica-regua')
    };
  });
  expect(estado.espacamento).toBe(true);
  expect(estado.entrelinha).toBe(true);
  expect(estado.fonteLeitura).toBe(true);
  expect(estado.monoespacadasPreservadas).toBe(true);
  expect(estado.regua).toBe(true);

  // A régua precisa SER VISÍVEL de verdade: um div sem regra CSS existe,
  // mas nasce com dimensão zero (bug corrigido na revisão 6). A prova no
  // Chromium real é o computed style — posição fixa, 48 px e sem capturar
  // o mouse.
  const reguaVisivel = await pagina.evaluate(() => {
    const r = document.getElementById('clarifica-regua');
    if (!r) return null;
    const cs = getComputedStyle(r);
    return { posicao: cs.position, altura: cs.height, eventos: cs.pointerEvents };
  });
  expect(reguaVisivel).toEqual({ posicao: 'fixed', altura: '48px', eventos: 'none' });

  // Trocar para outro recurso não limpa o perfil — mas o atalho de restauração sim.
  await navegador.popup.locator('.mode-btn[data-mode="tritanopia"]').click();
  await expect(navegador.popup.locator('#status')).toContainText('Filtro de daltonismo ativado');
  const reguaAposFiltro = await pagina.evaluate(() => !!document.getElementById('clarifica-regua'));
  expect(reguaAposFiltro).toBe(true);
});

test('resumo com texto insuficiente: caminho de erro real informa o usuário no popup', async () => {
  const curta = await navegador.abrirPaginaDeTeste(`${servidor.url}/pagina-curta`);
  await navegador.popup.locator('.mode-btn[data-mode="resumo"]').click();
  await expect(navegador.popup.locator('#status')).toHaveText('Texto muito curto.');
  await curta.pagina.close();
});

test('tradução (v1.3.0): sem seleção na página, o erro é claro e nenhum modelo carrega', async () => {
  // Re-aponta o alvo do popup para a página com artigo (o override da
  // página curta do teste anterior venceria por ser o último da pilha —
  // e aquela aba já foi fechada). O caminho de erro roda DENTRO da página
  // real (getSelection vazio) — determinístico e sem inferência.
  const { pagina } = await navegador.abrirPaginaDeTeste(`${servidor.url}/artigo`);
  await navegador.popup.locator('.mode-btn[data-mode="traduzir"]').click();
  await expect(navegador.popup.locator('#status')).toHaveText('Selecione um trecho na página antes de traduzir.');
  await expect(navegador.popup.locator('#result-area')).toBeHidden();
  await pagina.close();
});

// Teste de IA REAL dentro do E2E (opt-in): o worker real baixa o modelo
// (ou usa o cache do perfil) e produz um resumo de verdade dentro do
// navegador. Pesado (~300 MB na primeira vez) — ativado com
// CLARIFICA_E2E_IA=1; na suíte padrão a inferência real fica no
// ai-worker.test.js (Node) para manter o E2E rápido e determinístico.
test('IA real no navegador: botão Resumir produz resumo autêntico na página', async () => {
  test.skip(!process.env.CLARIFICA_E2E_IA, 'IA real é opt-in: executar com CLARIFICA_E2E_IA=1 (baixa ~300 MB na 1ª vez)');

  // Re-aponta o alvo do popup para a página com texto longo (o override
  // anterior, da página curta, venceria por ser o último da pilha).
  await navegador.abrirPaginaDeTeste(`${servidor.url}/artigo`);

  test.setTimeout(900000); // download do modelo + inferência
  await navegador.popup.locator('.mode-btn[data-mode="resumo"]').click();

  await expect(navegador.popup.locator('#status')).toHaveText('Concluído!', { timeout: 890000 });
  const resumo = await navegador.popup.locator('#ai-output').textContent();
  expect(resumo.trim().length).toBeGreaterThan(20);
  await expect(navegador.popup.locator('#result-area')).toBeVisible();
});
