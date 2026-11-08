# 📋 Relatório de Testes — Clarifica.ai v1.2.0

**Data da execução:** 08/11/2026 (revisão 7) · **Unitários:** Node.js 24 (`node --test`) com jsdom 24, axe-core 4.10 e @xenova/transformers 2.14.0 (inferência real) · **E2E:** Playwright 1.57 + Chromium real (canal `chromium`, novo headless, locale pt-BR) com a extensão carregada unpacked

> **Revisão 7 — v1.2.0 (bateria de revisão):** defeito revelado por uma execução em máquina real (Windows com NVDA): ao trocar de filtro de daltonismo (ou de perfil), o anúncio anterior da página **não era removido** — regiões `aria-live="assertive"` ficavam empilhadas até expirar o temporizador de 3 s, e o leitor de tela podia re-ler anúncios antigos. O teste da troca de filtro, por sua vez, tinha uma corrida com o próprio temporizador de auto-remoção no ambiente de temporizadores acelerados (passava em máquinas rápidas e falhava `0 !== 1` em máquinas lentas). Correção em duas frentes: (1) **produto** — `manipularPagina` agora remove o anúncio anterior ao inserir o novo (`anunciarNaPagina`, um anúncio por vez, mesma conduta já adotada pelo service worker no `background.js`); (2) **teste** — captura atômica dos anúncios (o nó é congelado na mesma avaliação do estado válido) e **prova síncrona da limpeza**: a função injetada aplicada duas vezes em sequência deixa exatamente um anúncio — determinística, sem depender de temporizador. Validado em três execuções unitárias completas (94/94 cada), cinco rodadas de estresse das suítes de DOM (32/32 cada) e prova de regressão nos dois sentidos (com a correção passa; com a linha de limpeza removida, o teste falha de novo).
>
> **Revisão 6 — v1.2.0 "Perfis neurodivergentes" (roadmap cumprido):** três perfis prontos, exclusivos e toggláveis — **TEA** (pausa de animações/transições/rolagem suave, GIFs animados convertidos em quadro estático via canvas com degradação graciosa, remoção de sombras e blur sem tocar no filtro de daltonismo do `html`), **TDAH** (holofote ao redor do cursor por variáveis CSS + navegação progressiva de leitura com `Alt+↓/↑`) e **Dislexia** (espaçamento de letras/palavras/linhas, fonte de leitura do sistema com código monoespaçado preservado e régua de leitura). Nenhuma IA nova, nenhuma permissão nova, **registry de versões inalterado** (registry_versao 2 — os perfis são CSS/DOM/JS nativos). Nova suíte `perfis.test.js` (12 testes) e o `reset-all` do service worker espelha a limpeza dos perfis (paridade por teste). **Dois bugs reais foram encontrados e corrigidos:** (1) o popup marcava o perfil como ativo (e persistia a escolha) mesmo quando a injeção na página falhava — agora a interface só reflete o estado que realmente aconteceu; (2) a régua de leitura da dislexia era criada e movida, mas nenhuma regra CSS lhe dava aparência (dimensão zero, invisível) — agora o perfil emite a faixa fixa de 48 px, com paridade assegurada da lógica pura ao Chromium real.

## Resultado consolidado

| Camada | Métrica | Valor |
|--------|---------|-------|
| Unitária (Node) | **Testes** | 94 |
| Unitária (Node) | **Aprovados** | ✅ 94 (100%) |
| Unitária (Node) | **Duração** | ~59 s (com o cache de modelos aquecido; a 1ª execução baixa os pesos) |
| E2E (Chromium real) | **Testes** | 14 na suíte padrão (15 com o opt-in de IA real) |
| E2E (Chromium real) | **Aprovados** | ✅ 14/14 na suíte padrão |
| E2E (Chromium real) | **Duração** | ~23 s (padrão) |
| **Total geral** | **Testes aprovados** | ✅ **108/108** |

## Cobertura por suíte — camada unitária (Node)

### `manifest.test.js` — 8/8 ✅
Integridade do Manifest V3, **versão 1.2.0 fixada por teste**, `default_locale` pt_BR com `_locales` pt_BR/en presentes, arquivos referenciados existentes, ícone PNG 128×128 validado por cabeçalho binário, 4 atalhos de teclado válidos (os perfis são acionados pelo popup — nenhum atalho novo para não colidir), permissões mínimas (3 — nenhuma nova na v1.2.0), CSP restritiva sem `unsafe-inline`, worker + `vendor/*` publicados como `web_accessible_resources`, autoria e versão mínima do Chrome.

### `background.test.js` — 12/12 ✅
Registro do listener de comandos; disparo de anúncio + ação para os 4 atalhos (2 injeções cada) com as mensagens já resolvidas pelo motor de mensagens do SW; comando desconhecido ignorado; anúncios `aria-live` (WCAG 4.1.3); Modo Leitura Essencial; `reset-all` completo; **`reset-all` também desmonta os Perfis Neurodivergentes (novo na v1.2.0): estilos dos três perfis, holofote, régua, destaque de leitura, GIFs restaurados no lugar dos canvas, listeners de limpeza executados e índice de bloco zerado**; `TRIGGER_ACTION` para resumo/imagens e ausência de `postMessage` em leitura/reset.

### `popup.test.js` — 20/20 ✅
Estrutura com **11 botões nativos** (9 modos — 6 originais + 3 perfis — + fechar + tema), slider de intensidade rotulado, status ao vivo e região de resultado; interface pt-BR; Modo Leitura Essencial; as 3 matrizes com anúncio i18n e `aria-pressed`; intensidade interpolada (50% → R = 0.783); reaplicação ao soltar o slider (25% → R = 0.892); **troca de filtro com prova síncrona de que o anúncio anterior é removido no ato (um anúncio por vez) e captura atômica do estado final — determinística mesmo em máquinas lentas (corrida eliminada na revisão 7)**; ciclo do tema com persistência; configurações restauradas ao reabrir; recusa de textos curtos; resumo e descrição de imagens ponta a ponta (Worker simulado, protocolo real de progresso, códigos de erro traduzidos); falha de injeção nos três fluxos.

### `perfis.test.js` — 12/12 ✅ (nova na revisão 6)
**Lógica pura** (extraída por marcadores, sem DOM): o CSS do TEA pausa animações (`animation-play-state: paused` — congeladas, não puladas) e desliga sombras/blur **com o `documentElement` excluído** para não apagar o filtro de daltonismo; o CSS do TDAH declara o holofote por `radial-gradient` com `--clarifica-x/y`, `pointer-events: none` e a classe de destaque de leitura; o CSS da dislexia aplica espaçamentos, linha 1.8 e fonte de leitura do sistema, **com a regra de restauração monoespaçada declarada por último** (indentação de código é significativa) **e a régua com regra visual completa** (`position: fixed`, `height: 48px`, `pointer-events: none`, bordas — asserções que fecham o bug da régua invisível); perfil desconhecido não gera CSS. **Fluxos no popup:** os 3 botões rotulados; aplicar o TEA injeta o CSS pronto + anúncio traduzido, confirma no status, marca `aria-pressed` e persiste `perfilAtivo`; trocar para o TDAH desmonta o TEA na página e monta o holofote que segue o mouse (`--clarifica-x: 123px` após `mousemove` + `requestAnimationFrame`); **navegação progressiva `Alt+↓/Alt+↑` destaca exatamente um bloco por vez, ignora parágrafos vazios e exige Alt**; a dislexia aplica a tipografia e a régua acompanha o cursor (24 px acima), com a regra visual da régua verificada no style injetado; clicar de novo no perfil ativo desliga tudo e limpa o storage; reabrir com perfil salvo restaura o destaque; **falha de injeção não marca o perfil como ativo (bug corrigido nesta revisão)**. **Estado na página:** style por id, anúncio `aria-live` assertivo com auto-remoção, e **fallback sem canvas**: no jsdom (sem `canvas` instalado) o TEA não quebra e o GIF original permanece no DOM.

### `accessibility.test.js` — 10/10 ✅
axe-core nos temas claro E escuro (zero violações críticas/sérias/moderadas/menores; `color-contrast` desativada por ser calculada algebricamente); contraste WCAG 1.4.3 AA nos 7 pares do tema claro e 6 do escuro; WCAG 2.4.7 (hover/foco), 4.1.3 (anúncios), 1.3.1 (hierarquia), 3.1.1 (`lang`) e anúncios ocultos sem `display:none`.

### `css-filters.test.js` — 15/15 ✅
A lógica pura de filtros exercitada em Node: 3 matrizes com 20 valores, luminância preservada, alfa intacto; interpolação de intensidade exata (0/25/50/75/100 e fora da faixa); formatação e data URI; limpeza do filtro anterior; variáveis dos dois temas e classes do popup.

### `i18n.test.js` — 6/6 ✅
`default_locale` pt_BR com os dois locales válidos (**39 → 49 chaves com as 10 novas dos perfis, em paridade total**); placeholders estruturalmente corretos; toda chave citada no código/HTML existe nos dois idiomas; nenhuma chave órfã; textos contratados preservados.

### `ai-worker.test.js` — 5/5 ✅ (inferência de IA REAL)
O código de `scripts/ai-worker.js` executado de verdade em Node com a Transformers.js 2.14.0 (a mesma vendada) e os pesos quantizados das revisões fixadas: versão real confirmada; **sumarização real** (~26 s, DistilBART `a6c58857`); **reuso real** do modelo sem recarregar (~22 s); **descrição real de imagem** (~11 s, ViT-GPT2 `215b4edc`); mensagens desconhecidas ignoradas e zero referência a CDN. *Nota desta bateria: o `node --test` foi executado com `--test-concurrency=1` na máquina de referência (2 núcleos) — o onnxruntime nativo não compartilha bem a memória com as suítes de DOM em execução paralela em máquinas pequenas; o `npm test` do projeto e do CI permanecem inalterados.*

### `versoes-modelos.test.js` — 6/6 ✅
Registry v2 íntegro **exatamente como na v1.1.0 — a v1.2.0 não altera nenhuma versão**: biblioteca vendada (bundle 2.14.0 > 500 KB + 4 WASM com cabeçalho `\0asm`), worker sem CDN, popup injetando URLs locais, manifest publicando `vendor/*`, pré-baixa/devDependency/chave de cache do CI sincronizados.

## Cobertura — camada E2E (Chromium real, Playwright)

Extensão carregada unpacked em Chromium real (contexto persistente, locale pt-BR), service worker MV3 aguardado, página HTTP local real. Adaptações documentadas mantidas: a "aba ativa" aponta para a página de teste nos fluxos do popup, e o idioma é semeado no `chrome.storage`.

### `e2e/carregamento.spec.js` — 3/3 ✅
Manifest aceito, service worker MV3 registrado; **popup com 9 botões** (incluindo os 3 perfis com rótulos pt-BR reais do Chrome), status `aria-live`, slider e tema — **zero erros de console**; `vendor/` servido pela própria extensão (bundle 2.14.0 importável + WASM `\0asm`), sem CDN.

### `e2e/popup.spec.js` — 7/7 ✅ (suíte padrão; 8 com o opt-in)
Cliques reais no popup, efeitos verificados no DOM real da página: Leitura Essencial; 3 filtros de daltonismo com anúncio; **Perfil TEA aplicado (pausa de animações na página) e desligado pelo segundo clique (v1.2.0)**; **Perfil Dislexia aplicado (espaçamento, entrelinha, fonte de leitura, monoespaçadas preservadas e régua criada na página real, com a régua provada VISÍVEL por computed style no Chromium — `position: fixed`, `48px`, `pointer-events: none`; permanece ativo sob um filtro de cor, pois são recursos independentes — v1.2.0)**; caminho de erro do resumo; e, opt-in (`CLARIFICA_E2E_IA=1`), a inferência de IA real dentro do navegador.

### `e2e/service-worker.spec.js` — 4/4 ✅
Espelho fiel do listener de `chrome.commands` no service worker real: anúncio assertivo + Leitura Essencial; `TRIGGER_ACTION` do resumo; restauração completa (`reset-all`) contra estado sujo; robustez com ação desconhecida.

## Defeitos e decisões desta revisão

1. **Bug corrigido — perfil "ativo" sem sucesso real:** `aplicarPerfil` marcava o botão (`aria-pressed`) e persistia `perfilAtivo` mesmo quando a injeção na página falhava; a interface afirmava um estado que não aconteceu. Agora o destaque e a persistência só ocorrem com `success`, e a falha DESMARCA o perfil — coberto por teste dedicado (`perfis.test.js`, "falha de injeção").
2. **Perfis exclusivos entre si com troca limpa:** aplicar um perfil sempre desmonta o anterior (estilos, elementos, classes, GIFs restaurados e listeners) — a troca é uma única operação e re-aplicar é idempotente.
3. **TEA não pode apagar o daltonismo:** o filtro de daltonismo vive como `filter` no `documentElement`; por isso a regra de "remoção de efeitos visuais" do TEA exclui explicitamente `html` — decisão coberta pela asserção `:not(html)` na lógica pura.
4. **Degradação graciosa sem canvas:** onde `canvas.getContext('2d')` não está disponível, o TEA mantém o GIF original em vez de quebrar (verificado em jsdom sem o pacote `canvas`); no navegador real os GIFs viram quadro estático e são RESTAURADOS no reset (pares canvas → img guardados em `window`).
5. **Dislexia preserva código:** a última regra do perfil devolve `code/pre/kbd/samp/textarea/input` ao espaçamento normal e à fonte monoespaçada — indentação é significativa e o espaçamento de letras a destruiria.
6. **Registry inalterado por decisão:** os perfis não introduzem dependência de IA; `VERSOES_MODELOS.md` documenta a decisão (registry_versao permanece 2, chave de cache do CI intacta) e reserva a seção 4 para as dependências da v1.3.
7. **Bug corrigido — régua de leitura invisível:** o `div` da régua era criado, posicionado e removido, mas nenhuma regra CSS lhe dava aparência — um elemento com dimensão zero, invisível ao usuário (as suítes iniciais só verificavam existência e movimento). O `cssPerfil('dislexia')` agora emite a faixa fixa de 48 px centralizada no cursor, com `pointer-events: none`, bordas e fundo translúcidos, e `top` fora da tela até o primeiro `mousemove`. O fechamento é em três camadas: asserções da regra na lógica pura, verificação do style injetado no estado da página e **computed style no Chromium real** (`position: fixed` + `48px` + `pointer-events: none`) no E2E.
8. **Acessibilidade do canvas do TEA:** `alt` não produz efeito algum em `<canvas>` — substituir um GIF com texto alternativo por um canvas rotulado com `alt` apagaria a informação do leitor de tela. O quadro estático agora recebe `role="img"` + `aria-label` com o texto original do GIF; a restauração no reset devolve o `<img>` original, sem perda nenhuma.
9. **Bug corrigido na revisão 7 — anúncios empilhados na troca de filtro/perfil:** o caminho injetado pelo popup acumulava regiões `aria-live="assertive"` na página (cada uma vivendo 3 s) — ao trocar de filtro, o anúncio antigo continuava na árvore de acessibilidade junto do novo, e o leitor de tela podia re-ler anúncios antigos. Agora `anunciarNaPagina` (dentro de `manipularPagina`) remove o anúncio anterior antes de inserir o novo — **a mesma conduta que o `background.js` já aplicava** ao anúncio do service worker — coberta por prova síncrona determinística no teste da troca de filtro.
10. **Corrida de teste eliminada (revisão 7):** o teste da troca de filtro reconsultava os anúncios vivos depois de esperas encadeadas; com os temporizadores acelerados do ambiente (auto-remoção em 25 ms), máquinas lentas podiam chegar à contagem final com o anúncio novo já removido (`0 !== 1` — falha observada em Windows com NVDA). Os três testes que observam anúncios agora usam captura atômica (o nó é congelado na mesma avaliação do estado válido) e a limpeza é provada por duas aplicações síncronas da função injetada, sem depender de temporizador algum. Prova de regressão nos dois sentidos: com a linha de limpeza removida do produto, o teste volta a falhar.

## Escopo e limitações desta bateria

- **IA real no navegador (opt-in E2E) não executada nesta revisão local:** o worker de IA **não foi alterado** na v1.2.0 e a inferência real foi exercitada integralmente no Node (5/5) — o opt-in será exercitado naturalmente pela próxima bateria que rodar em ambiente com rede plena.
- **Rate limit do Hugging Face na 1ª execução desta bateria (HTTP 429):** o download do modelo de visão, logo após o de sumarização (~300 MB), foi temporariamente limitado pelo hub; a nova tentativa seguiu normalmente e, com o cache aquecido, as execuções seguintes não baixam nada. Em máquinas sem cache, reexecutar a suíte resolve se o hub limitar a taxa — os pesos ficam em `tests/.cache`.
- **`npm test` padrão nesta bateria:** sem `--test-concurrency=1` — as três execuções completas (94/94) correram com a concorrência padrão do `node --test`, sem interferência do onnxruntime nas suítes de DOM.
- **Stub de mensagens apenas na UI do popup (unitária):** a inferência real fica em `ai-worker.test.js` (Node) e no E2E opt-in (navegador).
- **Disparo de atalhos:** o Chrome automatizado não dispara `chrome.commands` sinteticamente; o E2E invoca o mesmo par de injeções dentro do service worker real.
- **Efeitos por visita:** como nos filtros e na Leitura Essencial, os perfis aplicam efeitos à página atual; a escolha do perfil fica persistida no popup.
