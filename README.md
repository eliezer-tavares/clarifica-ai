# 🧠 Clarifica.ai

> Acessibilidade universal com Inteligência Artificial local: **legendas CC ao vivo**, resumos automáticos, descrição de imagens, transcrição de áudio, OCR, tradução EN→PT, leitura em voz alta, Modo Leitura Essencial, filtros para daltonismo e perfis neurodivergentes (TEA, TDAH, Dislexia) — direto no navegador, 100% offline.

**Licença:** Apache-2.0 · **Versão:** 1.4.0 · **Manifest:** V3 · **Navegadores:** Chrome 116+, Edge, Brave e outros Chromium · **IA:** Edge AI (local), sem envio de dados · **CI:** testes unitários + E2E no Chromium real

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
| 7 | 🖥️ **Popup acessível** | Barra de status ao vivo (`aria-live="polite"`), dezessete botões nativos navegáveis por `TAB`, seletor de idioma das legendas, controle de intensidade rotulado, área de resultado com `role="region"` e botão "Fechar". | Clique no ícone da extensão |
| 8 | 🌗 **Tema claro/escuro + configurações persistidas** | O popup acompanha o sistema (modo automático) ou fixa claro/escuro; tema, último filtro, perfil ativo e intensidade ficam persistidos via `chrome.storage` e restaurados ao reabrir (todos os pares de cor dos dois temas validados em AA). | Botão "Tema" no popup |
| 9 | 🌐 **Interface pt-BR/en** | Interface e anúncios do leitor de tela seguem o idioma do navegador (português ou inglês), com mensagens versionadas em `_locales` e auditadas por teste de paridade. | Automático |
| 10 | 🧩🎯🔤 **Perfis Neurodivergentes (v1.2.0)** | Três perfis prontos, exclusivos entre si e sem nenhuma IA/rede: **TEA** (pausa animações, transições e rolagem suave, converte GIFs animados em quadro estático via canvas e remove sombras/blur); **TDAH** (holofote que escurece a página ao redor do cursor e navegação progressiva por blocos de leitura com `Alt+↓/↑`); **Dislexia** (espaçamento de letras, palavras e linhas, fonte de leitura do sistema com código monoespaçado preservado, e régua de leitura que acompanha o mouse). Clique no perfil ativo para desligar; `Ctrl+Shift+X` também desfaz. | Botões de perfil no popup |
| 11 | 🎙️ **Transcrição de áudio (v1.3.0)** | Localiza o primeiro `<video>`/`<audio>` da página com fonte http(s), decodifica e reamostra o áudio para PCM mono 16 kHz (interpolação linear determinística) e transcreve com **Whisper-tiny quantizado** (multilíngue, idioma detectado automaticamente) em Web Worker dedicado. A transcrição aparece no popup e pode ser relida em voz alta. Mídia protegida por CORS recebe mensagem clara, sem travar. | `🎙️ Transcrever Áudio da Página` no popup |
| 12 | 📄 **OCR nas imagens (v1.3.0)** | Extrai o **texto impresso** das imagens sem `alt` com o modelo TrOCR-small quantizado e aplica o texto como `alt`/`aria-label` (WCAG 1.4.5 — imagens de texto passam a ser lidas pelo leitor de tela), com contorno verde de confirmação e anúncio de conclusão na página. | `📄 OCR — Texto nas Imagens` no popup |
| 13 | 🌍 **Tradução EN → PT (v1.3.0)** | Traduz instantaneamente o **trecho selecionado** na página com o modelo opus-mt quantizado (destino fixado em português), exibindo o resultado no popup e anunciando a conclusão por `aria-live`. Até 1.500 caracteres por tradução. | `🌍 Traduzir Seleção (EN → PT)` no popup (ou atalho configurável em `chrome://extensions/shortcuts`) |
| 14 | 🔊 **Leitura em voz alta (v1.3.0)** | Lê o trecho selecionado — ou o conteúdo principal da página — com as **vozes do sistema** (Web Speech API: sem modelo, sem download, offline). Toggle com `aria-pressed`: clicar de novo para; o `Ctrl+Shift+X` também interrompe. A fala continua mesmo com o popup fechado, porque vive na própria página. | `🔊 Ler em Voz Alta` no popup |
| 15 | 💬 **Legendas CC ao vivo (v1.4.0)** | **Carro-chefe da v1.4.0**: captura o áudio da ABA ativa (`chrome.tabCapture` + documento offscreen — funciona com `blob:`/YouTube e mídia sem CORS), transcreve em janelas contínuas de 7 s (com 1 s de sobreposição) com o **Whisper-tiny 100% local** e entrega cada transcrição parcial como legenda sobre o vídeo: `<track kind="captions">` com WebVTT (canal nativo, respeitado por leitores de tela e pelo controle CC), com **fallback de sobreposição** quando a página bloqueia o track (CSP). Chip discreto "Legendas ativas — captando áudio" e anúncio único para leitores de tela. Sem teto de duração e sem envio de áudio a servidores. Toggle com `aria-pressed`; desmontagem limpa pelo segundo clique e pelo `Ctrl+Shift+X`. | `💬 Legendas ao Vivo (CC)` no popup |
| 16 | 🌍 **Legendas em inglês — bilinguismo (v1.4.0)** | Seletor no popup alterna a tarefa do Whisper: **Original** (legenda no idioma da fala) ou **Inglês** (fala em qualquer idioma detectado vira legenda em inglês via `task: translate`). Nenhum modelo novo — o whisper-tiny multilíngue já fixado no projeto. Qualidade de tradução pelo modelo tiny é aproximada (limitação declarada). | Seletor `Idioma das legendas` no popup |
| 17 | 🔍 **Verificador WCAG 1.2.2 (v1.4.0)** | Função injetada de leitura (sem IA e sem rede) inventaria os `<video>` da página e conta quantos possuem `<track kind="captions">` ou `subtitles` — por exemplo, "2 de 3 vídeos sem legendas" — com ação direta: gerar as legendas ali mesmo com o recurso ao vivo. Versão mínima do ciclo auditar e agir (o painel completo de auditoria segue na v2.0). | `🔍 Verificar legendas (WCAG 1.2.2)` no popup |

### O que você ganha na prática

- **Menos ruído:** páginas densas (portais de notícias, dashboards) ficam focadas apenas no conteúdo relevante.
- **Imagens compreensíveis:** fotos e gráficos sem descrição passam a ter `alt` gerado pela IA.
- **Textos mais curtos:** artigos longos viram resumos em segundos, sem copiar e colar em sites externos.
- **Cores corrigidas:** os três tipos mais comuns de daltonismo contemplados instantaneamente.
- **Web sem sobrecarga:** os perfis TEA, TDAH e Dislexia reduzem estímulos, mantêm o foco e facilitam a leitura — cada um em um clique.
- **Áudio compreensível:** vídeos e podcasts incorporados viram texto transcrito localmente, legível por leitores de tela e relido em voz alta.
- **Vídeos acompanháveis:** legendas CC geradas no dispositivo e sincronizadas sobre o vídeo enquanto ele roda — incluindo fontes `blob:` (YouTube) que a transcrição pontual não alcança.
- **Falantes de inglês atendidos:** interface em inglês, legendas no idioma original e tradução de fala para inglês — o conteúdo, agora, também é bilíngue.
- **Vídeos sem legenda descobertos:** o verificador WCAG 1.2.2 aponta os vídeos sem track de legendas e oferece gerá-los ali mesmo.
- **Imagens com texto decifráveis:** capturas de tela e infográficos com texto impresso ganham alternativa textual via OCR.
- **Inglês sem barreiras:** trechos selecionados são traduzidos para o português na hora, sem sair da página nem enviar nada a terceiros.
- **Privacidade total:** zero servidores próprios, zero telemetria, zero cookies.

## ⚙️ Requisitos

- Navegador baseado em Chromium, versão **116 ou superior** (Chrome, Edge, Brave, Opera) — a v1.4.0 subiu o mínimo de 102 para 116 porque o `chrome.tabCapture.getMediaStreamId` no service worker exige Chrome 116+ (o documento offscreen existe desde o 109).
- Cerca de **800 MB** de espaço livre para os modelos de IA, baixados uma única vez na primeira execução de cada recurso (~300 MB para resumo, ~250 MB para visão, ~115 MB para tradução, ~60 MB para OCR, ~45 MB para transcrição/legendas — a leitura em voz alta usa as vozes do sistema e não baixa nada). **A v1.4.0 não adiciona nenhum modelo**: quem já usou a transcrição baixa **zero bytes** para usar as legendas ao vivo.
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
7. **Áudio e Multimodal:** `🎙️ Transcrever Áudio da Página` transcreve o primeiro vídeo/áudio da página (o resultado aparece em "Resultado:"); `📄 OCR` extrai o texto impresso das imagens e o aplica como descrição; `🌍 Traduzir Seleção` traduz o trecho que você selecionou na página; `🔊 Ler em Voz Alta` lê o trecho selecionado ou o conteúdo principal — clique de novo para parar (ou use `Ctrl+Shift+X`).
8. **Legendas ao Vivo (v1.4.0):** abra uma página com vídeo (YouTube incluído) e clique em `💬 Legendas ao Vivo (CC)`. A captura do áudio da aba começa no gesto do clique, o chip "Legendas ativas — captando áudio" aparece na página e as legendas passam a acompanhar o vídeo (aproximadamente em tempo real: atraso típico de 5 a 15 s). Para páginas com apenas `<audio>` (podcasts), a transcrição ao vivo aparece no próprio popup. Parada limpa: clique de novo no botão ou use `Ctrl+Shift+X`. A navegação da aba encerra com mensagem clara.
9. **Idioma das legendas (v1.4.0):** o seletor `Idioma das legendas` alterna entre **Original** (legenda no idioma da fala) e **Inglês (tradução)** — fala em qualquer idioma detectado pelo Whisper vira legenda em inglês. A troca com legendas em execução reinicia a captura com a tarefa nova.
10. **Verificar legendas (v1.4.0):** `🔍 Verificar legendas (WCAG 1.2.2)` inventaria os vídeos da página e informa quantos estão sem legenda (por exemplo, "2 de 3 vídeos sem legendas") — com as Legendas ao Vivo a um clique para gerá-las ali mesmo.

## 🏗️ Arquitetura

```text
.                            (raiz do repositório)
├── .github/
│   └── workflows/ci.yml   # CI: suíte unitária (com IA real) + E2E no Chromium
├── README.md              # Documentação completa (pt-BR) — este arquivo
├── README_EN.md           # Documentação completa (English, mantida em lockstep)
├── LICENSE                # Licença Apache-2.0
└── clarifica-ai/          # Pasta carregada no Chrome ("Carregar sem compactação")
    ├── manifest.json      # Manifest V3: atalhos, permissões mínimas (incl. tabCapture/offscreen), CSP, ícone, default_locale, Chrome 116+
    ├── background.js      # Service Worker: comandos de teclado + anúncios ARIA + ciclo de vida do offscreen e ponte das legendas ao vivo
    ├── offscreen/         # Documento offscreen (v1.4.0): captura de aba, janelas contínuas, worker Whisper, montagem do WebVTT
    │   ├── offscreen.html
    │   └── offscreen.js
    ├── _locales/          # Mensagens pt-BR/en da interface (pt_BR é o default; 91 chaves em paridade)
    │   ├── pt_BR/messages.json
    │   └── en/messages.json
    ├── popup/
    │   ├── popup.html     # UI semântica e acessível (placeholders __MSG__ do i18n)
    │   ├── popup.css      # Temas claro/escuro (AA nos dois) + slider + perfis + áudio/multimodal + seletor de idioma das legendas
    │   ├── popup.js       # Orquestra injeção, filtros, perfis, áudio/multimodal, legendas ao vivo, tema, storage, i18n
    ├── scripts/
    │   ├── ai-worker.js   # Web Worker: Transformers.js vendada (sem CDN), versões fixadas; aceita task/language (v1.4.0)
    │   └── clarifica-puro.js  # Lógica pura compartilhada (v1.4.0): reamostragem, plano de janelas, WebVTT, seleção de vídeo, auditoria 1.2.2
    ├── vendor/            # Biblioteca vendada: transformers.min.js + 4 binários WASM do onnxruntime
    ├── assets/
    │   └── icon.png       # Ícone 128×128
    ├── VERSOES_MODELOS.md # Registry de versões fixadas da biblioteca e dos modelos
    └── tests/             # Suíte completa: Node (unitária + IA real) e Playwright (E2E)
```

**Fluxo técnico:** atalho de teclado → Service Worker (`chrome.commands`) → `chrome.scripting.executeScript` injeta funções na página → manipulação do DOM (ARIA, filtros, perfis) ou postMessage para o popup. A inferência de IA roda em Web Worker isolado com a biblioteca Transformers.js **vendada no próprio pacote** (`vendor/transformers.min.js` + binários WASM locais — zero CDN desde a v1.1.0) e modelos quantizados fixados por revisão (`distilbart-cnn-12-6` para sumarização, `vit-gpt2-image-captioning` para visão, `whisper-tiny` para transcrição/legendas, `trocr-small-printed` para OCR e `opus-mt-en-ROMANCE` para tradução EN→PT), reduzindo os pesos de float32 para int8 e viabilizando execução em hardware modesto. Os perfis neurodivergentes (v1.2.0) dispensam IA: o CSS de cada perfil é gerado por lógica pura testável no popup e cruza a fronteira como argumento. O áudio (v1.3.0) é decodificado e reamostrado a 16 kHz mono na própria página (lógica pura testável) antes de cruzar a fronteira para o Worker; a leitura em voz alta usa a Web Speech API nativa na página. As legendas ao vivo (v1.4.0) seguem o padrão MV3 recomendado: popup → service worker (`chrome.tabCapture.getMediaStreamId` + supervisor do documento offscreen) → offscreen (`getUserMedia` com `chromeMediaSource 'tab'`, janelas de 7 s com sobreposição de 1 s, worker Whisper via Blob, WebVTT pelo módulo puro) → service worker (`chrome.scripting`) → página (`<track kind="captions">` com Blob WebVTT e fallback de sobreposição) e popup (transcript ao vivo). A lógica pura compartilhada vive em `scripts/clarifica-puro.js` (importada pelo offscreen e extraída por marcadores para os testes em Node, com paridade garantida por teste para as cópias inline do popup e do service worker).

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
- **v1.3.0 — Transcrição local (Whisper-tiny, ~45 MB):** o popup localiza o primeiro `<video>`/`<audio>` com `src` http(s) (blob:/data: são ignorados — não são fetcháveis), busca a mídia no contexto da PÁGINA (URLs relativas resolvem na origem do site), decodifica com `AudioContext.decodeAudioData` e reamostra para **PCM mono 16 kHz** por interpolação linear — função pura (`reamostrarPara16k`) extraída por marcadores e testada numericamente em Node. O PCM cruza a fronteira como `Float32Array` (teto de 120 s ≈ 7,7 MB) para o Worker, que executa Whisper com janelas de 30 s (`chunk_length_s`/`stride_length_s`) e detecção automática de idioma. Falhas de rede/CORS produzem códigos de erro traduzidos no popup (`media-bloqueado`, `audio-indisponivel`, `audio-muito-curto`) — a página nunca fica presa em "Processando".
- **v1.3.0 — OCR como alternativa textual (TrOCR-small-printed, ~60 MB):** o OCR roda sobre as MESMAS imagens da descrição (sem `alt`, vazio ou genérico "image"), e o texto extraído é aplicado como `alt` + `aria-label` com prefixo i18n "Texto da imagem (OCR): " — imagens de texto passam a ser lidas por leitores de tela (WCAG 1.4.5). A contagem de encerramento do Worker é por RESPOSTAS (não por textos úteis), para nunca deixar Worker zumbi quando o OCR vier vazio; a conclusão é anunciada na página com a contagem real (`$quantidade$` substituído na página, que é quem conhece o número de imagens).
- **v1.3.0 — Tradução EN→PT com destino fixado (opus-mt-en-ROMANCE, ~115 MB):** os modelos Marian multilíngues não têm parâmetro de idioma no pipeline da Transformers.js 2.14.0 — o destino português é fixado pelo prefixo convencional `>>pt<< ` no texto de origem, no Worker, e validado por inferência real (saída auditada: "A acessibilidade digital garante que os sites possam ser usados por todos."). Entrada: `window.getSelection()` da página, teto de 1.500 caracteres; seleção vazia devolve código próprio (`selecao-vazia`) sem criar Worker.
- **v1.3.0 — TTS sem modelo (Web Speech API):** decisão de produto documentada no registry de versões: a leitura em voz alta usa `speechSynthesis` com as vozes do SISTEMA (qualidade superior a um modelo neural quantizado, zero download, offline). A síntese vive na PÁGINA (sobrevive ao fechamento do popup), o botão é um toggle com `aria-pressed`, a voz acompanha o idioma da interface (pt-BR/en-US) e o `reset-all` do service worker também interrompe a fala — coberto por teste.
- **v1.3.0 — Comando de tradução sem atalho sugerido:** o Chrome aceita no máximo 4 atalhos sugeridos por extensão; os 4 originais permanecem e o novo comando `traduzir-selecao` é publicado SEM `suggested_key`, configurável pelo usuário em `chrome://extensions/shortcuts` — decisão documentada e fixada por teste no `manifest.test.js`.
- **v1.4.0 — Legendas CC ao vivo (padrão MV3 de captura com offscreen):** o clique no popup é o gesto do usuário; o service worker garante EXATAMENTE um documento offscreen (`chrome.runtime.getContexts` + recriação idempotente — padrão `setupOffscreenDocument` da documentação) e obtém o identificador de fluxo via `chrome.tabCapture.getMediaStreamId` (com **teto de segurança de 5 s**: em ambientes limitados a API pode ficar pendente indefinidamente — a UI nunca fica presa em "Iniciando..."). O fallback do plano de risco do M1 está implementado no popup (também página de extensão com gesto): recusado no SW, o popup obtém o identificador e re-envia. O offscreen troca o identificador por um `MediaStream` (`getUserMedia` com `chromeMediaSource 'tab'` — funciona para `blob:`/YouTube e mídia sem CORS), reconecta o fluxo ao destino do `AudioContext` para preservar quem ouve e alimenta janelas contínuas de 7 s com 1 s de sobreposição (agendador dirigido por `planoDeJanelas`, do módulo puro). Cada janela é reamostrada a 16 kHz (`reamostrarPara16k`) e enviada ao worker Whisper pelo MESMO padrão de Blob do popup; cada transcrição parcial volta como legenda e o WebVTT é montado pelo módulo puro (`montadorVtt`, com dedupe e ordenação). Latência honesta: **aproximadamente em tempo real, atraso típico de 5 a 15 s** (janela + inferência), declarado na interface e no README.
- **v1.4.0 — Entrega na página: track nativo com fallback por detecção:** a forma preferencial é `<track kind="captions">` com Blob URL do WebVTT incremental (canal padrão de legendas, respeitado por leitores de tela e pelo controle CC do player); quando o track falha (CSP restritiva, track de cross-origin), o evento `error` dispara o fallback de sobreposição — caixa fixa sobre o vídeo com `aria-hidden` (a legenda é texto visível; o anúncio de estado é único). O vídeo alvo é escolhido pela função pura `seletorDeVideoAlvo` (vídeo visível de maior área; empates por ordem do documento). Páginas com apenas `<audio>` não recebem track: a mesma tubulação alimenta o transcript ao vivo no popup. Estados e erros atravessam a fronteira como códigos traduzidos (`captura-negada`, `aba-sem-midia`, `captura-encerrada`, `falha-legendas`).
- **v1.4.0 — Módulo de lógica pura compartilhada (`scripts/clarifica-puro.js`):** extração do padrão css-filters/perfis para um arquivo único consumido em runtime (o offscreen importa como módulo ES) e pelos testes em Node (extração por marcadores). As funções que também rodam DENTRO de funções injetadas (`reamostrarPara16k` no popup, `auditoriaLegendas` no popup, `seletorDeVideoAlvo` no service worker) permanecem como cópias inline marcadas — a paridade fonte a fonte com o módulo é garantida por três testes em `legendas.test.js`, mesma disciplina da paridade i18n. O fluxo de transcrição pontual da v1.3.0 permanece intocado (rede de segurança dos testes existentes).
- **v1.4.0 — Bilinguismo do conteúdo sem modelo novo:** o seletor "Idioma das legendas" alterna a tarefa do pipeline de reconhecimento de fala entre transcrição e `task: 'translate'` (fala em qualquer idioma detectado → legenda em inglês) — o whisper-tiny já fixado no registry v3 é multilíngue. `ai-worker.js` aceita `opcoes.tarefa`/`opcoes.idioma` na mensagem `transcribe-audio`; sem opções, o comportamento da v1.3.0 é bit a bit o mesmo (auditado por inferência real).
- **v1.4.0 — Verificador mínimo do critério WCAG 1.2.2:** função injetada de leitura inventaria os `<video>` e conta os com `<track kind="captions">`/`subtitles` (via DOM e via `textTracks` — tracks de outros kinds como `chapters` NÃO contam, coberto por teste). Resultado no popup com contagens (`$sem$`/`$total$`) e ação direta pelas legendas ao vivo — o ciclo auditar e agir; o painel completo de auditoria em tempo real permanece reservado à v2.0.
- **v1.4.0 — Recursos complementares documentados (VLibras, NVDA, JAWS):** seção no README (PT/EN) recomendando ferramentas complementares, sem nenhuma integração de código — o Manifest V3 não oferece caminho suportado para uma extensão disparar outra (sem `externally_connectable`) e a VLibras é pt-BR apenas; acoplamento seria dependência de terceiro sem ganho técnico.
- **v1.4.0 — README_EN.md:** documentação em inglês criada em lockstep com o README (o plano da v1.4.0 já a tratava como existente; passou a viver de fato no repositório nesta release, mantida em paridade de conteúdo nas atualizações).

## 🧪 Testes

Duas camadas complementares: a **suíte unitária** (Node, runner nativo, com inferência de IA real) e os **testes E2E** (a extensão carregada de verdade no Chromium pelo Playwright, exercitando fluxos em páginas HTTP reais).

| Camada | Suíte | O que cobre |
|--------|-------|-------------|
| Unitária (Node) | `manifest.test.js` | Integridade do Manifest V3, versão 1.4.0, `default_locale` + `_locales` presentes, 4 atalhos válidos + comando de tradução sem atalho sugerido (limite do Chrome), permissões mínimas (3 originais + `tabCapture`/`offscreen` da v1.4.0), CSP, ícone PNG 128×128 real (cabeçalho binário), worker e `vendor/*` publicados como recursos web acessíveis, Chrome mínimo 116 |
| Unitária (Node) | `background.test.js` | Listener de comandos com anúncios i18n (mensagem resolvida no SW e injetada como argumento), anúncios `aria-live` (WCAG 4.1.3), Modo Leitura Essencial (ARIA + foco), `reset-all` (incluindo cancelamento da leitura em voz alta — v1.3.0, e desmontagem do host de legendas — v1.4.0), funções de legendas do SW degradando sem APIs do Chrome, mensagens `TRIGGER_ACTION` (incluindo `translate-selection`) |
| Unitária (Node) | `legendas.test.js` | **Legendas ao Vivo e Bilinguismo (v1.4.0)** — lógica pura compartilhada (`clarifica-puro.js`): `planoDeJanelas` (janela única, passo com sobreposição contígua, final curta, inválidos sem laço infinito, opções saneadas), `montadorVtt` (cabeçalho/carimbos, ordenação, dedupe por inicio+texto, descarte e clamp), `seletorDeVideoAlvo` (maior área visível, descartes, empate, ausência), `auditoriaLegendas` (sem track, captions/subtitles, kind incorreto, mistura); **paridade fonte a fonte** das cópias inline (popup/background) com o módulo; **protocolo de mensagens simulado em memória** (o offscreen.js REAL avaliado em Node: captura → janelas → Whisper falso → WebVTT → entrega → limpeza idempotente); fluxos do popup (toggle iniciar/parar com persistência, erro traduzido, troca de idioma reiniciando a captura, reabertura restaurando estado, verificador com contagens, transcript ao vivo, captura encerrada externamente); integração manifest/offscreen |
| Unitária (Node) | `popup.test.js` | Fluxos completos dos 17 controles, 3 filtros com **intensidade interpolada**, reaplicação ao soltar o slider, persistência de tema/filtro/intensidade (`chrome.storage` restaurado ao reabrir), ciclo do tema claro/escuro, interface pt-BR, resumo e descrição de imagens ponta a ponta (Worker substituído por stub de mensagens com códigos de erro traduzidos), tratamento de erros de injeção; estrutura da v1.4.0 (toggle de legendas, verificador sem aria-pressed, seletor com 2 opções e rótulo) |
| Unitária (Node) | `accessibility.test.js` | axe-core no popup **nos temas claro e escuro** (violations críticas/serías/moderadas/menores = 0), contraste WCAG 1.4.3 AA nos pares de cor dos dois temas, estados de foco/hover, semântica ARIA |
| Unitária (Node) | `css-filters.test.js` | A lógica pura de filtros é extraída e exercitada em Node: matrizes `feColorMatrix` válidas (20 valores, linhas RGB somam 1, alfa preservado), interpolação de intensidade (0/25/50/75/100 e fora da faixa) preservando as propriedades, formatação e construção do data URI, variáveis dos dois temas no CSS |
| Unitária (Node) | `i18n.test.js` | Paridade total pt_BR↔en (mesmas chaves), placeholders estruturalmente corretos, toda chave usada no código/HTML existe nos dois locales, nenhuma chave órfã, textos contratados preservados |
| Unitária (Node) | `ai-worker.test.js` | **Inferência de IA real** — sem simulacros: o código do worker é executado de verdade com a Transformers.js 2.14.0 oficial (a mesma vendada) e os modelos quantizados fixados do projeto, produzindo sumarização real (`Xenova/distilbart-cnn-12-6`), descrição real de imagem (`Xenova/vit-gpt2-image-captioning`), **transcrição real de fala** (`Xenova/whisper-tiny` sobre o discurso do JFK em `jfk.wav`, com o reamostrador 16 kHz real do projeto), **OCR real** (`Xenova/trocr-small-printed` sobre imagem de texto impressa), **tradução real EN→PT** (`Xenova/opus-mt-en-ROMANCE` com prefixo `>>pt<<`) e a **tarefa de tradução do Whisper real** (v1.4.0: `opcoes.tarefa=traduzir` executa `task: translate` sem quebrar o pipeline); valida carregamento, reuso dos modelos, protocolo de mensagens e ausência de CDN |
| Unitária (Node) | `versoes-modelos.test.js` | Integridade do registry de versões: biblioteca vendada (`vendor/transformers.min.js` + 4 WASM com cabeçalho real), worker sem CDN e com URLs locais injetadas, **os 5 modelos** com revisões (SHA) fixadas, **TTS declarado como Web Speech API sem modelo**, manifest publicando `vendor/*`, pré-baixa, devDependency e chave de cache do CI sincronizados com [`clarifica-ai/VERSOES_MODELOS.md`](clarifica-ai/VERSOES_MODELOS.md) |
| Unitária (Node) | `multimodal.test.js` | **Áudio e Multimodal (v1.3.0)** — lógica pura da reamostragem 16 kHz (rampa linear exata, pontas preservadas, 48 kHz → 16 kHz, entradas inválidas); fluxos completos no popup: transcrição sem mídia/CORS/erro do worker, PCM 16 kHz atravessando a fronteira, OCR aplicado como `alt`/`aria-label` com anúncio de contagem e sem Worker zumbi, tradução com seleção vazia e com trecho selecionado, TTS toggle com voz do idioma e degradação sem `speechSynthesis`; falha de injeção nos quatro fluxos novos |
| Unitária (Node) | `perfis.test.js` | **Perfis Neurodivergentes (v1.2.0)** — lógica pura dos três CSS extraída e exercitada em Node (TEA pausa sem tocar no `html`; TDAH com holofote por variáveis CSS; dislexia com espaçamento + restauração monoespaçada por último); fluxos completos no popup (toggle, troca exclusiva, persistência e restauração do `perfilAtivo`, erro de injeção); estado real na página alvo (estilos por id, holofote seguindo o mouse, navegação `Alt+↓/↑` ignorando blocos vazios, régua acompanhando o cursor, fallback sem canvas, limpeza idempotente) |
| **E2E (Chromium real)** | `e2e/carregamento.spec.js` | A extensão é aceita pelo Chrome de verdade: service worker MV3 registrado, popup abre com **15 botões** (incluindo perfis, áudio/multimodal, legendas e verificador)/`aria-live`/slider/tema/**seletor de idioma das legendas com 2 opções** e **zero erros de console**; **o vendor é servido pela própria extensão e importável** (bundle 2.14.0 + WASM válido, sem CDN) |
| **E2E (Chromium real)** | `e2e/popup.spec.js` | Cliques reais no popup aplicam Leitura Essencial (ARIA + foco) e filtros de daltonismo em página HTTP real; **Perfis TEA e Dislexia aplicados e desligados na página real (v1.2.0)**; caminho de erro do resumo; **tradução sem seleção com erro claro e nenhum modelo carregado (v1.3.0)**; **verificador WCAG 1.2.2 na página real com 3 vídeos (com/sem track/kind incorreto → "2 de 3 vídeos sem legendas") e página sem vídeos (v1.4.0)**; **toggle das legendas com feedback claro e desmontagem do host de legendas pelo `reset-all` no mundo isolado real (v1.4.0)**; IA real opt-in (`CLARIFICA_E2E_IA=1`) — **o worker Blob importa o bundle vendado e resume de verdade dentro do navegador** |
| **E2E (Chromium real)** | `e2e/service-worker.spec.js` | Atalhos de teclado (espelho fiel do listener): anúncio `aria-live` assertivo com a mensagem do motor de mensagens, `TRIGGER_ACTION`, restauração completa da página e robustez com ação desconhecida — injeção via `chrome.scripting` real |

**Como executar:**

```bash
cd clarifica-ai/tests
npm install
npm test            # suíte unitária completa (inclui inferência de IA real)
npm run test:e2e    # extensão no Chromium real via Playwright
```

> **Pré-requisitos:** os testes E2E exigem o navegador do Playwright — instale uma vez com `npx playwright install chromium`. **Inferência real:** o teste de IA executa os modelos de verdade — na primeira execução em uma máquina nova os pesos (~800 MB) são baixados do Hugging Face para `clarifica-ai/tests/.cache`. Para pré-baixar antes: `npm run preparar:modelos`. **Máquinas com menos de ~6 GB de RAM:** executar com `npm test -- --test-concurrency=1` (os 5 modelos residentes elevam o pico de memória; observação documentada desde a revisão 8 do `TEST_REPORT.md`).

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
| **v1.3.0** | **Áudio e multimodal — ✅ entregue em 09/11/2026** | **Transcrição de áudio local** (Whisper-tiny quantizado, multilíngue, com reamostragem 16 kHz determinística na página, para vídeos e podcasts); **OCR** nas imagens sem alt (TrOCR-small quantizado, texto aplicado como `alt`/`aria-label` — WCAG 1.4.5); **leitura em voz alta** com TTS local (Web Speech API — vozes do sistema, sem modelo e sem download, toggle com `aria-pressed`, integrada ao `Ctrl+Shift+X`); **tradução instantânea de trechos** EN→PT (opus-mt-en-ROMANCE quantizado, destino fixado por `>>pt<<`, comando configurável sem atalho sugerido); registry de versões sobe para 3 (5 modelos fixados por SHA + decisão TTS) e chave de cache do CI muda em lockstep; relatório consolidado na revisão 8 do `TEST_REPORT.md` |
| **v1.4.0** | **Legendas ao vivo, bilinguismo e acessibilidade audiovisual — ✅ entregue em 10/11/2026** | **Legendas CC ao vivo sobre o vídeo** (carro-chefe): captura do áudio da aba (`chrome.tabCapture` + documento offscreen — fecha os três gaps da transcrição pontual: `blob:`/CORS, sincronia e teto de 120 s), Whisper em janelas contínuas de 7 s com 1 s de sobreposição, `<track kind="captions">` com WebVTT e fallback de sobreposição, chip de estado e anúncio único, desmontagem limpa por toggle/`Ctrl+Shift+X`/navegação; **bilinguismo do conteúdo** (seletor original × inglês via `task: translate` do Whisper — zero modelos novos); **verificador mínimo do critério WCAG 1.2.2** (auditar e agir); **lógica pura compartilhada** em `scripts/clarifica-puro.js` com paridade garantida por teste; **recursos complementares documentados** (VLibras, NVDA, JAWS); **README_EN.md** criado em lockstep; suíte 120 → 154 testes, E2E ampliado, relatório consolidado na revisão 9 do `TEST_REPORT.md` |
| **v2.0** | **Versão final** | Assistente de perguntas e respostas sobre a página (QA local); modelos multilíngues pt-BR para resumo e descrição de imagens (incluindo Português Claro em ordem direta — com base em modelo, não em regras); painel de auditoria de acessibilidade da página (relatório WCAG em tempo real); sincronização de perfis; publicação na Chrome Web Store; suporte a Firefox (WebExtensions) |

Cada etapa do roadmap mantém os princípios do projeto: execução local da IA, privacidade por padrão (Privacy by Design) e acessibilidade como requisito, não como acessório.

## ⚠️ Limitações conhecidas

- Os modelos atuais de resumo, descrição de imagens e OCR geram texto em **inglês** (o OCR reproduz o texto que está na imagem); a tradução EN→PT e a transcrição Whisper cobrem outros idiomas, mas a conversão completa para modelos multilíngues pt-BR está prevista na v2.0.
- A transcrição processa o **primeiro** `<video>`/`<audio>` da página com fonte http(s) e até **120 segundos** de áudio — mídias protegidas por CORS (ex.: plataformas de vídeo em streaming) recebem mensagem clara e não são transcritas.
- **Legendas ao vivo (v1.4.0):** são **aproximadas em tempo real** (atraso típico de 5 a 15 s — janela de 7 s mais inferência do Whisper; o modelo não é de streaming); buscas (seek) no vídeo podem dessincronizar o track — o chip/overlay continuam exibindo a fala corrente; a qualidade da **tradução para inglês** pelo modelo tiny é aproximada (melhorar com whisper-base segue o procedimento de upgrade do registry); plataformas com **DRM** (Netflix, Prime Video) produzem silêncio na captura — limitação do próprio Chrome; em algumas configurações a captura pode alterar o áudio da aba (o offscreen reconecta o fluxo para preservar quem ouve; comportamento dependente de hardware).
- O OCR lê **texto impresso** (não manuscrito) e funciona melhor em imagens com poucas linhas; páginas inteiras não são convertidas — só as imagens sem `alt`.
- A leitura em voz alta depende das **vozes instaladas no sistema**; sem voz compatível, o navegador usa a voz padrão.
- Páginas restritas (`chrome://`, Chrome Web Store) não permitem injeção de scripts — comportamento de segurança do próprio navegador (as legendas ao vivo informam `aba-sem-midia` nelas).
- Textos com menos de 200 caracteres não são resumidos (proteção contra resultados sem contexto).
- A primeira execução de cada recurso de IA baixa o modelo correspondente e exige conexão; o uso posterior é offline (as legendas ao vivo não baixam nada para quem já usou a transcrição).
- Os efeitos aplicados em páginas (perfis, filtros, Leitura Essencial, legendas) valem para a página atual; ao navegar, basta reativar com um clique — as escolhas ficam memorizadas no popup.

## 🧰 Recursos complementares recomendados

O Clarifica.ai é uma camada local de acessibilidade; para necessidades além do escopo do produto, estas ferramentas maduras se complementam bem (nenhuma integração de código — recomendação documentada):

- **VLibras** — suíte pública do governo brasileiro para tradução de conteúdo para **Libras** (a partir de português); distribuída como extensão própria, o que no Manifest V3 não pode ser disparada por outra extensão de forma suportada. Detecção e sugestão de instalação podem ser reavaliadas na v2.0 se houver demanda registrada.
- **NVDA** — leitor de tela livre para Windows; os anúncios `aria-live` da extensão foram projetados e testados para o fluxo dele.
- **JAWS** — leitor de tela comercial amplamente usado no Brasil; o Modo Leitura Essencial e os atalhos de teclado seguem os padrões que ele e o NVDA melhor navegam.

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
