# 📋 Relatório de Testes — Clarifica.ai v1.0.0

**Data da execução:** 27/10/2026 (revisão 4) · **Unitários:** Node.js 24 (`node --test`) com jsdom 24, axe-core 4.10 e @xenova/transformers 2.14.0 (real) · **E2E:** Playwright 1.57 + Chromium real (canal `chromium`, novo headless) com a extensão carregada unpacked

> **Revisão 4 — CI + E2E real + versionamento de modelos:** adicionada a suíte E2E em navegador real (Playwright carregando a extensão como um usuário do Modo do desenvolvedor faria), a suíte de integridade do registry de versões (`versoes-modelos.test.js`) e dois testes de regressão para o ciclo de mensagens do worker. **Os testes E2E revelaram e corrigiram dois defeitos reais que os testes em Node nunca detectariam** (detalhes na seção "Defeitos encontrados e corrigidos").

## Resultado consolidado

| Camada | Métrica | Valor |
|--------|---------|-------|
| Unitária (Node) | **Testes** | 57 |
| Unitária (Node) | **Aprovados** | ✅ 57 (100%) |
| Unitária (Node) | **Duração** | ~55 s (inclui ~50 s de inferência real de IA) |
| E2E (Chromium real) | **Testes** | 12 (11 na suíte padrão + 1 opt-in de IA real) |
| E2E (Chromium real) | **Aprovados** | ✅ 12/12 na execução completa com IA real |
| E2E (Chromium real) | **Duração** | ~10 s (padrão) / ~1,7 min (com IA real no navegador) |
| **Total geral** | **Testes aprovados** | ✅ **69/69** |

## Cobertura por suíte — camada unitária (Node)

### `manifest.test.js` — 7/7 ✅
Integridade do Manifest V3, arquivos referenciados existentes, ícone PNG 128×128 validado por cabeçalho binário, 4 atalhos de teclado válidos, permissões mínimas (3), CSP restritiva sem `unsafe-inline`, `web_accessible_resources` do worker, autoria e versão mínima do Chrome.

### `background.test.js` — 10/10 ✅
Registro do listener de comandos, disparo de anúncio + ação para os 4 atalhos (2 injeções cada), comando desconhecido ignorado sem erro, anúncio com `role="status"` + `aria-live="assertive"` + `aria-atomic` (WCAG 4.1.3), substituição e auto-remoção do anúncio, mensagens específicas por ação, Modo Leitura Essencial (silenciamento de 6 tipos de ruído + foco no conteúdo + limpeza de filtro), `reset-all` completo, `TRIGGER_ACTION` via `postMessage` para resumo/imagens e ausência de `postMessage` em leitura/reset.

### `popup.test.js` — 14/14 ✅
Estrutura com 7 botões nativos focáveis, Modo Leitura Essencial de ponta a ponta, aplicação real das 3 matrizes de daltonismo no `documentElement`, recusa de textos curtos, resumo com o Worker substituído por stub de mensagens (URL, limite de 3000 caracteres, encerramento, exibição em região ARIA), falha do worker, botão Fechar, descrição de imagens (processa apenas imagens sem `alt`/genéricas, aplica `aria-label` e contorno) e falha de injeção. **Novos na revisão 4:** resumo com a sequência REAL de progresso do worker (`loading` → `processing` → `success`) — o resultado só é exibido na mensagem final e o worker não é encerrado no primeiro sinal de vida; e o status de erro emitido pelo próprio worker é mostrado ao usuário. (A inferência real é exercitada em `ai-worker.test.js`.)

### `accessibility.test.js` — 8/8 ✅ (testes de acessibilidade)
**axe-core:** zero violações críticas, sérias, moderadas e menores no popup (regra `color-contrast` desativada por ser calculada algebricamente). **Contraste WCAG 1.4.3:** os 7 pares de cor do popup atendem AA ≥ 4.5:1. **WCAG 2.4.7:** estados de hover/foco visíveis. **WCAG 4.1.3:** anúncios dinâmicos com `role=status` + `aria-live=assertive`. **WCAG 1.3.1:** hierarquia h1→h2 sem saltos. **WCAG 3.1.1:** `lang="pt-BR"` declarado. Anúncios ocultos sem `display:none` (permanecem legíveis por leitores de tela).

### `css-filters.test.js` — 10/10 ✅
3 matrizes `feColorMatrix` com 20 valores cada, linhas R/G/B somando exatamente 1 (preservação de luminância), canal alfa `0 0 0 1 0`, matrizes distintas e não-identidade, simulação espectral (protanopia reduz percepção de vermelho puro), limpeza do filtro anterior, variáveis de tema, caixa de resultado rolável e cores dos indicadores dos botões.

### `ai-worker.test.js` — 5/5 ✅ (inferência de IA REAL)
O código de `scripts/ai-worker.js` é executado de verdade em Node com a **Transformers.js oficial 2.14.0** (mesma versão carregada via CDN pela extensão) e os modelos quantizados com revisão (SHA) fixada:

- **Versão real confirmada** — `env.version === '2.14.0'`, exatamente a mesma do import CDN do worker.
- **Sumarização REAL** — `Xenova/distilbart-cnn-12-6` carrega os pesos quantizados e resume um texto real (~1.300 caracteres); protocolo validado ponta a ponta (`loading` → `processing` → `success` com `summary` não vazia e mais curta que o original).
- **Reuso REAL do modelo** — a segunda inferência não recarrega o modelo (nenhuma mensagem `loading`).
- **Descrição REAL de imagem** — `Xenova/vit-gpt2-image-captioning` descreve uma fotografia real servida por URL http, devolvendo `type=image-description` com descrição substantiva e `imageUrl` correto.
- **Mensagens desconhecidas** são ignoradas sem quebrar o worker.
- **Cache em `tests/.cache`** (fora de `node_modules`): sobrevive a `npm ci` e é reaproveitado pelo CI e pelo script de pré-baixa.

### `versoes-modelos.test.js` — 3/3 ✅ (novo na revisão 4)
Integridade do registry de versões ([`VERSOES_MODELOS.md`](../VERSOES_MODELOS.md)): bloco JSON válido com revisões (SHA de 40 dígitos) para os dois modelos; `ai-worker.js` carrega exatamente o CDN e as revisões fixadas do registry; pré-baixa (`setup/preparar_modelos_ia.mjs`), devDependency e chave de cache do CI (`ci.yml`) permanecem sincronizados. **Este teste provou seu valor na prática:** detectou que a devDependency `^2.14.0` (caret) resolveu para 2.17.2 num `npm install` novo, divergindo do CDN fixado — o CI teria validado uma versão diferente da que o usuário executa.

## Cobertura — camada E2E (Chromium real, Playwright)

A extensão é carregada unpacked num Chromium real (contexto persistente, `--load-extension`), o service worker MV3 é aguardado e os fluxos são exercitados contra uma página HTTP local real. Única adaptação: nos fluxos do **popup**, a resolução da "aba ativa" (`chrome.tabs.query`) é direcionada à página de teste — as chamadas `chrome.scripting.executeScript`, as permissões e o DOM são 100% reais. Os fluxos de **atalhos de teclado** (service worker) não usam adaptação alguma.

### `e2e/carregamento.spec.js` — 2/2 ✅
O Chrome aceita o manifest e registra o service worker MV3 (`background.js`); o popup abre como página real com 6 botões, barra de status `role=status`/`aria-live=polite` e **zero erros de console**.

### `e2e/popup.spec.js` — 6/6 ✅ (1 opt-in incluído)
Cliques reais nos botões do popup aplicam, numa página HTTP real: Modo Leitura Essencial (`aria-hidden` + `inert` em nav/propaganda/lateral, `role=main`, foco programático no `<main>`); os 3 filtros de daltonismo (`feColorMatrix` via CSS filter real no `documentElement` + anúncio `role=status` na página); o caminho de erro do resumo ("Texto muito curto."); e, **opt-in** (`CLARIFICA_E2E_IA=1`), inferência de IA REAL dentro do navegador — o worker em módulo ES carrega o modelo `distilbart-cnn-12-6` (revisão fixada) em WASM e o popup exibe "Concluído!" com o resumo autêntico (~90 s na máquina de referência).

### `e2e/service-worker.spec.js` — 4/4 ✅
Espelho fiel do listener de `chrome.commands`: o par de injeções `anunciarAcao` + `executarAcao` é disparado **do service worker real** contra a página real — anúncio `aria-live=assertive` com o texto correto + Leitura Essencial aplicada; `TRIGGER_ACTION` publicado na página para o fluxo de resumo; restauração completa (`reset-all`) verificada contra estado sujo (filtro + aria-hidden + inert); e robustez com ação desconhecida.

## Defeitos reais encontrados e corrigidos (revisão 4)

Os dois primeiros só eram detectáveis em navegador real — os stubs de Node os mascaravam:

1. **Worker de IA nunca era criado em páginas web (SecurityError).** `new Worker(chrome.runtime.getURL(...))` a partir de uma página http(s) é bloqueado pelo Chrome mesmo com o recurso em `web_accessible_resources`. Além disso, o `ai-worker.js` usa `import` do CDN (sintaxe de módulo ES) e era criado como worker clássico. **Correção:** o código do worker é buscado via `fetch` e o Worker é criado a partir de um Blob URL com `{ type: 'module' }`, com revogação do Blob ao encerrar e degradação graciosa do cache quando a origem não é segura (`useBrowserCache = typeof caches !== 'undefined'`).
2. **Rejeição silenciosa virava falso "Concluído!".** Quando a função injetada rejeita, `chrome.scripting.executeScript` devolve `result: null` (não propaga o erro); o popup exibia "Concluído!" com saída vazia. **Correção:** todo resultado é validado (`summary` presente, `success` presente) e o resumo só resolve na mensagem `success`/`error` do worker — nunca no primeiro sinal de vida.
3. **Versão flutuante da Transformers.js** — `^2.14.0` resolveu para 2.17.2 em instalação nova, divergindo do CDN. **Correção:** devDependency fixada em `2.14.0` exato + `package-lock.json` versionado + teste de consistência + cache do CI chaveado pelos SHAs dos modelos.

## Escopo e limitações

- **Stub de mensagens apenas na UI do popup (unitária):** em `popup.test.js` o Worker é substituído por um stub controlado; a inferência real do worker é exercitada por `ai-worker.test.js` (Node) e pelo E2E opt-in (navegador).
- **Disparo de atalhos:** o Chrome automatizado não dispara `chrome.commands` sinteticamente; o E2E invoca o mesmo par de injeções do listener dentro do service worker real.
- **IA real no E2E é opt-in** (`CLARIFICA_E2E_IA=1`) para manter a suíte padrão rápida e determinística no CI; na pipeline, a inferência real fica no job unitário com os pesos cacheados.
- **Adaptação de ambiente documentada:** em Node, `env.useBrowserCache` é desativado e o cache vai para `tests/.cache` (mesma adaptação documentada na revisão 3); no navegador, o worker mantém o cache do navegador em contextos seguros.
