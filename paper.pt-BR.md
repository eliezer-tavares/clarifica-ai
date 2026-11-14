---
title: 'Clarifica.ai: uma extensão de navegador privacy-first para IA de acessibilidade no dispositivo'
tags:
  - JavaScript
  - accessibility
  - edge AI
  - browser extension
  - WebExtensions
  - screen readers
  - WCAG
authors:
  - name: Eliezer Tavares de Oliveira
    orcid: 0009-0007-2577-8635
    affiliation: 1
affiliations:
  - name: Universidade Virtual do Estado de São Paulo (UNIVESP), Brasil
    index: 1
date: 12 de novembro de 2026
bibliography: paper.bib
---

# Resumo

Clarifica.ai é uma extensão de navegador que traz um conjunto completo de recursos de acessibilidade à web, com toda a inteligência artificial executada **no próprio dispositivo** (Edge AI). É entregue como um pacote WebExtensions (Manifest V3 para navegadores Chromium e Manifest V2 para Firefox) cujo único núcleo de inteligência — uma versão incorporada (vendored) do Transformers.js com modelos quantizados fixados por SHA — executa perguntas e respostas extrativas sobre a página atual, resumo de texto, descrição de imagens, OCR de texto impresso, reconhecimento de fala (incluindo legendas ao vivo com um modo bilíngue) e tradução de inglês para português. Os recursos sem IA incluem três perfis neurodivergentes (autismo, TDAH, dislexia), filtros para daltonismo com intensidade ajustável, um modo de Leitura Essencial orientado a leitores de tela, um painel de auditoria WCAG em tempo real e a sincronização de perfis e filtros entre abas e navegações. Cada ação fornece feedback imediato por meio de regiões `aria-live` projetadas para usuários de leitores de tela (NVDA, JAWS), em conformidade com os critérios de sucesso do WCAG 2.1 e com a Lei Brasileira de Inclusão (Lei nº 13.146/2015). Nenhum texto, imagem ou áudio sai do dispositivo do usuário: não há servidores de backend, nem telemetria, nem dependências de execução de terceiros (a biblioteca de inferência é incorporada ao pacote e cada modelo é fixado a um commit específico do Hugging Face).

# Justificativa de necessidade

As ferramentas de acessibilidade web dependem esmagadoramente de serviços em nuvem: APIs de resumo, descrição de imagens e transcrição processam o conteúdo do usuário em servidores remotos, o que levanta barreiras de privacidade exatamente para as populações que dependem delas e impede o uso offline. Ao mesmo tempo, usuários cegos e com baixa visão — e usuários com deficiências cognitivas — precisam de feedback imediato e localizado na interface que já operam com um leitor de tela, não de painéis para interpretar.

O Clarifica.ai foi projetado a partir dessa vivência: o autor é cego, usuário de leitor de tela e estudante de engenharia de computação, e cada decisão de produto é exercitada por uma suíte de testes automatizados (199 testes unitários com inferência real de modelos, além de 25 testes end-to-end — 23 na suíte padrão e 2 testes opt-in com IA real — carregando a extensão em um Chromium real). O projeto preenche uma lacuna concreta: uma **única extensão de navegador privacy-first** que combina modelos locais com capacidade de geração (QA extrativo, resumo, descrição de imagens, ASR) a recursos de acessibilidade assistidos por modelo e sem regras de reescrita, auditável (revisões de modelos fixadas por SHA, biblioteca vendored, CI reprodutível) e projetada em torno do feedback de leitor de tela como requisito de primeira classe. Em especial, o question answering extrativo foi escolhido no lugar de modelos generativos para que as respostas sejam sempre trechos do próprio texto da página — a alucinação é eliminada por construção, propriedade comprovada pela suíte de testes.

O software também é um entregável acadêmico (Projeto Integrador VI, UNIVESP), em que a reprodutibilidade é um requisito: revisões de modelos fixadas garantem que um avaliador possa reproduzir todos os resultados apresentados meses depois.

# Estado da arte

O Transformers.js [@wolf-transformers] levou os modelos transformer do Hugging Face aos tempos de execução JavaScript, e seu backend WebAssembly/ONNX torna viável a inferência quantizada (int8) em uma aba de navegador. Sobre essa base, a pesquisa e os produtos de IA acessível seguiram majoritariamente dois caminhos: ferramentas assistivas mediadas por servidor (que sacrificam a privacidade e o uso offline) ou ferramentas locais de recurso único. Extensões de acessibilidade baseadas em navegador costumam tratar uma única dimensão — texto alternativo automático, ajuste de cores ou auxílios de leitura — mas não combinam geração local, feedback de leitor de tela e auditoria de padrões em um único pacote auditável.

Para cada capacidade, o Clarifica.ai se apoia em modelos abertos consagrados: DistilBART [@shleifer-rush-2020] para resumo abstrativo; encoder ViT [@dosovitskiy-2021] com decodificador GPT-2 [@radford-gpt2] para descrição de imagens; Whisper [@whisper] para reconhecimento de fala multilíngue (usado tanto para transcrição sob demanda quanto para legendas ao vivo contínuas por meio da captura de aba do Chrome com um documento offscreen); TrOCR [@trocr] para OCR de texto impresso; modelos Marian opus-mt [@opusmt] [@marian] para tradução de inglês para português (destino fixado pela convenção multilíngue `>>pt<<`); e um modelo destilado do SQuAD [@distilbert] para perguntas e respostas extrativas. A entrega de legendas ao vivo em WebVTT e o feedback `aria-live` seguem as especificações do W3C e o WCAG 2.1 [@wcag21]. Pelo conhecimento do autor, nenhuma extensão de navegador de código aberto combina este conjunto de capacidades no dispositivo com versionamento de modelos fixado por SHA e uma metodologia de testes que coloca o leitor de tela em primeiro lugar.

# Uso

Após carregar a pasta `clarifica-ai/` como uma extensão não empacotada (Chrome 116+; Firefox 115+ por meio do manifest MV2 fornecido), o popup expõe todos os recursos com navegação por teclado; atalhos globais estão disponíveis para as ações mais frequentes (`Ctrl+Shift+L` Leitura Essencial, `Ctrl+Shift+R` Resumir, `Ctrl+Shift+A` Descrever Imagens, `Ctrl+Shift+X` Redefinir). O primeiro uso de cada recurso de IA baixa o modelo correspondente (~865 MB no total para os seis modelos); depois disso, a extensão funciona totalmente offline.

Fluxos de trabalho representativos:

- **Pergunte à página** (`question-answering`): digite uma pergunta no popup; a resposta é um trecho do conteúdo principal da página (até 4.000 caracteres de contexto).
- **Resuma / descreva imagens em português**: selecione o idioma de saída no popup; a saída do modelo em inglês é traduzida no mesmo Web Worker pelo modelo opus-mt fixado (cadeia modelo→modelo, sem pesos novos), com um modo opcional de Português Claro (frases curtas, ordem direta) dirigido por parâmetros de geração, e não por regras de reescrita de texto.
- **Legendas ao vivo**: acione o botão de legendas; o gesto do clique habilita a captura de áudio da aba, um documento offscreen dedicado alimenta o Whisper com janelas sobrepostas de 7 segundos e as legendas são entregues como um fluxo WebVTT nativo `<track kind="captions">`, com sobreposição (overlay) como alternativa.
- **Painel de auditoria WCAG**: abre um diálogo acessível não modal que lista barreiras em sete critérios de sucesso (1.1.1, 1.2.2, 1.3.1, 2.4.1, 2.4.4, 3.1.1, 4.1.2) com contagens e dicas de correção, re-auditado a mutações da página (`MutationObserver` com debounce).
- **Perfis neurodivergentes e filtros de cor**: três perfis exclusivos (autismo, TDAH, dislexia) e três filtros para daltonismo com interpolação matemática de intensidade; o estado ativo é reaplicado automaticamente a cada navegação e propagado às abas abertas.

# Implementação e arquitetura

A extensão é organizada em torno de um **Web Worker** isolado (`scripts/ai-worker.js`) que carrega o pacote vendored do Transformers.js com binários WASM servidos do próprio pacote da extensão (sem CDN desde a v1.1.0, satisfazendo a CSP do Manifest V3 sem exceções). O worker expõe um protocolo de mensagens (`summarize`, `describe-image`, `transcribe-audio`, `ocr-image`, `translate-text`, `question-answering`) com códigos de erro que são traduzidos no contexto de destino, já que funções injetadas não têm acesso ao `chrome.i18n`.

Lógica compartilhada que atravessa contextos vive em um módulo puro (`scripts/clarifica-puro.js`): reamostragem de áudio para 16 kHz mono, planos de janelas para transcrição contínua, montagem de WebVTT, seleção do vídeo alvo, auditoria de legendas do critério 1.2.2, auditoria WCAG completa e parâmetros de geração para o Português Claro. Funções que precisam rodar dentro de funções injetadas (que o Chrome serializa sem escopo de closure) existem como cópias inline marcadas, cuja paridade com a fonte canônica é comprovada por testes automatizados — a mesma disciplina aplicada aos dicionários de mensagens pt-BR/en.

As legendas ao vivo seguem o padrão recomendado do MV3: o clique no popup fornece o gesto do usuário; o service worker garante exatamente um documento offscreen e obtém o identificador do fluxo via `chrome.tabCapture.getMediaStreamId` (com teto de segurança de 5 segundos e uma alternativa pelo popup); o documento offscreen adquire o `MediaStream` da aba, alimenta janelas sobrepostas ao Whisper e devolve transcrições parciais que o service worker entrega à página e transmite ao popup.

A sincronização de perfis e filtros usa `chrome.storage.local` como fonte única de verdade: o service worker relê o estado e o injeta a cada navegação concluída (`tabs.onUpdated`) e o propaga a até 20 abas http(s) abertas sob demanda; a limpeza reusa a mesma rotina de redefinição do atalho global. Cópias canônicas da lógica de estilos de filtros e perfis no service worker são mantidas idênticas às do popup por testes de paridade no nível do código-fonte.

A qualidade é garantida por duas portas de CI (GitHub Actions): uma suíte Node (`node --test`, 199 testes, incluindo inferência real com todos os seis modelos fixados) e uma suíte end-to-end (Playwright 1.57 carregando a extensão não empacotada em Chromium real, 23 testes na bateria padrão mais 2 testes opt-in de IA real no navegador — 25 no total). As revisões dos modelos são fixadas por SHA de commit em um registro de versões (`VERSOES_MODELOS.md`) que também é validado por um teste dedicado, e a chave de cache de modelos do CI embute os SHAs, de modo que atualizações de modelo invalidem o cache deliberadamente.

# Agradecimentos

O autor agradece ao corpo docente da UNIVESP e ao processo de mentoria do Projeto Integrador VI, às comunidades de código aberto por trás dos modelos fixados (Hugging Face, Xenova, ONNX Runtime, Mozilla) e à comunidade do NVDA por décadas de orientação de acessibilidade que moldaram os padrões de feedback deste projeto.

# Referências
