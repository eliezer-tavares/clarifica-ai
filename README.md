# 🧠 Clarifica.ai

> Acessibilidade universal com Inteligência Artificial local: resumos automáticos, descrição de imagens, Modo Leitura Essencial e filtros para daltonismo — direto no navegador, 100% offline.

**Licença:** Apache-2.0 · **Manifest:** V3 · **Navegadores:** Chrome, Edge, Brave e outros Chromium · **IA:** Edge AI (local), sem envio de dados · **CI:** testes unitários + E2E no Chromium real

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
| 4 | 🔴🟢🔵 **Filtros para daltonismo** | Aplica matrizes de correção cromática (`feColorMatrix` SVG) sobre a página inteira, com um clique, para **protanopia**, **deuteranopia** e **tritanopia** (atende WCAG 1.4.1 — Uso de Cor). | Botões no popup |
| 5 | ♻️ **Restaurar página** | Remove todos os efeitos aplicados: filtros de cor, silenciamento de regiões e elementos criados pela extensão. A página volta exatamente ao estado original. | `Ctrl+Shift+X` |
| 6 | 🔊 **Feedback para leitores de tela** | Cada ação injeta um anúncio `role="status"` com `aria-live="assertive"` e `aria-atomic="true"`, lido imediatamente pelo leitor de tela (WCAG 4.1.3 — Mensagens de Status). | Automático |
| 7 | 🖥️ **Popup acessível** | Barra de status ao vivo (`aria-live="polite"`), sete botões nativos navegáveis por `TAB`, área de resultado com `role="region"` e botão "Fechar". | Clique no ícone da extensão |

### O que você ganha na prática

- **Menos ruído:** páginas densas (portais de notícias, dashboards) ficam focadas apenas no conteúdo relevante.
- **Imagens compreensíveis:** fotos e gráficos sem descrição passam a ter `alt` gerado pela IA.
- **Textos mais curtos:** artigos longos viram resumos em segundos, sem copiar e colar em sites externos.
- **Cores corrigidas:** os três tipos mais comuns de daltonismo contemplados instantaneamente.
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

## 🏗️ Arquitetura

```text
.                            (raiz do repositório)
├── .github/
│   └── workflows/ci.yml   # CI: suíte unitária (com IA real) + E2E no Chromium
├── README.md              # Documentação completa (pt-BR) — este arquivo
├── LICENSE                # Licença Apache-2.0
└── clarifica-ai/          # Pasta carregada no Chrome ("Carregar sem compactação")
    ├── manifest.json      # Manifest V3: atalhos, permissões mínimas, CSP, ícone
    ├── background.js      # Service Worker: comandos de teclado + anúncios ARIA
    ├── popup/
    │   ├── popup.html     # UI semântica e acessível
    │   ├── popup.css      # Alto contraste (pares AA verificados por testes)
    │   └── popup.js       # Orquestra injeção de scripts, filtros e resultados
    ├── scripts/
    │   └── ai-worker.js   # Web Worker: Transformers.js (resumo + visão), versões fixadas
    ├── assets/
    │   └── icon.png       # Ícone 128×128
    ├── VERSOES_MODELOS.md # Registry de versões fixadas da biblioteca e dos modelos
    └── tests/             # Suíte completa: Node (unitária + IA real) e Playwright (E2E)
```

**Fluxo técnico:** atalho de teclado → Service Worker (`chrome.commands`) → `chrome.scripting.executeScript` injeta funções na página → manipulação do DOM (ARIA, filtros) ou postMessage para o popup. A inferência de IA roda em Web Worker isolado com modelos quantizados da biblioteca Transformers.js (`distilbart-cnn-12-6` para sumarização, `vit-gpt2-image-captioning` para visão), reduzindo os pesos de float32 para int8 e viabilizando execução em hardware modesto.

## 🔧 Notas de engenharia

Ajustes aplicados sobre a especificação original, identificados durante as baterias de testes:

- Adicionada `web_accessible_resources` para `scripts/ai-worker.js` — requisito do Chrome para que páginas criem Workers a partir de recursos da extensão.
- Foco programático no conteúdo principal agora define `tabindex="-1"` antes de `main.focus()` — sem isso, o navegador ignora o foco em elementos não interativos e o leitor de tela não salta para o conteúdo (encontrado pelos testes de acessibilidade).
- Os fluxos de **Leitura Essencial** e **Daltonismo** do popup passaram a tratar falhas de injeção com mensagem clara ao usuário (antes, o sucesso era assumido mesmo quando a injeção falhava).
- **Encontrado pelos testes E2E em navegador real:** o Chrome bloqueia `new Worker('chrome-extension://...')` a partir de uma página web com `SecurityError` — mesmo com o recurso em `web_accessible_resources` — e o `ai-worker.js` usa `import` do CDN (sintaxe de módulo ES, inválida em worker clássico). O popup passou a buscar o código do worker via `fetch` e criar o Worker a partir de um Blob como módulo ES, com revogação do Blob ao encerrar e degradação graciosa do cache em origens não seguras. Sem esse ajuste, resumo e descrição de imagens **nunca teriam funcionado** em uso real.
- **Encontrado pelos testes E2E em navegador real:** quando a função injetada rejeita, `chrome.scripting.executeScript` devolve `result: null` (não propaga o erro) — o popup chegava a exibir "Concluído!" com saída vazia. Todos os resultados agora são validados antes de exibir sucesso, e o resumo só resolve na mensagem final do worker (`success`/`error`), nunca no primeiro sinal de progresso.
- Adicionados `author` (e-mail de contato) e `minimum_chrome_version: 102` ao manifesto.
- Versões da biblioteca de IA e dos modelos são **fixadas por commit (SHA)** no Hugging Face — sem branch flutuante —, com procedimento formal de upgrade e rollback descrito em [`clarifica-ai/VERSOES_MODELOS.md`](clarifica-ai/VERSOES_MODELOS.md) e auditado por teste automatizado.
- Empacotamento local do Transformers.js está previsto no roadmap: a carga via CDN pode ser bloqueada pela política de código remoto do Manifest V3 em algumas configurações.

## 🧪 Testes

Duas camadas complementares: a **suíte unitária** (Node, runner nativo, com inferência de IA real) e os **testes E2E** (a extensão carregada de verdade no Chromium pelo Playwright, exercitando fluxos em páginas HTTP reais).

| Camada | Suíte | O que cobre |
|--------|-------|-------------|
| Unitária (Node) | `manifest.test.js` | Integridade do Manifest V3, 4 atalhos válidos, permissões mínimas, CSP, ícone PNG 128×128 real (cabeçalho binário), recursos web acessíveis |
| Unitária (Node) | `background.test.js` | Listener de comandos, anúncios `aria-live` (WCAG 4.1.3), Modo Leitura Essencial (ARIA + foco), `reset-all`, mensagens `TRIGGER_ACTION` |
| Unitária (Node) | `popup.test.js` | Fluxos completos dos 7 botões, 3 filtros de daltonismo aplicados ao DOM, resumo e descrição de imagens ponta a ponta (Worker substituído por um stub de mensagens), tratamento de erros |
| Unitária (Node) | `accessibility.test.js` | axe-core no popup (violations críticas/serías = 0), contraste WCAG 1.4.3 AA em todos os pares de cor, estados de foco/hover, semântica ARIA |
| Unitária (Node) | `css-filters.test.js` | Matrizes `feColorMatrix` válidas (20 valores, linhas RGB somam 1, canal alfa preservado) |
| Unitária (Node) | `ai-worker.test.js` | **Inferência de IA real** — sem simulacros: o código do worker é executado de verdade com a Transformers.js 2.14.0 oficial e os modelos quantizados fixados do projeto, produzindo sumarização real (`Xenova/distilbart-cnn-12-6`) e descrição real de imagem (`Xenova/vit-gpt2-image-captioning`); valida carregamento, reuso do modelo e o protocolo de mensagens |
| Unitária (Node) | `versoes-modelos.test.js` | Integridade do registry de versões: CDN, revisões (SHA) fixadas no worker, pré-baixa, devDependency e chave de cache do CI permanecem sincronizados com [`clarifica-ai/VERSOES_MODELOS.md`](clarifica-ai/VERSOES_MODELOS.md) |
| **E2E (Chromium real)** | `e2e/carregamento.spec.js` | A extensão é aceita pelo Chrome de verdade: service worker MV3 registrado, popup abre com botões/`aria-live` e **zero erros de console** |
| **E2E (Chromium real)** | `e2e/popup.spec.js` | Cliques reais no popup aplicam Leitura Essencial (ARIA + foco) e filtros de daltonismo em página HTTP real; caminho de erro do resumo; IA real opt-in (`CLARIFICA_E2E_IA=1`) |
| **E2E (Chromium real)** | `e2e/service-worker.spec.js` | Atalhos de teclado (fluxo do `background.js`): anúncio `aria-live` assertivo, `TRIGGER_ACTION`, restauração completa da página e robustez com ação desconhecida — injeção via `chrome.scripting` real, sem adaptações |

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
| **v1.1** | Estabilidade e configuração | Empacotamento local do Transformers.js (elimina CDN e reforça a conformidade MV3); configurações persistidas com `chrome.storage` (filtro ativo, intensidade); ajuste fino da intensidade dos filtros de cor; tema claro/escuro no popup; internacionalização pt-BR/en |
| **v1.2** | Perfis neurodivergentes | Perfil TEA (redução de estímulos: pausa de animações e GIFs, simplificação visual da página); perfil TDAH (modo foco com destaque progressivo de leitura); perfil Dislexia (espaçamento de letras e linhas, fonte adaptada, régua de leitura) |
| **v1.3** | Áudio e multimodal | Transcrição de áudio local (Whisper quantizado) para vídeos e podcasts; OCR para extrair texto de imagens; leitura em voz alta com TTS local; tradução instantânea de trechos |
| **v2.0** | **Versão final** | Assistente de perguntas e respostas sobre a página (QA local); modelos multilíngues pt-BR para resumo e descrição de imagens; painel de auditoria de acessibilidade da página (relatório WCAG em tempo real); sincronização de perfis; publicação na Chrome Web Store; suporte a Firefox (WebExtensions) |

Cada etapa do roadmap mantém os princípios do projeto: execução local da IA, privacidade por padrão (Privacy by Design) e acessibilidade como requisito, não como acessório.

## ⚠️ Limitações conhecidas

- Os modelos atuais de resumo e de descrição de imagens geram texto em **inglês**; a conversão para modelos multilíngues pt-BR está prevista na v2.0.
- Páginas restritas (`chrome://`, Chrome Web Store) não permitem injeção de scripts — comportamento de segurança do próprio navegador.
- Textos com menos de 200 caracteres não são resumidos (proteção contra resultados sem contexto).
- A primeira execução de cada recurso de IA baixa o modelo correspondente e exige conexão; o uso posterior é offline.

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
