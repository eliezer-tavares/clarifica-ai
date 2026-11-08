# 🧠 Clarifica.ai

> Acessibilidade universal com Inteligência Artificial local: resumos automáticos, descrição de imagens, Modo Leitura Essencial, filtros para daltonismo e perfis neurodivergentes (TEA, TDAH, Dislexia) — direto no navegador, 100% offline.

**Licença:** Apache-2.0 · **Versão:** 1.2.0 · **Manifest:** V3 · **Navegadores:** Chrome, Edge, Brave e outros Chromium · **IA:** Edge AI (local), sem envio de dados · **CI:** testes unitários + E2E no Chromium real

**Repositório:** <https://github.com/eliezer-tavares/clarifica-ai>

![CI](https://github.com/eliezer-tavares/clarifica-ai/actions/workflows/ci.yml/badge.svg)

---

## 📖 Sobre o projeto

O Clarifica.ai é uma extensão de navegador que transforma qualquer página web em uma experiência mais clara, compreensível e inclusiva. Toda a inteligência roda no próprio dispositivo (Edge AI): os modelos de linguagem e de visão são baixados uma única vez, armazenados em cache do navegador e executados localmente, garantindo privacidade total — nenhum texto, imagem ou dado de navegação sai do computador do usuário. A extensão foi arquitetada para pessoas que utilizam leitores de tela (NVDA, JAWS), pessoas com daltonismo e qualquer pessoa que precise de menos ruído visual e cognitivo na web. Cada ação gera feedback imediato por meio de regiões `aria-live`, em conformidade com as diretrizes WCAG 2.1 e com a Lei Brasileira de Inclusão (Lei nº 13.146/2015).

## ✨ O que é possível fazer

| # | Funcionalidade | O que acontece | Como acionar |
|---|----------------|----------------|--------------|
| 1 | 📖 **Modo Leitura Essencial** | Silencia navegação, rodapés, barras laterais (`aside`), propagandas (`.ads`) e cabeçalhos por meio de `aria-hidden` + `inert`; move o foco para o conteúdo principal (`main`/`article`). Ideal para NVDA e JAWS. | `Ctrl+Shift+L` ou botão no popup |
| 2 | ✨ **Resumir texto com IA** | Extrai o texto principal da página e gera um resumo com o modelo DistilBART quantizado (int8), executado em Web Worker dedicado — a página nunca trava. O resultado aparece no popup em uma região ARIA rolável. | `Ctrl+Shift+R` ou botão no popup |
| 3 | 🖼️ **Descrever imagens** | Localiza todas as imagens sem `alt` (ou com `alt` vazio/genérico como `"image"`) e gera descrições com o modelo ViT-GPT2; aplica `alt`, `aria-label` ("Descrição por IA: …") e um contorno verde de confirmação em cada imagem processada. | `Ctrl+Shift+A` ou botão no popup |
| 4 | 🔴🟢🔵 **Filtros para daltonismo** | Aplica matrizes de correção cromática (`feColorMatrix` SVG) sobre a página inteira, com um clique e **intensidade ajustável (0–100%, interpolada matematicamente)**, para **protanopia**, **deuteranopia** e **tritanopia** (atende WCAG 1.4.1 — Uso de Cor). | Botões + controle no popup |
| 5 | ♻️ **Restaurar página** | Remove todos os efeitos aplicados: filtros de cor, silenciamento de regiões e elementos criados pela extensão. A página volta exatamente ao estado original. | `Ctrl+Shift+X` |
| 6 | 🔊 **Feedback para leitores de tela** | Cada ação injeta um anúncio `role="status"` com `aria-live="assertive"` e `aria-atomic="true"`, lido imediatamente pelo leitor de tela (WCAG 4.1.3 — Mensagens de Status). | Automático |
| 7 | 🖥️ **Popup acessível** | Barra de status ao vivo (`aria-live="polite"`), onze botões nativos navegáveis por `TAB`, controle de intensidade rotulado, área de resultado com `role="region"` e botão "Fechar". | Clique no ícone da extensão |
| 8 | 🌗 **Tema claro/escuro + configurações persistidas** | O popup acompanha o sistema (modo automático) ou fixa claro/escuro; tema, último filtro, perfil ativo e intensidade ficam persistidos via `chrome.storage` e restaurados ao reabrir (todos os pares de cor dos dois temas validados em AA). | Botão "Tema" no popup |
| 9 | 🌐 **Interface pt-BR/en** | Interface e anúncios do leitor de tela seguem o idioma do navegador (português ou inglês), com mensagens versionadas em `_locales` e auditadas por teste de paridade. | Automático |
| 10 | 🧩🎯🔤 **Perfis Neurodivergentes (v1.2.0)** | Três perfis prontos, exclusivos entre si e sem nenhuma IA/rede: **TEA** (pausa animações, transições e rolagem suave, converte GIFs animados em quadro estático via canvas e remove sombras/blur); **TDAH** (holofote que escurece a página ao redor do cursor e navegação progressiva por blocos de leitura com `Alt+↓/↑`); **Dislexia** (espaçamento de letras, palavras e linhas, fonte de leitura do sistema com código monoespaçado preservado, e régua de leitura que acompanha o mouse). Clique no perfil ativo para desligar; `Ctrl+Shift+X` também desfaz. | Botões de perfil no popup |

### O que você ganha na prática

- **Menos ruído:** páginas densas (portais de notícias, dashboards) ficam focadas apenas no conteúdo relevante.
- **Imagens compreensíveis:** fotos e gráficos sem descrição passam a ter `alt` gerado pela IA.
- **Textos mais curtos:** artigos longos viram resumos em segundos, sem copiar e colar em sites externos.
- **Cores corrigidas:** os três tipos mais comuns de daltonismo contemplados instantaneamente.
- **Web sem sobrecarga:** os perfis TEA, TDAH e Dislexia reduzem estímulos, mantêm o foco e facilitam a leitura — cada um em um clique.
- **Privacidade total:** zero servidores próprios, zero telemetria, zero cookies.

## ⚙️ Requisitos

- Navegador baseado em Chromium, versão **102 ou superior** (Chrome, Edge, Brave, Opera).
- Cerca de **600 MB** de espaço livre para os modelos de IA, baixados uma única vez na primeira execução de cada recurso (~300 MB para resumo, ~250 MB para visão).
- Conexão com a internet **apenas** no primeiro uso de cada modelo; depois, tudo funciona 100% offline.

## 📥 Instalação

1. Clone o repositório (ou baixe o ZIP pelo botão **Code → Download ZIP**):

   ```bash
   git clone https://github.com/eliezer-tavares/clarifica-ai.git
   ```

2. Abra `chrome://extensions/` no navegador.
3. Ative o **Modo do desenvolvedor** (*Developer mode*, canto superior direito).
4. Clique em **Carregar sem compactação** e selecione a pasta `clarifica-ai`.
5. (Opcional) Fixe o ícone da extensão na barra de ferramentas para acesso rápido.

## 🕹️ Como usar

**Por teclado (recomendado para leitores de tela):**

| Atalho | Ação | Feedback esperado no leitor de tela |
|--------|------|--------------------------------------|
| `Ctrl+Shift+L` | Modo Leitura Essencial | "Clarifica.ai: Modo Leitura Essencial ativado. Ruídos silenciados." |
| `Ctrl+Shift+R` | Resumir página com IA | "Clarifica.ai: Resumindo página com inteligência artificial." |
| `Ctrl+Shift+A` | Descrever imagens | "Clarifica.ai: Iniciando descrição de imagens. Aguarde." |
| `Ctrl+Shift+X` | Restaurar página original | "Clarifica.ai: Desativado. Página restaurada ao original." |

**Pelo popup:**

1. Clique no ícone do Clarifica.ai e navegue com `TAB` até o botão desejado; pressione `ENTER`.
2. Para daltonismo, escolha entre **Protanopia**, **Deuteranopia** ou **Tritanopia** — a mudança de cor é instantânea e anunciada por `aria-live`.
3. Resumos aparecem na caixa "Resultado:"; pressione "Fechar" para voltar ao estado inicial.
4. A barra de status no topo do popup informa cada etapa ("Processando...", "Concluído!", erros e avisos).
5. **Perfis Neurodivergentes:** escolha **Perfil TEA** (menos estímulos), **Perfil TDAH** (foco, com navegação de leitura por `Alt+↓/↑`) ou **Perfil Dislexia** (leitura espaçada com régua). Clicar de novo no perfil ativo desliga; os perfis são exclusivos entre si e a escolha fica memorizada para o próximo uso.
6. No perfil TDAH, mova o mouse para posicionar o holofote e use `Alt+↓`/`Alt+↑` para avançar e voltar um bloco de leitura; no perfil Dislexia, a régua acompanha o cursor para não perder a linha.

## 🏗️ Arquitetura

```text
.                            (raiz do repositório)
├── .github/
│   └── workflows/ci.yml   # CI: suíte unitária (com IA real) + E2E no Chromium
├── README.md              # Documentação completa (pt-BR) — este arquivo
├── LICENSE                # Licença Apache-2.0
└── clarifica-ai/          # Pasta carregada no Chrome ("Carregar sem compactação")
    ├── manifest.json      # Manifest V3: atalhos, permissões mínimas, CSP, ícone, default_locale
    ├── background.js      # Service Worker: comandos de teclado + anúncios ARIA (mensagens de _locales)
    ├── _locales/          # Mensagens pt-BR/en da interface (pt_BR é o default)
    │   ├── pt_BR/messages.json
    │   └── en/messages.json
    ├── popup/
    │   ├── popup.html     # UI semântica e acessível (placeholders __MSG__ do i18n)
    │   ├── popup.css      # Temas claro/escuro (AA nos dois) + slider de intensidade + perfis neurodivergentes
    │   ├── popup.js       # Orquestra injeção, filtros com intensidade, perfis neurodivergentes, tema, storage, i18n
    ├── scripts/
    │   └── ai-worker.js   # Web Worker: Transformers.js vendada (sem CDN), versões fixadas
    ├── vendor/            # Biblioteca vendada: transformers.min.js + 4 binários WASM do onnxruntime
    ├── assets/
    │   └── icon.png       # Ícone 128×128
    ├── VERSOES_MODELOS.md # Registry de versões fixadas da biblioteca e dos modelos
    └── tests/             # Suíte completa: Node (unitária + IA real) e Playwright (E2E)
```

**Fluxo técnico:** atalho de teclado → Service Worker (`chrome.commands`) → `chrome.scripting.executeScript` injeta funções na página → manipulação do DOM (ARIA, filtros, perfis) ou postMessage para o popup. A inferência de IA roda em Web Worker isolado com a biblioteca Transformers.js **vendada no próprio pacote** (`vendor/transformers.min.js` + binários WASM locais — zero CDN desde a v1.1.0) e modelos quantizados fixados por revisão (`distilbart-cnn-12-6` para sumarização, `vit-gpt2-image-captioning` para visão), reduzindo os pesos de float32 para int8 e viabilizando execução em hardware modesto. Os perfis neurodivergentes (v1.2.0) dispensam IA: o CSS de cada perfil é gerado por lógica pura testável no popup e cruza a fronteira como argumento; o comportamento dinâmico (holofote, régua, navegação de blocos) é listeners nativos com limpeza registrada.

## 🔧 Notas de engenharia

Ajustes aplicados sobre a especificação original, identificados durante as baterias de testes:

- Adicionada `web_accessible_resources` para `scripts/ai-worker.js` — requisito do Chrome para que páginas criem Workers a partir de recursos da extensão.
- Foco programático no conteúdo principal agora define `tabindex="-1"` antes de `main.focus()` — sem isso, o navegador ignora o foco em elementos não interativos e o leitor de tela não salta para o conteúdo (encontrado pelos testes de acessibilidade).
- Os fluxos de **Leitura Essencial** e **Daltonismo** do popup passaram a tratar falhas de injeção com mensagem clara ao usuário (antes, o sucesso era assumido mesmo quando a injeção falhava).
- **Encontrado pelos testes E2E em navegador real:** o Chrome bloqueia `new Worker('chrome-extension://...')` a partir de uma página web com `SecurityError` — mesmo com o recurso em `web_accessible_resources` — e o `ai-worker.js` usa `import` do CDN (sintaxe de módulo ES, inválida em worker clássico). O popup passou a buscar o código do worker via `fetch` e criar o Worker a partir de um Blob como módulo ES, com revogação do Blob ao encerrar e degradação graciosa do cache em origens não seguras. Sem esse ajuste, resumo e descrição de imagens **nunca teriam funcionado** em uso real.
- **Encontrado pelos testes E2E em navegador real:** quando a função injetada rejeita, `chrome.scripting.executeScript` devolve `result: null` (não propaga o erro) — o popup chegava a exibir "Concluído!" com saída vazia. Todos os resultados agora são validados antes de exibir sucesso, e o resumo só resolve na mensagem final do worker (`success`/`error`), nunca no primeiro sinal de progresso.
- Adicionados `author` (e-mail de contato) e `minimum_chrome_version: 102` ao manifesto.
- Versões da biblioteca de IA e dos modelos são **fixadas por commit (SHA)** no Hugging Face — sem branch flutuante —, com procedimento formal de upgrade e rollback descrito em [`clarifica-ai/VERSOES_MODELOS.md`](clarifica-ai/VERSOES_MODELOS.md) e auditado por teste automatizado.
- **v1.1.0 — Empacotamento local da Transformers.js:** o bundle oficial 2.14.0 e os 4 binários WASM do onnxruntime passam a viver em `vendor/` (publicados em `web_accessible_resources`); o `ai-worker.js` recebe as URLs locais via placeholders injetados pelo popup e o import de CDN foi eliminado — o pacote cumpre o Manifest V3 sem código remoto e a inferência não depende de terceiros em runtime.
- **v1.1.0 — Intensidade dos filtros de daltonismo:** interpolação linear entre a matriz identidade e a matriz do filtro (`M' = t·M + (1−t)·I`), que preserva a soma das linhas RGB e o canal alfa para qualquer intensidade; slider 0–100% no popup, com reaplicação ao soltar e persistência por configuração.
- **v1.1.0 — Motor de mensagens pt-BR/en:** o `chrome.i18n.getMessage` nativo depende do app-locale do processo do navegador, que não é confiável em builds headless (E2E) e instalações multilíngues; o popup resolve o idioma por `navigator.languages` → `getAcceptLanguages` → fallback pt_BR, carrega os JSON de `_locales` do próprio pacote e publica a escolha no `chrome.storage`, de onde o service worker consome (com reação a `onChanged`). Erros que cruzam a fronteira página↔popup são códigos traduzidos no destino.
- **v1.1.0 — Correção de bug latente:** a descrição de imagens não tratava erros emitidos pelo worker — uma falha deixava um Worker "zumbi" rodando; agora o Worker é encerrado com limpeza do Blob ao primeiro erro.
- **v1.2.0 — Perfis Neurodivergentes (roadmap cumprido):** três perfis prontos, exclusivos e sem IA/rede/permissão nova. **TEA:** `animation-play-state: paused` (animações congeladas onde estão, não puladas para o estado final), `document.getAnimations()` para cobrir a Web Animations API, GIFs animados convertidos em quadro estático por canvas (restauráveis; com degradação graciosa quando canvas não está disponível, e o texto alternativo preservado via `role="img"` + `aria-label` no canvas — `alt` não tem efeito em canvas) e remoção de sombras/blur — com o `documentElement` excluído das regras para não apagar o filtro de daltonismo, que vive no `html`. **TDAH:** holofote com máscara `radial-gradient` posicionada por variáveis CSS (`--clarifica-x/y`) atualizadas em `mousemove` com `requestAnimationFrame` de throttle, e navegação progressiva de leitura por `Alt+↓/↑` sobre `p/li/h1–h6/blockquote/pre` (blocos vazios ignorados, teto de 400 blocos, `scrollIntoView` com guarda de existência). **Dislexia:** espaçamento de letras/palavras/linhas e fonte de leitura do sistema aplicados a seletores de texto, com regra final que restaura `code/pre/kbd/samp/textarea/input` ao espaçamento e à fonte monoespaçadas (indentação é significativa), e régua de leitura como faixa fixa de 48 px (`position: fixed`, `pointer-events: none`, bordas com fundo translúcido) que o cursor posiciona 24 px acima de si. Todos os perfis são toggláveis, exclusivos, persistidos (`perfilAtivo`) e desmontados tanto pelo toggle quanto pelo `Ctrl+Shift+X` — o `reset-all` do service worker espelha a limpeza do popup (elementos, classes, GIFs restaurados e listeners), paridade garantida por teste.

## 🧪 Testes

Duas camadas complementares: a **suíte unitária** (Node, runner nativo, com inferência de IA real) e os **testes E2E** (a extensão carregada de verdade no Chromium pelo Playwright, exercitando fluxos em páginas HTTP reais).

| Camada | Suíte | O que cobre |
|--------|-------|-------------|
| Unitária (Node) | `manifest.test.js` | Integridade do Manifest V3, versão 1.2.0, `default_locale` + `_locales` presentes, 4 atalhos válidos, permissões mínimas, CSP, ícone PNG 128×128 real (cabeçalho binário), worker e `vendor/*` publicados como recursos web acessíveis |
| Unitária (Node) | `background.test.js` | Listener de comandos com anúncios i18n (mensagem resolvida no SW e injetada como argumento), anúncios `aria-live` (WCAG 4.1.3), Modo Leitura Essencial (ARIA + foco), `reset-all`, mensagens `TRIGGER_ACTION` |
| Unitária (Node) | `popup.test.js` | Fluxos completos dos 11 controles, 3 filtros com **intensidade interpolada**, reaplicação ao soltar o slider, persistência de tema/filtro/intensidade (`chrome.storage` restaurado ao reabrir), ciclo do tema claro/escuro, interface pt-BR, resumo e descrição de imagens ponta a ponta (Worker substituído por stub de mensagens com códigos de erro traduzidos), tratamento de erros de injeção |
| Unitária (Node) | `accessibility.test.js` | axe-core no popup **nos temas claro e escuro** (violations críticas/serías/moderadas/menores = 0), contraste WCAG 1.4.3 AA nos pares de cor dos dois temas, estados de foco/hover, semântica ARIA |
| Unitária (Node) | `css-filters.test.js` | A lógica pura de filtros é extraída e exercitada em Node: matrizes `feColorMatrix` válidas (20 valores, linhas RGB somam 1, alfa preservado), interpolação de intensidade (0/25/50/75/100 e fora da faixa) preservando as propriedades, formatação e construção do data URI, variáveis dos dois temas no CSS |
| Unitária (Node) | `i18n.test.js` | Paridade total pt_BR↔en (mesmas chaves), placeholders estruturalmente corretos, toda chave usada no código/HTML existe nos dois locales, nenhuma chave órfã, textos contratados preservados |
| Unitária (Node) | `ai-worker.test.js` | **Inferência de IA real** — sem simulacros: o código do worker é executado de verdade com a Transformers.js 2.14.0 oficial (a mesma vendada) e os modelos quantizados fixados do projeto, produzindo sumarização real (`Xenova/distilbart-cnn-12-6`) e descrição real de imagem (`Xenova/vit-gpt2-image-captioning`); valida carregamento, reuso do modelo, protocolo de mensagens e ausência de CDN |
| Unitária (Node) | `versoes-modelos.test.js` | Integridade do registry de versões: biblioteca vendada (`vendor/transformers.min.js` + 4 WASM com cabeçalho real), worker sem CDN e com URLs locais injetadas, revisões (SHA) fixadas, manifest publicando `vendor/*`, pré-baixa, devDependency e chave de cache do CI sincronizados com [`clarifica-ai/VERSOES_MODELOS.md`](clarifica-ai/VERSOES_MODELOS.md) |
| Unitária (Node) | `perfis.test.js` | **Perfis Neurodivergentes (v1.2.0)** — lógica pura dos três CSS extraída e exercitada em Node (TEA pausa sem tocar no `html`; TDAH com holofote por variáveis CSS; dislexia com espaçamento + restauração monoespaçada por último); fluxos completos no popup (toggle, troca exclusiva, persistência e restauração do `perfilAtivo`, erro de injeção); estado real na página alvo (estilos por id, holofote seguindo o mouse, navegação `Alt+↓/↑` ignorando blocos vazios, régua acompanhando o cursor, fallback sem canvas, limpeza idempotente) |
| **E2E (Chromium real)** | `e2e/carregamento.spec.js` | A extensão é aceita pelo Chrome de verdade: service worker MV3 registrado, popup abre com botões (incluindo os 3 perfis)/`aria-live`/slider/tema e **zero erros de console**; **o vendor é servido pela própria extensão e importável** (bundle 2.14.0 + WASM válido, sem CDN) |
| **E2E (Chromium real)** | `e2e/popup.spec.js` | Cliques reais no popup aplicam Leitura Essencial (ARIA + foco) e filtros de daltonismo em página HTTP real; **Perfis TEA e Dislexia aplicados e desligados na página real (v1.2.0)**; caminho de erro do resumo; IA real opt-in (`CLARIFICA_E2E_IA=1`) — **o worker Blob importa o bundle vendado e resume de verdade dentro do navegador** |
| **E2E (Chromium real)** | `e2e/service-worker.spec.js` | Atalhos de teclado (espelho fiel do listener): anúncio `aria-live` assertivo com a mensagem do motor de mensagens, `TRIGGER_ACTION`, restauração completa da página e robustez com ação desconhecida — injeção via `chrome.scripting` real |

**Como executar:**

```bash
cd clarifica-ai/tests
npm install
npm test            # suíte unitária completa (inclui inferência de IA real)
npm run test:e2e    # extensão no Chromium real via Playwright
```

> **Pré-requisitos:** os testes E2E exigem o navegador do Playwright — instale uma vez com `npx playwright install chromium`. **Inferência real:** o teste de IA executa os modelos de verdade — na primeira execução em uma máquina nova os pesos (~580 MB) são baixados do Hugging Face para `clarifica-ai/tests/.cache`. Para pré-baixar antes: `npm run preparar:modelos`.

O resultado consolidado da última execução está em [`clarifica-ai/tests/TEST_REPORT.md`](clarifica-ai/tests/TEST_REPORT.md).

## 🤖 Integração contínua (CI)

O projeto mantém pipeline automática (`.github/workflows/ci.yml`) com **dois portões independentes** executados a cada push e pull request — as execuções ficam públicas na aba [**Actions**](https://github.com/eliezer-tavares/clarifica-ai/actions) do repositório:

1. **Suíte unitária + IA real** — roda `npm test` no Node 24 com os pesos dos modelos cacheados entre execuções (a chave do cache embute os SHAs fixados dos modelos, de modo que um upgrade de modelo invalida o cache automaticamente e força a validação dos novos pesos).
2. **E2E no Chromium real** — o Playwright carrega a extensão unpacked (o mesmo mecanismo do Modo do desenvolvedor), aguarda o service worker MV3 e exercita os fluxos reais: popup, injeção via `chrome.scripting`, ARIA, filtros e restauração. Em caso de falha, o relatório HTML do Playwright é publicado como artefato.

Assim, qualquer regressão — de manifesto, de acessibilidade, de protocolo de mensagens ou de modelo — quebra o build **antes** de chegar ao usuário.

## 🔄 Versionamento dos modelos

A biblioteca de IA e cada modelo têm versão **fixada por commit (SHA)** no Hugging Face — nada flutua. O registry completo, o procedimento de upgrade passo a passo, os critérios de aceite e a política de rollback estão em [`clarifica-ai/VERSOES_MODELOS.md`](clarifica-ai/VERSOES_MODELOS.md). Um teste automatizado (`versoes-modelos.test.js`) confronta o registry com o código e quebra o CI em caso de divergência: mudanças de modelo são sempre deliberadas, testadas com inferência real e documentadas.

## 🗺️ Roadmap até a versão final

| Versão | Foco | Itens planejados |
|--------|------|------------------|
| **v1.1.0** | **Estabilidade e configuração — ✅ entregue em 07/11/2026** | Empacotamento local da Transformers.js em `vendor/` (CDN eliminado, MV3 cumprido); configurações persistidas com `chrome.storage` (tema, último filtro, intensidade); ajuste fino da intensidade dos filtros de cor (0–100%); tema claro/escuro no popup (AA nos dois temas); internacionalização pt-BR/en com motor de mensagens próprio; relatório consolidado na revisão 5 do `TEST_REPORT.md` |
| **v1.2.0** | **Perfis neurodivergentes — ✅ entregue em 08/11/2026** | **Perfil TEA** (pausa de animações, transições e rolagem suave; GIFs animados convertidos em quadro estático via canvas; remoção de sombras e blur); **Perfil TDAH** (modo foco com holofote ao redor do cursor; destaque progressivo de leitura por blocos com `Alt+↓/↑`); **Perfil Dislexia** (espaçamento de letras, palavras e linhas; fonte de leitura do sistema com código monoespaçado preservado; régua de leitura que acompanha o mouse); perfis exclusivos, toggláveis, persistidos e integrados ao `Ctrl+Shift+X`; relatório consolidado na revisão 6 do `TEST_REPORT.md` |
| **v1.3** | Áudio e multimodal | Transcrição de áudio local (Whisper quantizado) para vídeos e podcasts; OCR para extrair texto de imagens; leitura em voz alta com TTS local; tradução instantânea de trechos |
| **v2.0** | **Versão final** | Assistente de perguntas e respostas sobre a página (QA local); modelos multilíngues pt-BR para resumo e descrição de imagens; painel de auditoria de acessibilidade da página (relatório WCAG em tempo real); sincronização de perfis; publicação na Chrome Web Store; suporte a Firefox (WebExtensions) |

Cada etapa do roadmap mantém os princípios do projeto: execução local da IA, privacidade por padrão (Privacy by Design) e acessibilidade como requisito, não como acessório.

## ⚠️ Limitações conhecidas

- Os modelos atuais de resumo e de descrição de imagens geram texto em **inglês**; a conversão para modelos multilíngues pt-BR está prevista na v2.0.
- Páginas restritas (`chrome://`, Chrome Web Store) não permitem injeção de scripts — comportamento de segurança do próprio navegador.
- Textos com menos de 200 caracteres não são resumidos (proteção contra resultados sem contexto).
- A primeira execução de cada recurso de IA baixa o modelo correspondente e exige conexão; o uso posterior é offline.
- Os efeitos aplicados em páginas (perfis, filtros, Leitura Essencial) valem para a página atual; ao navegar, basta reativar com um clique — o perfil escolhido fica memorizado no popup.

## 🤝 Contribuir e reportar problemas

Encontrou um bug, uma barreira de acessibilidade ou tem uma sugestão? Abra uma [issue](https://github.com/eliezer-tavares/clarifica-ai/issues) descrevendo a página visitada, o recurso utilizado (atalho ou botão do popup), o leitor de tela/navegador e o comportamento observado versus o esperado.

Pull requests são bem-vindos. Antes de enviar, mantenha a suíte verde (`npm test` e `npm run test:e2e` dentro de `tests/`) e preserve os princípios do projeto: IA 100% local, privacidade por padrão e acessibilidade como requisito, não como acessório.

## 👤 Autoria e contexto acadêmico

**Arquitetado por** Eliezer Tavares de Oliveira
✉️ contact@eliezertavaresdeoliveira.com
GitHub: [github.com/eliezer-tavares](https://github.com/eliezer-tavares)

Eliezer Tavares de Oliveira é cego e usuário de leitores de tela — uma vivência que fundamenta cada decisão de acessibilidade deste projeto, do feedback por `aria-live` aos atalhos de teclado pensados para NVDA e JAWS. É aluno do curso de **Engenharia de Computação** da **UNIVESP (Universidade Virtual do Estado de São Paulo)**, e esta aplicação foi arquitetada como entrega da disciplina **Projeto Integrador VI**.

## 📄 Licença

Este projeto é distribuído sob a **Licença Apache 2.0**. Consulte o arquivo [`LICENSE`](LICENSE) para o texto completo em inglês, incluindo os termos de uso, reprodução e distribuição.
