# 🗺️ Versões e histórico do Clarifica.ai

> Registro detalhado do que foi planejado e entregue em cada versão do projeto. Princípios constantes em todas as etapas: execução local da IA, privacidade por padrão (Privacy by Design) e acessibilidade como requisito, não como acessório. O registry técnico das versões da biblioteca de IA e dos modelos (fixadas por SHA, com procedimento de upgrade e rollback) está em [`clarifica-ai/VERSOES_MODELOS.md`](clarifica-ai/VERSOES_MODELOS.md). Espelho em inglês: [`VERSIONS.md`](VERSIONS.md).

## v1.0.0 — Entrega inicial (✅ entregue em 06/11/2026)

Primeira versão funcional da extensão: **Modo Leitura Essencial** (silencia ruído da página e move o foco ao conteúdo principal), **resumo com IA** (DistilBART quantizado), **descrição de imagens** (ViT-GPT2 aplicando `alt`/`aria-label`), **filtros para daltonismo** (protanopia, deuteranopia e tritanopia), **restauração da página**, **feedback para leitores de tela** por anúncios `aria-live` e **popup acessível** navegável por teclado — tudo já com execução 100% local (Edge AI) e Manifest V3.

## v1.1.0 — Estabilidade e configuração (✅ entregue em 07/11/2026)

Empacotamento local da Transformers.js em `vendor/` (CDN eliminado, MV3 cumprido); configurações persistidas com `chrome.storage` (tema, último filtro, intensidade); ajuste fino da intensidade dos filtros de cor (0–100%); tema claro/escuro no popup (AA nos dois temas); internacionalização pt-BR/en com motor de mensagens próprio; relatório consolidado na revisão 5 do `TEST_REPORT.md`.

## v1.2.0 — Perfis neurodivergentes (✅ entregue em 08/11/2026)

**Perfil TEA** (pausa de animações, transições e rolagem suave; GIFs animados convertidos em quadro estático via canvas; remoção de sombras e blur); **Perfil TDAH** (modo foco com holofote ao redor do cursor; destaque progressivo de leitura por blocos com `Alt+↓/↑`); **Perfil Dislexia** (espaçamento de letras, palavras e linhas; fonte de leitura do sistema com código monoespaçado preservado; régua de leitura que acompanha o mouse); perfis exclusivos, toggláveis, persistidos e integrados ao `Ctrl+Shift+X`; relatório consolidado na revisão 6 do `TEST_REPORT.md`.

## v1.3.0 — Áudio e multimodal (✅ entregue em 09/11/2026)

**Transcrição de áudio local** (Whisper-tiny quantizado, multilíngue, com reamostragem 16 kHz determinística na página, para vídeos e podcasts); **OCR** nas imagens sem alt (TrOCR-small quantizado, texto aplicado como `alt`/`aria-label` — WCAG 1.4.5); **leitura em voz alta** com TTS local (Web Speech API — vozes do sistema, sem modelo e sem download, toggle com `aria-pressed`, integrada ao `Ctrl+Shift+X`); **tradução instantânea de trechos** EN→PT (opus-mt-en-ROMANCE quantizado, destino fixado por `>>pt<<`, comando configurável sem atalho sugerido); registry de versões sobe para 3 (5 modelos fixados por SHA + decisão TTS) e chave de cache do CI muda em lockstep; relatório consolidado na revisão 8 do `TEST_REPORT.md`.

## v1.4.0 — Legendas ao vivo, bilinguismo e acessibilidade audiovisual (✅ entregue em 10/11/2026)

**Legendas CC ao vivo sobre o vídeo** (carro-chefe): captura do áudio da aba (`chrome.tabCapture` + documento offscreen — fecha os três gaps da transcrição pontual: `blob:`/CORS, sincronia e teto de 120 s), Whisper em janelas contínuas de 7 s com 1 s de sobreposição, `<track kind="captions">` com WebVTT e fallback de sobreposição, chip de estado e anúncio único, desmontagem limpa por toggle/`Ctrl+Shift+X`/navegação; **bilinguismo do conteúdo** (seletor original × inglês via `task: translate` do Whisper — zero modelos novos); **verificador mínimo do critério WCAG 1.2.2** (auditar e agir); **lógica pura compartilhada** em `scripts/clarifica-puro.js` com paridade garantida por teste; **recursos complementares documentados** (VLibras, NVDA, JAWS); **README_EN.md** criado em lockstep; suíte 120 → 154 testes, E2E ampliado, relatório consolidado na revisão 9 do `TEST_REPORT.md`.

## v2.0.0 — Versão final (✅ entregue em 12/11/2026)

**Assistente de perguntas e respostas (QA local)** — modelo extrativo distilbert-squad fixado por SHA (registry sobe para v4), resposta sempre contida no texto da página (sem alucinação por construção); **saída em português** para resumo e descrição de imagens pela cadeia modelo→modelo (opus-mt já fixado — zero modelos novos) com **Português Claro assistido por modelo** (frases curtas e ordem direta via parâmetros de geração); **painel de auditoria de acessibilidade da página** (relatório WCAG em tempo real, 7 critérios, dialog acessível com Esc); **sincronização de perfis** (estado reaplicado em cada navegação e propagado às abas abertas, com cópias canônicas paridade-por-teste e limpeza pelo mesmo reset-all); **preparação para a Chrome Web Store** (guia de publicação + política de privacidade em `docs/`, zip pronto para upload); **suporte a Firefox** (Manifest V2 espelho, Firefox 115+, legendas ao vivo declaradas indisponíveis com honestidade de plataforma); **camada acadêmica** (`paper.md` para artigo técnico + `CITATION.cff` para arquivamento com DOI no Zenodo, na raiz); suíte 154 → 199 testes, E2E 20 → 25 (23 na suíte padrão + 2 opt-in de IA real), relatório consolidado na revisão 10 do `TEST_REPORT.md`.

## Depois da v2.0.0 — próximos passos

- **Publicação na Chrome Web Store** — o guia passo a passo já está pronto em [`docs/CHROME_WEB_STORE.md`](docs/CHROME_WEB_STORE.md), com a política de privacidade exigida pela loja em [`docs/PRIVACY_POLICY.md`](docs/PRIVACY_POLICY.md).
- **Listagem no Firefox Add-ons (AMO)** — empacotamento e particularidades da plataforma documentados em [`docs/FIREFOX.md`](docs/FIREFOX.md).
- **Documentação enxuta** — READMEs resumidos com links para a documentação detalhada em `docs/` (esta reestruturação).

Os relatórios consolidados de cada bateria de testes (revisões 1 a 15) estão em [`clarifica-ai/tests/TEST_REPORT.md`](clarifica-ai/tests/TEST_REPORT.md) e no espelho em inglês [`clarifica-ai/tests/TEST_REPORT_EN.md`](clarifica-ai/tests/TEST_REPORT_EN.md).
