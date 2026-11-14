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
import { iniciarNavegadorComExtensao, instalarGravadorDeAnuncios, anunciosGravados } from './auxiliar.js';

let servidor;
let navegador;
let pagina;

test.beforeAll(async () => {
  // Lançamento a frio do Chromium (download recente, varredura do
  // antivírus, criação de perfil) pode exceder o teto herdado de 45 s em
  // máquinas carregadas — test.setTimeout DENTRO de beforeAll altera o
  // timeout DO HOOK (documentação oficial do Playwright), não dos testes.
  test.setTimeout(120000);
  servidor = await iniciarServidor();
  navegador = await iniciarNavegadorComExtensao();
  const aberta = await navegador.abrirPaginaDeTeste(`${servidor.url}/artigo`);
  pagina = aberta.pagina;
  // Gravador de anúncios instalado ANTES de qualquer clique: os anúncios
  // são transitórios (removidos após 3 s — popup.js) e a asserção lê o
  // registro, imune à velocidade da máquina.
  await instalarGravadorDeAnuncios(pagina);
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

    // O filtro persiste no DOM — leitura direta é segura.
    const estado = await pagina.evaluate(() => ({
      filtro: document.documentElement.style.filter
    }));
    // O anúncio é TRANSIENTE na página real (removido após 3 s —
    // popup.js): a asserção lê o REGISTRO do gravador (MutationObserver),
    // imune à velocidade da máquina — leitura do nó vivo era corrida e
    // falhava em máquinas carregadas (anúncio já removido → string vazia).
    const anuncios = await anunciosGravados(pagina);

    expect(estado.filtro).toContain('feColorMatrix');
    expect(estado.filtro).toContain('url("data:image/svg+xml');
    expect(anuncios.some((a) => a.texto.includes('Filtro de daltonismo')), 'anúncio registrado para leitor de tela (região transitiva por design)').toBe(true);
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
      pausaAnimacoes: (estilo?.textContent || '').includes('animation-play-state')
    };
  });
  // Anúncio pelo REGISTRO do gravador — o nó real é removido após 3 s
  // (popup.js) e a leitura viva era corrida em máquinas carregadas.
  const anuncios = await anunciosGravados(pagina);
  expect(estado.estiloPresente).toBe(true);
  expect(estado.pausaAnimacoes).toBe(true);
  expect(anuncios.some((a) => a.texto.includes('Perfil TEA ativado')), 'anúncio registrado para leitor de tela (região transitiva por design)').toBe(true);

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

// ---- Legendas ao vivo (v1.4.0) ----
// A captura REAL de áudio de aba é limitada no Chromium headless (e é o
// escopo do roteiro manual no TEST_REPORT). O E2E cobre o que é
// confiável em headless: o verificador WCAG 1.2.2 na página real (com e
// sem track), a resposta do toggle com feedback claro na interface e a
// desmontagem do host de legendas pelo Ctrl+Shift+X.

test('verificador WCAG 1.2.2 (v1.4.0): página real com e sem track relata contagens corretas', async () => {
  const { pagina } = await navegador.abrirPaginaDeTeste(`${servidor.url}/video`);
  await navegador.popup.locator('.mode-btn[data-mode="verificar-legendas"]').click();
  await expect(navegador.popup.locator('#status')).toContainText('Auditoria WCAG 1.2.2');
  await expect(navegador.popup.locator('#status')).toContainText('2 de 3 vídeos sem legendas',
    'captions conta como legenda; chapters não conta (função pura real na página real)');
  await pagina.close();
});

test('verificador WCAG 1.2.2 (v1.4.0): página de artigo sem vídeos informa ausência', async () => {
  const { pagina } = await navegador.abrirPaginaDeTeste(`${servidor.url}/artigo`);
  await navegador.popup.locator('.mode-btn[data-mode="verificar-legendas"]').click();
  await expect(navegador.popup.locator('#status')).toHaveText('Nenhum vídeo na página para auditar.');
  await pagina.close();
});

test('legendas ao vivo (v1.4.0): toggle responde na interface real com feedback claro e sem erros de console', async () => {
  const { pagina } = await navegador.abrirPaginaDeTeste(`${servidor.url}/video`);
  const statusPainel = navegador.popup.locator('#status');
  await navegador.popup.locator('.mode-btn[data-mode="legendas"]').click();
  // Em headless a captura pode ser aceita ou recusada — o que o recurso
  // GARANTE em qualquer máquina é feedback traduzido e estado coerente:
  // o status sai da fase transitória ("Processando..."/"Iniciando...")
  // em no máximo ~10 s (tetos de segurança da captura) e nenhum erro de
  // console aparece.
  await expect(statusPainel).not.toHaveText(/Processando\.\.\.|Iniciando legendas ao vivo\.\.\./, { timeout: 30000 });
  const status = await statusPainel.textContent();
  expect(status).toMatch(/Legendas|captura|capturar|Falha/);
  expect(navegador.erros).toEqual([]);
  // Segundo clique no toggle: caminho oposto com feedback igualmente claro.
  await navegador.popup.locator('.mode-btn[data-mode="legendas"]').click();
  await expect(statusPainel).not.toHaveText(/Processando\.\.\.|Iniciando legendas ao vivo\.\.\./, { timeout: 30000 });
  expect(await statusPainel.textContent()).toMatch(/Legendas|captura|capturar|Falha/);
  expect(navegador.erros).toEqual([]);
  await pagina.close();
});

test('reset-all (v1.4.0): desmonta track/overlay/chip de legendas e zera o host na página real', async () => {
  const { pagina } = await navegador.abrirPaginaDeTeste(`${servidor.url}/video`);
  // Estado sujo NO MUNDO ISOLADO das injeções — exatamente onde o
  // prepararLegendasNaPagina o deixa em produção (o page.evaluate do
  // Playwright vive no mundo MAIN, invisível às funções injetadas).
  await navegador.serviceWorker.evaluate(async (tabUrl) => {
    const [tab] = await chrome.tabs.query({ url: tabUrl });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (urlTeste) => {
        const video = document.querySelector('video');
        const track = document.createElement('track');
        track.kind = 'captions';
        video.appendChild(track);
        const overlay = document.createElement('div');
        overlay.id = 'clarifica-overlay-legendas';
        document.body.appendChild(overlay);
        const chip = document.createElement('div');
        chip.id = 'clarifica-chip-legendas';
        document.body.appendChild(chip);
        const estilo = document.createElement('style');
        estilo.id = 'clarifica-estilo-legendas';
        document.documentElement.appendChild(estilo);
        const anuncio = document.createElement('div');
        anuncio.id = 'clarifica-anuncio-legendas';
        document.body.appendChild(anuncio);
        window.__clarificaLegendas = { trackEl: track, sobreposicao: overlay, chip, urlVtt: urlTeste };
      },
      args: ['blob:teste-simulado']
    });
  }, `${servidor.url}/video`);

  // Espelho fiel do Ctrl+Shift+X: a ação reset-all executada no service
  // worker real (mesma via do listener de chrome.commands).
  await navegador.serviceWorker.evaluate(async (tabUrl) => {
    const [tab] = await chrome.tabs.query({ url: tabUrl });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: executarAcao,
      args: ['reset-all']
    });
  }, `${servidor.url}/video`);

  // A checagem de IDs funciona de qualquer mundo (DOM é compartilhado);
  // o host zerado só é visível no mundo isolado — confirmado pela
  // reexecução de leitura no mesmo mundo das injeções.
  const limpo = await pagina.evaluate(() => ({
    overlay: !!document.getElementById('clarifica-overlay-legendas'),
    chip: !!document.getElementById('clarifica-chip-legendas'),
    estilo: !!document.getElementById('clarifica-estilo-legendas'),
    anuncio: !!document.getElementById('clarifica-anuncio-legendas')
  }));
  expect(limpo.overlay).toBe(false);
  expect(limpo.chip).toBe(false);
  expect(limpo.estilo).toBe(false);
  expect(limpo.anuncio).toBe(false);
  const hostIsolado = await navegador.serviceWorker.evaluate(async (tabUrl) => {
    const [tab] = await chrome.tabs.query({ url: tabUrl });
    const [resultado] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.__clarificaLegendas === null || window.__clarificaLegendas === undefined
    });
    return resultado.result;
  }, `${servidor.url}/video`);
  expect(hostIsolado).toBe(true, 'host de legendas zerado no mundo das injeções');
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

// ---- Painel de auditoria WCAG em tempo real (v2.0.0) ----

test('painel de auditoria (v2.0.0): página real com barreiras relata critérios e contagens', async () => {
  const { pagina } = await navegador.abrirPaginaDeTeste(`${servidor.url}/barreiras`);
  const btnAuditoria = navegador.popup.locator('.mode-btn[data-mode="auditoria"]');
  await btnAuditoria.click();
  await expect(navegador.popup.locator('#status')).toContainText('Painel aberto na página');
  await expect(navegador.popup.locator('#status')).toContainText('5 barreira(s) em 4 critério(s)');
  await expect(btnAuditoria).toHaveAttribute('aria-pressed', 'true');

  // O painel real existe NA PÁGINA, como dialog não modal com rótulo.
  const estadoPainel = await pagina.evaluate(() => {
    const p = document.getElementById('clarifica-painel-auditoria');
    if (!p) return null;
    return {
      papel: p.getAttribute('role'),
      naoModal: p.getAttribute('aria-modal'),
      rotulo: p.getAttribute('aria-label'),
      lista: p.querySelector('ul')?.textContent || '',
      resumo: p.querySelector('[role="status"]')?.textContent || ''
    };
  });
  expect(estadoPainel).not.toBeNull();
  expect(estadoPainel.papel).toBe('dialog');
  expect(estadoPainel.naoModal).toBe('false');
  expect(estadoPainel.rotulo).toBe('Auditoria WCAG — tempo real');
  expect(estadoPainel.lista).toContain('1.1.1');
  expect(estadoPainel.lista).toContain('4.1.2');
  expect(estadoPainel.lista).toContain('2.4.4');
  expect(estadoPainel.lista).toContain('2.4.1');

  // TEMPO REAL: mutação externa (imagem sem alt adicionada) atualiza a
  // contagem sem reabrir o painel (debounce de 1,2 s do MutationObserver).
  await pagina.evaluate(() => {
    const img = document.createElement('img');
    img.src = '/imagens/cidade.svg';
    document.querySelector('main').appendChild(img);
  });
  await pagina.waitForFunction(() => {
    const p = document.getElementById('clarifica-painel-auditoria');
    return p && /6 barreira/.test(p.querySelector('[role="status"]')?.textContent || '');
  }, { timeout: 8000 });

  // Segundo clique fecha o painel (toggle) e desmarca o botão.
  await btnAuditoria.click();
  await expect(navegador.popup.locator('#status')).toHaveText('Painel de auditoria fechado.');
  await expect(btnAuditoria).not.toHaveAttribute('aria-pressed');
  const removido = await pagina.evaluate(() => document.getElementById('clarifica-painel-auditoria') === null);
  expect(removido).toBe(true);
  await pagina.close();
});

test('painel de auditoria (v2.0.0): página limpa relata zero barreiras e Esc fecha', async () => {
  // URL ÚNICA (rota não mapeada → o servidor serve o artigo limpo): a busca
  // da "aba ativa" por URL precisa achar ESTA página (o /artigo original do
  // beforeAll fica aberto em outra aba).
  const { pagina } = await navegador.abrirPaginaDeTeste(`${servidor.url}/artigo-limpo`);
  await navegador.popup.locator('.mode-btn[data-mode="auditoria"]').click();
  await expect(navegador.popup.locator('#status')).toContainText('nenhuma barreira detectada');
  const limpa = await pagina.evaluate(() => {
    const p = document.getElementById('clarifica-painel-auditoria');
    return p && /Nenhuma barreira/.test(p.querySelector('ul')?.textContent || '');
  });
  expect(limpa).toBe(true);
  // Teclado: Esc fecha o dialog (WCAG 2.1.1) — o fechamento é anunciado NA
  // PÁGINA para o leitor de tela (região aria-live do produto); o popup é
  // efêmero e não reflete fechamentos externos (comportamento da v1.4.0
  // com as legendas é o mesmo).
  await instalarGravadorDeAnuncios(pagina);
  await pagina.keyboard.press('Escape');
  const fechamento = await pagina.waitForFunction(() =>
    document.getElementById('clarifica-painel-auditoria') === null
    && [...document.querySelectorAll('.clarifica-anuncio')]
      .some((a) => /Painel de auditoria WCAG fechado/.test(a.textContent || '')),
    { timeout: 5000 }).then(() => true).catch(() => false);
  expect(fechamento, 'painel removido e fechamento anunciado na página ao pressionar Esc').toBe(true);
  await pagina.close();
});

// ---- Assistente de perguntas (v2.0.0) ----

test('perguntas e respostas (v2.0.0): pergunta vazia é recusada antes de qualquer injeção', async () => {
  await navegador.abrirPaginaDeTeste(`${servidor.url}/artigo`);
  await navegador.popup.locator('.mode-btn[data-mode="perguntar"]').click();
  await expect(navegador.popup.locator('#status')).toHaveText('Digite uma pergunta antes de usar o assistente.');
  // Página com texto suficiente → nenhum erro de console
  expect(navegador.erros).toEqual([]);
});

test('IA real no navegador (v2.0.0, opt-in): QA extrativo responde a partir do texto da página', async () => {
  test.skip(!process.env.CLARIFICA_E2E_IA, 'IA real é opt-in: executar com CLARIFICA_E2E_IA=1 (baixa ~70 MB na 1ª vez)');
  await navegador.abrirPaginaDeTeste(`${servidor.url}/artigo`);
  test.setTimeout(900000);
  await navegador.popup.locator('#pergunta').fill('O que é acessibilidade digital?');
  await navegador.popup.locator('.mode-btn[data-mode="perguntar"]').click();
  await expect(navegador.popup.locator('#status')).toHaveText('Resposta encontrada na página!', { timeout: 890000 });
  const resposta = await navegador.popup.locator('#ai-output').textContent();
  expect(resposta.trim().length).toBeGreaterThan(5);
  await expect(navegador.popup.locator('#result-area')).toBeVisible();
});

// ---- Sincronização de perfis e filtros (v2.0.0) ----

test('sincronização (v2.0.0): filtro aplicado reaparece automaticamente em páginas novas', async () => {
  // Aba A: aplica o filtro de tritanopia pelo popup (fluxo real).
  await navegador.abrirPaginaDeTeste(`${servidor.url}/artigo`);
  await navegador.popup.locator('.mode-btn[data-mode="tritanopia"]').click();
  await expect(navegador.popup.locator('#status')).toContainText('Filtro de daltonismo ativado');

  // Navegação nova (onUpdated status complete): o service worker reaplica
  // o estado salvo NA página recém-carregada — sem clique nenhum.
  const nova = await navegador.abrirPaginaDeTeste(`${servidor.url}/video`);
  await nova.pagina.waitForFunction(() =>
    (document.documentElement.style.filter || '').includes('feColorMatrix'), { timeout: 15000 });
  const filtro = await nova.pagina.evaluate(() => document.documentElement.style.filter);
  expect(filtro).toContain('feColorMatrix');
  await nova.pagina.close();

  // A opção desligada interrompe a sincronização (controle do usuário).
  await navegador.serviceWorker.evaluate(() => chrome.storage.local.set({ sincronizacaoAtiva: false }));
  const outra = await navegador.abrirPaginaDeTeste(`${servidor.url}/pagina-curta`);
  await outra.pagina.waitForTimeout(2500);
  const filtroDesligado = await outra.pagina.evaluate(() => document.documentElement.style.filter || '');
  expect(filtroDesligado).toBe('');
  await navegador.serviceWorker.evaluate(() => chrome.storage.local.set({ sincronizacaoAtiva: true }));
  await outra.pagina.close();
});
