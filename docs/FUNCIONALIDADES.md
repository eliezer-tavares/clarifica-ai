# ✨ Funcionalidades detalhadas — Clarifica.ai

> Complemento do [`README.md`](../README.md): tabela completa de funcionalidades, os ganhos práticos para cada perfil de usuário e o guia de uso passo a passo. Estado da documentação: v2.0.0.

## O que é possível fazer

| # | Funcionalidade | O que acontece | Como acionar |
|---|----------------|----------------|--------------|
| 1 | 📖 **Modo Leitura Essencial** | Silencia navegação, rodapés, barras laterais (`aside`), propagandas (`.ads`) e cabeçalhos por meio de `aria-hidden` + `inert`; move o foco para o conteúdo principal (`main`/`article`). Ideal para NVDA e JAWS. | `Ctrl+Shift+L` ou botão no popup |
| 2 | ✨ **Resumir texto com IA** | Extrai o texto principal da página e gera um resumo com o modelo DistilBART quantizado (int8), executado em Web Worker dedicado — a página nunca trava. O resultado aparece no popup em uma região ARIA rolável. | `Ctrl+Shift+R` ou botão no popup |
| 3 | 🖼️ **Descrever imagens** | Localiza todas as imagens sem `alt` (ou com `alt` vazio/genérico como `"image"`) e gera descrições com o modelo ViT-GPT2; aplica `alt`, `aria-label` ("Descrição por IA: …") e um contorno verde de confirmação em cada imagem processada. | `Ctrl+Shift+A` ou botão no popup |
| 4 | 🔴🟢🔵 **Filtros para daltonismo** | Aplica matrizes de correção cromática (`feColorMatrix` SVG) sobre a página inteira, com um clique e **intensidade ajustável (0–100%, interpolada matematicamente)**, para **protanopia**, **deuteranopia** e **tritanopia** (atende WCAG 1.4.1 — Uso de Cor). | Botões + controle no popup |
| 5 | ♻️ **Restaurar página** | Remove todos os efeitos aplicados: filtros de cor, silenciamento de regiões e elementos criados pela extensão. A página volta exatamente ao estado original. | `Ctrl+Shift+X` |
| 6 | 🔊 **Feedback para leitores de tela** | Cada ação injeta um anúncio `role="status"` com `aria-live="assertive"` e `aria-atomic="true"`, lido imediatamente pelo leitor de tela (WCAG 4.1.3 — Mensagens de Status). | Automático |
| 7 | 🖥️ **Popup acessível** | Barra de status ao vivo (`aria-live="polite"`), dezenove botões nativos navegáveis por `TAB`, campo de pergunta, seletor de idioma das legendas e da resposta da IA, controle de intensidade rotulado, área de resultado com `role="region"` e botão "Fechar". | Clique no ícone da extensão |
| 8 | 🌗 **Tema claro/escuro + configurações persistidas** | O popup acompanha o sistema (modo automático) ou fixa claro/escuro; tema, último filtro, perfil ativo e intensidade ficam persistidos via `chrome.storage` e restaurados ao reabrir (todos os pares de cor dos dois temas validados em AA). | Botão "Tema" no popup |
| 9 | 🌐 **Interface pt-BR/en** | Interface e anúncios do leitor de tela seguem o idioma do navegador (português ou inglês), com mensagens versionadas em `_locales` e auditadas por teste de paridade. | Automático |
| 10 | 🧩🎯🔤 **Perfis Neurodivergentes (v1.2.0)** | Três perfis prontos, exclusivos entre si e sem nenhuma IA/rede: **TEA** (pausa animações, transições e rolagem suave, converte GIFs animados em quadro estático via canvas e remove sombras/blur); **TDAH** (holofote que escurece a página ao redor do cursor e navegação progressiva por blocos de leitura com `Alt+↓/↑`); **Dislexia** (espaçamento de letras, palavras e linhas, fonte de leitura do sistema com código monoespaçado preservado, e régua de leitura que acompanha o mouse). Clique no perfil ativo para desligar; `Ctrl+Shift+X` também desfaz. | Botões de perfil no popup |
| 11 | 🎙️ **Transcrição de áudio (v1.3.0)** | Localiza o primeiro `<video>`/`<audio>` da página com fonte http(s), decodifica e reamostra o áudio para PCM mono 16 kHz (interpolação linear determinística) e transcreve com **Whisper-tiny quantizado** (multilíngue, idioma detectado automaticamente) em Web Worker dedicado. A transcrição aparece no popup e pode ser relida em voz alta. Mídia protegida por CORS recebe mensagem clara, sem travar. | `🎙️ Transcrever Áudio da Página` no popup |
| 12 | 📄 **OCR nas imagens (v1.3.0)** | Extrai o **texto impresso** das imagens sem `alt` com o modelo TrOCR-small quantizado e aplica o texto como `alt`/`aria-label` (WCAG 1.4.5 — imagens de texto passam a ser lidas pelo leitor de tela), com contorno verde de confirmação e anúncio de conclusão na página. | `📄 OCR — Texto nas Imagens` no popup |
| 13 | 🌍 **Tradução EN → PT (v1.3.0)** | Traduz instantaneamente o **trecho selecionado** na página com o modelo opus-mt quantizado (destino fixado em português), exibindo o resultado no popup e anunciando a conclusão por `aria-live`. Até 1.500 caracteres por tradução. | `🌍 Traduzir Seleção (EN → PT)` no popup (ou atalho configurável em `chrome://extensions/shortcuts`) |
| 14 | 🔊 **Leitura em voz alta (v1.3.0)** | Lê o trecho selecionado — ou o conteúdo principal da página — com as **vozes do sistema** (Web Speech API: sem modelo, sem download, offline). Toggle com `aria-pressed`: clicar de novo para; o `Ctrl+Shift+X` também interrompe. A fala continua mesmo com o popup fechado, porque vive na própria página. | `🔊 Ler em Voz Alta` no popup |
| 15 | 💬 **Legendas CC ao vivo (v1.4.0)** | **Carro-chefe da v1.4.0**: captura o áudio da ABA ativa (`chrome.tabCapture` + documento offscreen — funciona com `blob:`/YouTube e mídia sem CORS), transcreve em janelas contínuas de 7 s (com 1 s de sobreposição) com o **Whisper-tiny 100% local** e entrega cada transcrição parcial como legenda sobre o vídeo: `<track kind="captions">` com WebVTT (canal nativo, respeitado por leitores de tela e pelo controle CC), com **fallback de sobreposição** quando a página bloqueia o track (CSP). Chip discreto "Legendas ativas — captando áudio" e anúncio único para leitores de tela. Sem teto de duração e sem envio de áudio a servidores. Toggle com `aria-pressed`; desmontagem limpa pelo segundo clique e pelo `Ctrl+Shift+X`. | `💬 Legendas ao Vivo (CC)` no popup |
| 16 | 🌍 **Legendas em inglês — bilinguismo (v1.4.0)** | Seletor no popup alterna a tarefa do Whisper: **Original** (legenda no idioma da fala) ou **Inglês** (fala em qualquer idioma detectado vira legenda em inglês via `task: translate`). Nenhum modelo novo — o whisper-tiny multilíngue já fixado no projeto. Qualidade de tradução pelo modelo tiny é aproximada (limitação declarada). | Seletor `Idioma das legendas` no popup |
| 17 | 🔍 **Verificador WCAG 1.2.2 (v1.4.0)** | Função injetada de leitura (sem IA e sem rede) inventaria os `<video>` da página e conta quantos possuem `<track kind="captions">` ou `subtitles` — por exemplo, "2 de 3 vídeos sem legendas" — com ação direta: gerar as legendas ali mesmo com o recurso ao vivo. Versão mínima do ciclo auditar e agir (o painel completo segue no item 20). | `🔍 Verificar legendas (WCAG 1.2.2)` no popup |
| 18 | ❓ **Perguntas e respostas sobre a página (v2.0.0)** | Você digita uma pergunta e o modelo de QA EXTRATIVO (distilbert-squad quantizado, ~70 MB) responde com um TRECHO do próprio texto da página — sem geração livre, sem alucinação por construção. O contexto é o conteúdo principal da página (teto de 4.000 caracteres). | `❓ Perguntar à IA da Página` + campo no popup |
| 19 | 🇧🇷 **Saída em português + Português Claro (v2.0.0)** | O resumo e a descrição de imagens podem sair em **português** pela cadeia modelo→modelo (texto gerado em inglês é traduzido no mesmo worker pelo opus-mt já fixado — zero modelos novos). A opção **Português Claro** gera frases curtas e ordem direta assistida por MODELO (parâmetros de geração, não regras de reescrita). | Seletor `Idioma da resposta da IA` + checkbox no popup |
| 20 | 🧪 **Painel de auditoria WCAG em tempo real (v2.0.0)** | Painel acessível (dialog NÃO modal, foco gerenciado, fecha com Esc) injetado na página que audita **7 critérios WCAG**: imagens sem alt (1.1.1), vídeos sem legendas (1.2.2), hierarquia de títulos (1.3.1), iframes sem title (2.4.1), links genéricos (2.4.4), html sem lang (3.1.1) e controles sem nome acessível (4.1.2) — com contagens, dicas de correção e **atualização automática enquanto a página muda** (leitura pura de estado, sem IA e sem rede). | `🧪 Painel de Auditoria WCAG` no popup |
| 21 | 🔄 **Sincronização de perfis e filtros (v2.0.0)** | O filtro de daltonismo e o perfil ativo são **reaplicados automaticamente em cada navegação** e propagados para as abas http(s) já abertas (teto de 20 abas) — o estado vive no `chrome.storage` como fonte única. Controle do usuário no popup; o `Ctrl+Shift+X` limpa todas as abas sincronizadas. | Checkbox `Aplicar automaticamente ao navegar` no popup |

## O que você ganha na prática

- **Menos ruído:** páginas densas (portais de notícias, dashboards) ficam focadas apenas no conteúdo relevante.
- **Imagens compreensíveis:** fotos e gráficos sem descrição passam a ter `alt` gerado pela IA.
- **Textos mais curtos:** artigos longos viram resumos em segundos, sem copiar e colar em sites externos.
- **Cores corrigidas:** os três tipos mais comuns de daltonismo contemplados instantaneamente.
- **Web sem sobrecarga:** os perfis TEA, TDAH e Dislexia reduzem estímulos, mantêm o foco e facilitam a leitura — cada um em um clique.
- **Áudio compreensível:** vídeos e podcasts incorporados viram texto transcrito localmente, legível por leitores de tela e relido em voz alta.
- **Vídeos acompanháveis:** legendas CC geradas no dispositivo e sincronizadas sobre o vídeo enquanto ele roda — incluindo fontes `blob:` (YouTube) que a transcrição pontual não alcança.
- **Falantes de inglês atendidos:** interface em inglês, legendas no idioma original e tradução de fala para inglês — o conteúdo, agora, também é bilíngue.
- **Vídeos sem legenda descobertos:** o verificador WCAG 1.2.2 aponta os vídeos sem track de legendas e oferece gerá-los ali mesmo.
- **Páginas auditadas:** o painel WCAG em tempo real aponta cada barreira por critério com dica de correção — enquanto você navega.
- **Respostas extraídas da própria página:** pergunte em linguagem natural e receba o trecho exato do conteúdo — sem sair da página, sem alucinação.
- **Conteúdo em português:** resumos e descrições de imagens podem sair direto em português (com modo Português Claro para leitura fácil).
- **Preferências que te seguem:** o filtro e o perfil escolhidos reaparecem nas páginas que você abre — sem reconfigurar a cada clique.
- **Imagens com texto decifráveis:** capturas de tela e infográficos com texto impresso ganham alternativa textual via OCR.
- **Inglês sem barreiras:** trechos selecionados são traduzidos para o português na hora, sem sair da página nem enviar nada a terceiros.
- **Privacidade total:** zero servidores próprios, zero telemetria, zero cookies.

## Como usar

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
10. **Perguntas e respostas (v2.0.0):** digite sua pergunta no campo `Sua pergunta sobre esta página` e clique em `❓ Perguntar à IA da Página` — a resposta aparece em "Resultado:" com o prefixo "Resposta (extraída do texto da página):". Em páginas com pouco texto, o assistente informa claramente.
11. **Idioma da resposta da IA (v2.0.0):** o seletor `Idioma da resposta da IA` alterna entre **Inglês (original dos modelos)** e **Português (tradução automática)** — vale para o resumo e para a descrição de imagens. Marque **Português Claro** para gerar resumos com frases curtas e ordem direta. As escolhas ficam memorizadas.
12. **Painel de auditoria WCAG (v2.0.0):** clique em `🧪 Painel de Auditoria WCAG (tempo real)` para abrir o painel na página — ele lista cada barreira por critério WCAG com contagem e dica, e se atualiza sozinho conforme a página muda. Feche pelo botão do painel, pelo segundo clique no popup ou pela tecla `Esc`.
13. **Sincronização (v2.0.0):** com o checkbox `Aplicar automaticamente ao navegar e às abas abertas` marcado (padrão), o filtro e o perfil ativos reaparecem nas páginas que você abre e nas abas já abertas. Desmarcar interrompe a sincronização (o estado atual permanece nas páginas abertas).
14. **Verificar legendas (v1.4.0):** `🔍 Verificar legendas (WCAG 1.2.2)` inventaria os vídeos da página e informa quantos estão sem legenda (por exemplo, "2 de 3 vídeos sem legendas") — com as Legendas ao Vivo a um clique para gerá-las ali mesmo.
