# 🧠 Clarifica.ai

> Acessibilidade universal com Inteligência Artificial local: **perguntas e respostas sobre a página**, resumos em **português**, descrição de imagens, **legendas CC ao vivo**, transcrição de áudio, OCR, tradução EN→PT, leitura em voz alta, Modo Leitura Essencial, filtros para daltonismo, perfis neurodivergentes sincronizados (TEA, TDAH, Dislexia) e **painel de auditoria WCAG em tempo real** — direto no navegador, 100% offline.

**Licença:** Apache-2.0 · **Versão:** 2.0.0 (versão final) · **Manifest:** V3 (Chrome/Chromium) + MV2 (Firefox) · **Navegadores:** Chrome 116+, Edge, Brave e outros Chromium · Firefox 115+ (sem legendas ao vivo) · **IA:** Edge AI (local), sem envio de dados

![CI](https://github.com/eliezer-tavares/clarifica-ai/actions/workflows/ci.yml/badge.svg)

**Links rápidos:**

- **Repositório:** <https://github.com/eliezer-tavares/clarifica-ai>
- **Releases:** <https://github.com/eliezer-tavares/clarifica-ai/releases>
- **Citação:** [`CITATION.cff`](CITATION.cff) — metadados máquina-legíveis (Citation File Format 1.2.0), habilitam o botão "Cite this repository" e o DOI no Zenodo
- **Artigo técnico:** [`paper.md`](paper.md) (inglês) e [`paper.pt-BR.md`](paper.pt-BR.md) (português), com bibliografia em [`paper.bib`](paper.bib) — base para PDF e arquivamento com DOI no Zenodo
- **Testes:** relatório consolidado em [`clarifica-ai/tests/TEST_REPORT.md`](clarifica-ai/tests/TEST_REPORT.md) (pt-BR) e [`clarifica-ai/tests/TEST_REPORT_EN.md`](clarifica-ai/tests/TEST_REPORT_EN.md) (English)
- **Contribuição e segurança:** [`CONTRIBUTING.md`](CONTRIBUTING.md) (ambiente, convenções e processo de PRs) · [`SECURITY.md`](SECURITY.md) (canal privado para vulnerabilidades) · [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) (conduta da comunidade)
- **ORCID:** [0009-0007-2577-8635](https://orcid.org/0009-0007-2577-8635)
- **Documentação detalhada:** [funcionalidades e uso](docs/FUNCIONALIDADES.md) · [arquitetura e notas de engenharia](docs/ARQUITETURA.md) · [limitações e recursos complementares](docs/LIMITACOES.md) · [suíte de testes](docs/TESTES.md) · [versões e histórico](VERSOES.md) · [registry de modelos](clarifica-ai/VERSOES_MODELOS.md) · [Firefox](docs/FIREFOX.md) · [Chrome Web Store](docs/CHROME_WEB_STORE.md) · [política de privacidade](docs/PRIVACY_POLICY.md)

---

## 📖 Sobre o projeto

O Clarifica.ai é uma extensão de navegador que transforma qualquer página web em uma experiência mais clara, compreensível e inclusiva. Toda a inteligência roda no próprio dispositivo (Edge AI): os modelos de linguagem e de visão são baixados uma única vez, armazenados em cache do navegador e executados localmente, garantindo privacidade total — nenhum texto, imagem ou dado de navegação sai do computador do usuário. A extensão foi arquitetada para pessoas que utilizam leitores de tela (NVDA, JAWS), pessoas com daltonismo e qualquer pessoa que precise de menos ruído visual e cognitivo na web. Cada ação gera feedback imediato por meio de regiões `aria-live`, em conformidade com as diretrizes WCAG 2.1 e com a Lei Brasileira de Inclusão (Lei nº 13.146/2015).

## ✨ Funcionalidades

- 📖 **Modo Leitura Essencial** — silencia navegação, rodapés e propagandas e move o foco ao conteúdo principal (`Ctrl+Shift+L`).
- ✨ **Resumo com IA** — DistilBART quantizado em Web Worker dedicado (`Ctrl+Shift+R`).
- 🖼️ **Descrição de imagens** — ViT-GPT2 gera `alt`/`aria-label` para imagens sem descrição (`Ctrl+Shift+A`).
- ❓ **Perguntas e respostas (QA extrativo)** — a resposta é sempre um trecho do próprio texto da página: sem alucinação por construção (distilbert-squad).
- 🇧🇷 **Saída em português + Português Claro** — cadeia modelo→modelo no mesmo worker; frases curtas e ordem direta via parâmetros de geração.
- 💬 **Legendas CC ao vivo** — captura do áudio da aba + Whisper local em janelas contínuas de 7 s; `<track>` WebVTT com fallback de sobreposição; sem teto de duração.
- 🌍 **Bilinguismo das legendas** — idioma original ou inglês (`task: translate` do Whisper — zero modelos novos).
- 🎙️ **Transcrição de áudio** — primeiro vídeo/áudio da página com Whisper-tiny (reamostragem 16 kHz; teto de 120 s).
- 📄 **OCR nas imagens** — TrOCR-small aplica o texto impresso como `alt`/`aria-label` (WCAG 1.4.5).
- 🌍 **Tradução EN→PT de trechos** — opus-mt com destino fixado por `>>pt<<` (até 1.500 caracteres).
- 🔊 **Leitura em voz alta** — Web Speech API com as vozes do sistema (sem modelo, sem download).
- 🔴🟢🔵 **Filtros para daltonismo** — protanopia, deuteranopia e tritanopia com intensidade interpolada de 0 a 100% (WCAG 1.4.1).
- 🧩 **Perfis neurodivergentes** — TEA (menos estímulos), TDAH (holofote e blocos de leitura) e Dislexia (espaçamento e régua), exclusivos, persistidos e sincronizados entre abas.
- 🧪 **Painel de auditoria WCAG em tempo real** — 7 critérios com contagens e dicas de correção; dialog acessível que fecha com `Esc` e se atualiza com a página.
- 🔍 **Verificador WCAG 1.2.2** — inventaria os vídeos sem legenda e gera as legendas ali mesmo.
- 🔄 **Sincronização** — filtro e perfil reaplicados a cada navegação e propagados às abas já abertas (teto de 20).
- ♻️ **Restaurar página** — `Ctrl+Shift+X` desliga tudo e devolve a página ao estado original.

O que acontece em cada recurso, como acionar pelo popup e o que você ganha na prática: [`docs/FUNCIONALIDADES.md`](docs/FUNCIONALIDADES.md).

## ⚙️ Requisitos

- Navegador baseado em Chromium, versão **116 ou superior** (Chrome, Edge, Brave, Opera) — a v1.4.0 subiu o mínimo de 102 para 116 porque o `chrome.tabCapture.getMediaStreamId` no service worker exige Chrome 116+ (o documento offscreen existe desde o 109). **Firefox 115+** é suportado via Manifest V2 (`manifest.firefox.json`) com todas as funções, exceto as legendas ao vivo (a captura de aba não existe no Firefox — limitação declarada).
- Cerca de **865 MB** de espaço livre para os modelos de IA, baixados uma única vez na primeira execução de cada recurso (~300 MB para resumo, ~250 MB para visão, ~115 MB para tradução, ~70 MB para perguntas e respostas, ~60 MB para OCR, ~45 MB para transcrição/legendas — a leitura em voz alta usa as vozes do sistema e não baixa nada). **A v2.0.0 adiciona apenas o modelo de QA (~70 MB)**: a saída em português NÃO adiciona modelo (cadeia modelo→modelo com o opus-mt já fixado).
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

| Atalho | Ação |
|--------|------|
| `Ctrl+Shift+L` | Modo Leitura Essencial |
| `Ctrl+Shift+R` | Resumir página com IA |
| `Ctrl+Shift+A` | Descrever imagens |
| `Ctrl+Shift+X` | Restaurar página original |

**Pelo popup:** clique no ícone do Clarifica.ai, navegue com `TAB` até o botão desejado e pressione `ENTER`. A barra de status informa cada etapa ("Processando...", "Concluído!", erros e avisos) e os resultados aparecem na caixa "Resultado:". Os perfis TEA, TDAH e Dislexia são botões no popup (clicar de novo desliga); as legendas ao vivo, o QA e o painel WCAG também partem do popup.

O guia passo a passo de cada recurso, com o feedback esperado no leitor de tela: [`docs/FUNCIONALIDADES.md`](docs/FUNCIONALIDADES.md).

## 🧪 Testes

**224 testes: 199 unitários** (Node, runner nativo, incluindo inferência de IA real com os 6 modelos fixados) **e 25 E2E** (23 na suíte padrão + 2 opt-in de IA real) com a extensão carregada de verdade no Chromium pelo Playwright.

```bash
cd clarifica-ai/tests
npm install
npm test            # suíte unitária completa (inclui inferência de IA real)
npm run test:e2e    # extensão no Chromium real via Playwright
```

> **Pré-requisitos:** os E2E exigem o navegador do Playwright (`npx playwright install chromium`, uma vez); a primeira execução baixa os pesos dos modelos (~865 MB); máquinas com menos de ~6 GB de RAM: `npm test -- --test-concurrency=1`; IA real dentro do navegador (opt-in): `CLARIFICA_E2E_IA=1 npm run test:e2e`.

- **Relatórios consolidados da última execução:** [`clarifica-ai/tests/TEST_REPORT.md`](clarifica-ai/tests/TEST_REPORT.md) (pt-BR) · [`clarifica-ai/tests/TEST_REPORT_EN.md`](clarifica-ai/tests/TEST_REPORT_EN.md) (English)
- **O que cada arquivo da suíte cobre:** [`docs/TESTES.md`](docs/TESTES.md) (pt-BR) · [`docs/TESTING.md`](docs/TESTING.md) (English)
- **CI:** dois portões independentes a cada push e pull request — suíte unitária com IA real (Node 24, pesos cacheados por SHA) e E2E no Chromium real; execuções públicas na aba [**Actions**](https://github.com/eliezer-tavares/clarifica-ai/actions). Qualquer regressão quebra o build **antes** de chegar ao usuário.

## 🔄 Versionamento dos modelos

A biblioteca de IA e cada modelo têm versão **fixada por commit (SHA)** no Hugging Face — nada flutua. O registry completo, o procedimento de upgrade passo a passo, os critérios de aceite e a política de rollback estão em [`clarifica-ai/VERSOES_MODELOS.md`](clarifica-ai/VERSOES_MODELOS.md). Um teste automatizado (`versoes-modelos.test.js`) confronta o registry com o código e quebra o CI em caso de divergência: mudanças de modelo são sempre deliberadas, testadas com inferência real e documentadas.

## 🗺️ Versões

| Versão | Foco | Entrega |
|--------|------|---------|
| **v1.0.0** | Entrega inicial | ✅ 06/11/2026 |
| **v1.1.0** | Estabilidade e configuração | ✅ 07/11/2026 |
| **v1.2.0** | Perfis neurodivergentes | ✅ 08/11/2026 |
| **v1.3.0** | Áudio e multimodal | ✅ 09/11/2026 |
| **v1.4.0** | Legendas ao vivo, bilinguismo e acessibilidade audiovisual | ✅ 10/11/2026 |
| **v2.0.0** | Versão final — QA local, saída em português, painel WCAG, sincronização, Firefox | ✅ 12/11/2026 |

O que foi planejado e entregue em cada versão, em detalhe: [`VERSOES.md`](VERSOES.md).

Cada etapa mantém os princípios do projeto: execução local da IA, privacidade por padrão (Privacy by Design) e acessibilidade como requisito, não como acessório.

## ⚠️ Limitações e recursos complementares

As limitações mais relevantes: o QA tem melhor qualidade em páginas em **inglês** (modelo treinado em inglês); as legendas ao vivo são **aproximadas em tempo real** (atraso típico de 5 a 15 s) e plataformas com **DRM** produzem silêncio na captura; o **Firefox** não tem legendas ao vivo (APIs ausentes na plataforma); o OCR lê apenas **texto impresso**. A lista completa e honesta das limitações e as ferramentas complementares recomendadas (VLibras, NVDA, JAWS): [`docs/LIMITACOES.md`](docs/LIMITACOES.md).

## 🤝 Contribuir e reportar problemas

Encontrou um bug, uma barreira de acessibilidade ou tem uma sugestão? Abra uma [issue](https://github.com/eliezer-tavares/clarifica-ai/issues) descrevendo a página visitada, o recurso utilizado (atalho ou botão do popup), o leitor de tela/navegador e o comportamento observado versus o esperado.

Pull requests são bem-vindos: o ambiente de desenvolvimento, as convenções e o processo completo estão no [`CONTRIBUTING.md`](CONTRIBUTING.md) — que documenta também o licenciamento das contribuições pela Seção 5 da Apache-2.0 (este projeto não usa CLA; não é preciso assinar nada). Antes de enviar, mantenha a suíte verde (`npm test` e `npm run test:e2e` dentro de `tests/`) e preserve os princípios do projeto: IA 100% local, privacidade por padrão e acessibilidade como requisito, não como acessório. **Vulnerabilidades de segurança não devem ser abertas como issue pública:** use o canal privado descrito no [`SECURITY.md`](SECURITY.md).

As interações da comunidade — issues, pull requests e espaços oficiais do projeto — seguem o [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

## 👤 Autoria e contexto acadêmico

**Arquitetado por** Eliezer Tavares de Oliveira
✉️ contact@eliezertavaresdeoliveira.com
GitHub: [github.com/eliezer-tavares](https://github.com/eliezer-tavares)
ORCID: [0009-0007-2577-8635](https://orcid.org/0009-0007-2577-8635)

Eliezer Tavares de Oliveira é cego e usuário de leitores de tela — uma vivência que fundamenta cada decisão de acessibilidade deste projeto, do feedback por `aria-live` aos atalhos de teclado pensados para NVDA e JAWS. É aluno do curso de **Engenharia de Computação** da **UNIVESP (Universidade Virtual do Estado de São Paulo)**, e esta aplicação foi arquitetada como entrega da disciplina **Projeto Integrador VI**.

**Camada acadêmica (v2.0.0):** o repositório inclui [`paper.md`](paper.md) (artigo técnico curto com bibliografia em `paper.bib`) e sua versão idêntica em português ([`paper.pt-BR.md`](paper.pt-BR.md)), além de [`CITATION.cff`](CITATION.cff) (Citation File Format 1.2.0) para citação máquina-legível e geração imediata de DOI via integração GitHub–Zenodo na publicação da release.

## 📄 Licença

Este projeto é distribuído sob a **Licença Apache 2.0**. Consulte o arquivo [`LICENSE`](LICENSE) para o texto completo em inglês, incluindo os termos de uso, reprodução e distribuição.
