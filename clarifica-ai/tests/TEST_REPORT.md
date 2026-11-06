# 📋 Relatório de Testes — Clarifica.ai v1.1.0

**Data da execução:** 07/11/2026 (revisão 5) · **Unitários:** Node.js 24 (`node --test`) com jsdom 24, axe-core 4.10 e @xenova/transformers 2.14.0 (inferência real) · **E2E:** Playwright 1.57 + Chromium real (canal `chromium`, novo headless, locale pt-BR) com a extensão carregada unpacked

> **Revisão 5 — v1.1.0 "Estabilidade e configuração":** empacotamento local da Transformers.js em `vendor/` (eliminação total do CDN), intensidade ajustável dos filtros de daltonismo com interpolação matemática, configurações persistidas via `chrome.storage`, tema claro/escuro no popup, internacionalização pt-BR/en com motor de mensagens próprio e nova suíte `i18n.test.js`. **A IA real foi exercitada dentro do navegador** (opt-in E2E) — o worker Blob importa o bundle vendado e resume um texto autêntico, provando o caminho de produção sem CDN de ponta a ponta. Um bug latente foi corrigido (Worker "zumbi" na descrição de imagens).

## Resultado consolidado

| Camada | Métrica | Valor |
|--------|---------|-------|
| Unitária (Node) | **Testes** | 81 |
| Unitária (Node) | **Aprovados** | ✅ 81 (100%) |
| Unitária (Node) | **Duração** | ~57 s (inclui ~50 s de inferência real de IA) |
| E2E (Chromium real) | **Testes** | 13 (12 na suíte padrão + 1 opt-in de IA real) |
| E2E (Chromium real) | **Aprovados** | ✅ 13/13 na execução completa com IA real |
| E2E (Chromium real) | **Duração** | ~13 s (padrão) / ~1,7 min (com IA real no navegador) |
| **Total geral** | **Testes aprovados** | ✅ **94/94** |

## Cobertura por suíte — camada unitária (Node)

### `manifest.test.js` — 8/8 ✅
Integridade do Manifest V3, **versão 1.1.0 fixada por teste**, `default_locale` pt_BR com `_locales` pt_BR/en presentes, arquivos referenciados existentes, ícone PNG 128×128 validado por cabeçalho binário, 4 atalhos de teclado válidos, permissões mínimas (3), CSP restritiva sem `unsafe-inline`, **worker + `vendor/*` publicados como `web_accessible_resources`**, autoria e versão mínima do Chrome.

### `background.test.js` — 11/11 ✅
Registro do listener de comandos; disparo de anúncio + ação para os 4 atalhos (2 injeções cada) **com as mensagens já resolvidas pelo motor de mensagens do SW e injetadas como argumento**; comando desconhecido ignorado sem erro; `mensagemParaLeitor` caindo no anúncio genérico para ação desconhecida; anúncio com `role="status"` + `aria-live="assertive"` + `aria-atomic` (WCAG 4.1.3); substituição e auto-remoção do anúncio; mensagens específicas por ação; Modo Leitura Essencial; `reset-all` completo; `TRIGGER_ACTION` via `postMessage` para resumo/imagens e ausência de `postMessage` em leitura/reset.

### `popup.test.js` — 20/20 ✅
Estrutura com **8 botões nativos** (6 modos + fechar + tema), **slider de intensidade rotulado**, status ao vivo e região de resultado; interface renderizada em pt-BR; Modo Leitura Essencial de ponta a ponta; as 3 matrizes aplicadas ao `documentElement` com anúncio i18n e `aria-pressed`; **intensidade 50 interpolando a matriz (R = 0.783)**; **reaplicação do filtro ao soltar o slider (25% → R = 0.892)**; troca de filtro limpando o anterior; **ciclo do tema auto → claro → escuro → auto com persistência**; **configurações persistidas restauradas ao reabrir** (tema escuro + intensidade 40 + último filtro em destaque); recusa de textos curtos com código traduzido; resumo com Worker simulado (Blob, limite de 3000 caracteres, encerramento, exibição em região ARIA); progresso real (`loading` → `processing` → `success`); **códigos de erro do worker traduzidos para o idioma da interface**; falha do worker; botão Fechar; descrição de imagens (apenas sem `alt`/genéricas, `aria-label` com prefixo i18n, contorno) e **encerramento do Worker na mensagem de erro (bug do zumbi corrigido)**; falha de injeção nos três fluxos.

### `accessibility.test.js` — 10/10 ✅
**axe-core nos temas claro E escuro** (zero violações críticas, sérias, moderadas e menores; `color-contrast` desativada por ser calculada algebricamente). **Contraste WCAG 1.4.3:** os 7 pares do tema claro e os 6 pares do tema escuro atendem AA ≥ 4.5:1. WCAG 2.4.7 (hover/foco), WCAG 4.1.3 (anúncios dinâmicos), WCAG 1.3.1 (hierarquia h1→h2), WCAG 3.1.1 (`lang="pt-BR"` + anúncios pt-BR vindos de `_locales`), anúncios ocultos sem `display:none`.

### `css-filters.test.js` — 15/15 ✅
A lógica pura de filtros (delimitada em `popup.js`) é extraída e exercitada em Node sem DOM: 3 matrizes com 20 valores, luminância preservada (linhas somando 1), alfa `0 0 0 1 0`, matrizes distintas e não-identidade, simulação espectral (protanopia reduz vermelho puro); **intensidade 100 = matriz de referência e 0 = identidade; interpolação exata em 50% (R = 0.7835); propriedades preservadas para 0/25/50/75/100 e fora da faixa (saturação sem matriz negativa)**; formatação com 4 grupos de 5; data URI válido com `feColorMatrix` e tipo inválido seguro; limpeza do filtro anterior no popup; variáveis dos dois temas (claro, escuro fixo, escuro automático por `prefers-color-scheme`) e classes novas (slider, tema, filtro ativo).

### `i18n.test.js` — 6/6 ✅ (nova na revisão 5)
`default_locale` pt_BR com os dois locales como JSON válidos; **paridade total pt_BR ↔ en (mesmo conjunto de chaves)**; placeholders estruturalmente corretos (`$nome$` declarado e resolúvel via content `$N`); **toda chave citada no código/HTML existe nos dois locales**; **nenhuma chave órfã** (toda chave declarada é consumida); textos contratados preservados (anúncio de resumo, "Concluído!", "Pronto.", prefixo "Descrição por IA:").

### `ai-worker.test.js` — 5/5 ✅ (inferência de IA REAL)
O código de `scripts/ai-worker.js` é executado de verdade em Node com a **Transformers.js oficial 2.14.0** (a mesma versão vendada em `vendor/`) e os modelos quantizados com revisão (SHA) fixada:

- **Versão real confirmada** — `env.version === '2.14.0'`.
- **Sumarização REAL** — `Xenova/distilbart-cnn-12-6` carrega os pesos quantizados e resume texto real (~1.300 caracteres); protocolo validado ponta a ponta.
- **Reuso REAL do modelo** — a segunda inferência não recarrega o modelo.
- **Descrição REAL de imagem** — `Xenova/vit-gpt2-image-captioning` descreve uma fotografia real servida por URL http.
- **Mensagens desconhecidas** são ignoradas sem quebrar o worker; **o worker não referencia CDN** (biblioteca vendada) e o placeholder da biblioteca é substituído pela ponte de teste.

### `versoes-modelos.test.js` — 6/6 ✅
Registry v2 do [`VERSOES_MODELOS.md`](../VERSOES_MODELOS.md): biblioteca com `origem: pacote vendado (sem CDN)`, `arquivo_local` e os 4 binários WASM declarados; **zero referência a CDN no worker** (placeholders `__CLARIFICA_BIBLIOTECA__`/`__CLARIFICA_VENDOR_BASE__` + `wasmPaths` local); **popup injetando as URLs locais**; manifest publicando `vendor/*`; **bundle vendado presente (>500 KB, contém "2.14.0") e os 4 WASM com cabeçalho `\0asm` real**; modelos com SHA de 40 dígitos (com o campo de vigilância documentando o avanço da upstream do vit-gpt2); pré-baixa, devDependency e chave de cache do CI sincronizados.

## Cobertura — camada E2E (Chromium real, Playwright)

A extensão é carregada unpacked num Chromium real (contexto persistente, `--load-extension`, locale pt-BR), o service worker MV3 é aguardado e os fluxos são exercitados contra uma página HTTP local real. Adaptações documentadas: nos fluxos do **popup**, a resolução da "aba ativa" aponta para a página de teste; e **o idioma do teste é semeado no `chrome.storage`** (`idioma: pt_BR`) porque `navigator.languages` e as APIs de locale não são confiáveis no service worker do Chromium headless — em produção o próprio popup publica o idioma real do usuário nesse storage.

### `e2e/carregamento.spec.js` — 3/3 ✅
O Chrome aceita o manifest e registra o service worker MV3; o popup abre como página real com 6 botões, slider de intensidade rotulado, botão de tema, barra de status `role=status`/`aria-live=polite` (pt-BR) e **zero erros de console**; **o `vendor/` é servido pela própria extensão**: o bundle é importável (módulo ES, `env.version === '2.14.0'`, >500 KB) e o WASM do onnxruntime é servido com cabeçalho `\0asm` válido — sem CDN.

### `e2e/popup.spec.js` — 6/6 ✅ (1 opt-in incluído)
Cliques reais no popup aplicam, numa página HTTP real: Modo Leitura Essencial (`aria-hidden` + `inert`, `role=main`, foco programático); os 3 filtros de daltonismo (`feColorMatrix` via CSS filter real no `documentElement` + anúncio `role=status` pt-BR na página); o caminho de erro do resumo ("Texto muito curto."); e, **opt-in** (`CLARIFICA_E2E_IA=1`), **inferência de IA REAL dentro do navegador** — o worker em módulo ES criado a partir de Blob importa o bundle vendado `vendor/transformers.min.js`, os binários WASM locais, carrega o modelo `distilbart-cnn-12-6` (revisão fixada) e o popup exibe "Concluído!" com o resumo autêntico (~1,5 min na máquina de referência).

### `e2e/service-worker.spec.js` — 4/4 ✅
Espelho fiel do listener de `chrome.commands`: o par de injeções `anunciarAcao` (código da ação **+ mensagem já resolvida pelo motor de mensagens do SW**) + `executarAcao` é disparado do service worker real contra a página real — anúncio `aria-live=assertive` com o texto pt-BR correto + Leitura Essencial aplicada; `TRIGGER_ACTION` para o fluxo de resumo; restauração completa (`reset-all`) contra estado sujo (filtro + aria-hidden + inert, incluindo filtro aplicado pelo popup real); e robustez com ação desconhecida.

## Defeitos e decisões desta revisão

1. **Bug latente corrigido — Worker "zumbi" na descrição de imagens:** se o worker emitia erro durante a descrição, ninguém o encerrava (o Worker ficava vivo e o Blob, sem revogação). Agora o erro do worker encerra o Worker com limpeza, coberto por teste.
2. **Protocolo de erros entre página e popup:** erros que cruzam a fronteira `chrome.scripting` passaram a ser CÓDIGOS (`texto-curto`, `erro-resumo`, `erro-imagem`, `falha-worker`, `falha-injecao`) traduzidos no destino pelo motor de mensagens — a página injetada não tem acesso a `chrome.i18n`.
3. **Motor de mensagens próprio (pt-BR/en):** `chrome.i18n.getMessage` e `getAcceptLanguages` refletem o app-locale do processo — no Chromium headless os dois devolvem `en-US` mesmo com `--lang=pt-BR` (verificado por diagnóstico), e a substituição nativa de `__MSG__` no HTML não ocorre nesse build. A solução: o popup resolve o idioma por `navigator.languages` (confiável no popup) → `getAcceptLanguages` → fallback pt_BR, carrega os JSON de `_locales` via `fetch` local, aplica os placeholders restantes (idempotente) e **publica o idioma no `chrome.storage`**, de onde o service worker consome e re-carrega via `onChanged` — uma única fonte de verdade para os dois contextos.
4. **Substituição do CDN:** o bundle 2.14.0 vendado chega ao worker via placeholders injetados pelo popup (`chrome.runtime.getURL('vendor/transformers.min.js')` e base do `vendor/` para os WASM), mantendo a criação via Blob (necessária por causa do SecurityError documentado na revisão 4) e sem código remoto.

## Escopo e limitações

- **Stub de mensagens apenas na UI do popup (unitária):** em `popup.test.js` o Worker é substituído por um stub controlado; a inferência real do worker é exercitada por `ai-worker.test.js` (Node) e pelo E2E opt-in (navegador).
- **Disparo de atalhos:** o Chrome automatizado não dispara `chrome.commands` sinteticamente; o E2E invoca o mesmo par de injeções do listener dentro do service worker real.
- **IA real no E2E é opt-in** (`CLARIFICA_E2E_IA=1`) para manter a suíte padrão rápida e determinística no CI; na pipeline, a inferência real fica no job unitário com os pesos cacheados.
- **Adaptações de ambiente documentadas:** em Node, `env.useBrowserCache` é desativado com cache em `tests/.cache`; nos E2E, o idioma é semeado no `chrome.storage` (o popup o publica em produção).
