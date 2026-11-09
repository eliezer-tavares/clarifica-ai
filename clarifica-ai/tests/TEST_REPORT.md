# 📋 Relatório de Testes — Clarifica.ai v1.3.0

**Data da execução:** 09/11/2026 (revisão 8) · **Unitários:** Node.js 24 (`node --test`) com jsdom 24, axe-core 4.10 e @xenova/transformers 2.14.0 (inferência real, agora em 5 modelos) · **E2E:** Playwright 1.57 + Chromium real (canal `chromium`, novo headless, locale pt-BR) com a extensão carregada unpacked

> **Revisão 8 — v1.3.0 "Áudio e Multimodal" (roadmap cumprido):** as quatro frentes da v1.3 do README entregues com IA 100% local. **Transcrição** (`Xenova/whisper-tiny`, ~45 MB, multilíngue): a página localiza o primeiro `<video>/<audio>` http(s), decodifica com `AudioContext`, reamostra para PCM mono 16 kHz por interpolação linear (`reamostrarPara16k` — lógica pura extraída por marcadores e provada numericamente) e envia o `Float32Array` (teto de 120 s) ao Worker; mídia protegida por CORS e áudio ausente/curto viram códigos de erro traduzidos, nunca um popup preso em "Processando". **OCR** (`Xenova/trocr-small-printed`, ~60 MB): texto impresso extraído das imagens sem `alt` e aplicado como `alt`/`aria-label` (WCAG 1.4.5), contagem de encerramento por RESPOSTAS (nunca Worker zumbi com OCR vazio) e anúncio de conclusão com a contagem real substituída na página. **Tradução EN→PT** (`Xenova/opus-mt-en-ROMANCE`, ~115 MB): destino português fixado pelo prefixo convencional `>>pt<<` no Worker (os modelos Marian multilíngues não expõem idioma no pipeline 2.14.0), entrada por `window.getSelection()` com teto de 1.500 caracteres e código próprio para seleção vazia. **Leitura em voz alta sem modelo** (Web Speech API, vozes do sistema — decisão declarada no próprio registry): síntese na PÁGINA (sobrevive ao fechamento do popup), toggle com `aria-pressed`, voz acompanhando o idioma da interface e cancelamento integrado ao `reset-all`. O registry sobe para **v3** (5 modelos fixados por SHA + registro da decisão de TTS) e a chave de cache do CI mudou em lockstep. Nova suíte `multimodal.test.js` (19 testes), `ai-worker.test.js` ampliada de 5 para 9 (quatro inferências reais novas) e `background.test.js` de 12 para 14.
>
> **Auditoria dos outputs reais (critério de aceite — qualidade, não só verde):** Whisper transcreveu o discurso do JFK do fixture (`" And so my fellow Americans ask not what your country can do for you, ask what you can do for your country."`); o OCR leu a imagem de texto gerada (`"ACCESSIBILITY FOR ALL"`); a tradução produziu português correto (`"A acessibilidade digital garante que os sites possam ser usados por todos."` e `"Selecione uma passagem na página antes de traduzir."`). Todos os cinco modelos em execução real na bateria.

## Resultado consolidado

| Camada | Métrica | Valor |
|--------|---------|-------|
| Unitária (Node) | **Testes** | 120 |
| Unitária (Node) | **Aprovados** | ✅ 120 (100%) — duas execuções completas consecutivas |
| Unitária (Node) | **Duração** | ~65 s (com o cache de modelos aquecido; a 1ª execução baixa os ~800 MB) |
| E2E (Chromium real) | **Testes** | 16 na suíte padrão (17 com o opt-in de IA real) |
| E2E (Chromium real) | **Aprovados** | ✅ 15/15 executados na suíte padrão (1 opt-in não executado nesta bateria) |
| E2E (Chromium real) | **Duração** | ~24 s (padrão) |
| **Total geral** | **Testes aprovados** | ✅ **135/135 executados** |

## Cobertura por suíte — camada unitária (Node)

### `manifest.test.js` — 8/8 ✅
Integridade do Manifest V3, **versão 1.3.0 fixada por teste**, `default_locale` pt_BR com `_locales` pt_BR/en presentes, arquivos referenciados existentes, ícone PNG 128×128 validado por cabeçalho binário, **4 atalhos de teclado válidos + comando `traduzir-selecao` SEM atalho sugerido (limite de 4 do Chrome) com descrição válida**, permissões mínimas (3 — nenhuma nova na v1.3.0), CSP restritiva sem `unsafe-inline`, worker + `vendor/*` publicados como `web_accessible_resources`, autoria e versão mínima do Chrome.

### `background.test.js` — 14/14 ✅ (+2 na v1.3.0)
Registro do listener de comandos; disparo de anúncio + ação para os 4 atalhos (2 injeções cada) com as mensagens já resolvidas pelo motor de mensagens do SW; comando desconhecido ignorado; anúncios `aria-live` (WCAG 4.1.3); Modo Leitura Essencial; `reset-all` completo (incluindo os perfis — v1.2.0); **novo (v1.3.0): o comando `traduzir-selecao` dispara anúncio i18n + `TRIGGER_ACTION {action: 'translate-selection'}` (2 injeções, paridade com os demais comandos)**; **novo (v1.3.0): o `reset-all` interrompe a leitura em voz alta da página (`speechSynthesis.cancel()`)**; `TRIGGER_ACTION` para resumo/imagens e ausência de `postMessage` em leitura/reset.

### `popup.test.js` — 20/20 ✅
Estrutura com **15 botões nativos** (13 modos — 6 originais + 3 perfis + 4 áudio/multimodal — + fechar + tema), slider de intensidade rotulado, status ao vivo e região de resultado; interface pt-BR; Modo Leitura Essencial; as 3 matrizes com anúncio i18n e `aria-pressed`; intensidade interpolada (50% → R = 0.783); reaplicação ao soltar o slider (25% → R = 0.892); troca de filtro com prova síncrona de limpeza de anúncios (revisão 7); ciclo do tema com persistência; configurações restauradas ao reabrir; recusa de textos curtos; resumo e descrição de imagens ponta a ponta (Worker simulado, protocolo real de progresso, códigos de erro traduzidos); falha de injeção nos três fluxos originais.

### `multimodal.test.js` — 19/19 ✅ (nova na revisão 8)
**Lógica pura de áudio** (extraída por marcadores, sem DOM): rampa linear reamostrada com precisão de 1e-6 e pontas preservadas (2 amostras a 8 kHz → 4 amostras a 16 kHz); 48 kHz → 16 kHz com duração exata (1 s = 16.000 amostras) e coerência de valores; identidade em 16 kHz; entradas vazias/taxas inválidas → saída vazia; `Array` comum convertido. **Transcrição no popup:** página sem mídia → mensagem clara sem criar Worker; `<audio>` http(s) → PCM `Float32Array` de exatamente 16.000 amostras (2 s de 32 kHz → 1 s de 16 kHz) atravessando a fronteira, transcrição exibida em "Resultado:" e Worker encerrado; **blob:/data: ignorados** com `<source>` http(s) localizado; **CORS simulado** → "O áudio é protegido pelo site (CORS) e não pode ser transcrito.", sem Worker; erro codificado do worker traduzido e Worker sem zumbi. **OCR no popup:** texto aplicado como `alt` + `aria-label` com prefixo i18n nas imagens sem alt (alt original preservado, contorno verde, `aria-pressed` não se aplica), anúncio de conclusão com contagem real ("OCR concluído em 2 imagens."), erro do worker encerra o Worker, página com todas as imagens descritas não cria Worker. **Tradução no popup:** seleção vazia → mensagem clara sem Worker; trecho selecionado (`getSelection` simulado) → enviado integralmente, resultado exibido, anúncio "Clarifica.ai: Tradução concluída." na página. **TTS no popup:** fala do conteúdo principal com `lang` pt-BR e voz do idioma selecionada quando disponível, fila anterior descartada, toggle para com segundo clique e desmarca `aria-pressed`/`ativo`; seleção tem prioridade sobre o conteúdo; sem `speechSynthesis` → degradação com mensagem clara; página sem texto → "Nada para ler". **Falha de injeção** nos quatro fluxos novos.

### `perfis.test.js` — 12/12 ✅
Lógica pura dos três CSS (TEA/TDAH/dislexia — v1.2.0, sem alteração de produto) e todos os fluxos de popup/página da v1.2.0; **ajuste de teste:** a asserção de estrutura agora busca a seção "Perfis Neurodivergentes" entre os títulos (a v1.3.0 adicionou "Áudio e Multimodal" DEPOIS dela — o `:last-of-type` anterior deixaria de valer).

### `accessibility.test.js` — 10/10 ✅
axe-core nos temas claro E escuro (zero violações críticas/sérias/moderadas/menores — **agora sobre o popup com 15 botões**, incluindo os toggles `aria-pressed` dos perfis e da voz); contraste WCAG 1.4.3 AA nos pares dos dois temas; WCAG 2.4.7 (hover/foco), 4.1.3 (anúncios), 1.3.1 (hierarquia), 3.1.1 (`lang`) e anúncios ocultos sem `display:none`.

### `css-filters.test.js` — 15/15 ✅
Lógica pura de filtros exercitada em Node: 3 matrizes com 20 valores, luminância preservada, alfa intacto; interpolação de intensidade exata (0/25/50/75/100 e fora da faixa); formatação e data URI; limpeza do filtro anterior; variáveis dos dois temas e classes do popup.

### `i18n.test.js` — 6/6 ✅
`default_locale` pt_BR com os dois locales válidos (**49 → 74 chaves com as 25 novas da v1.3.0, em paridade total pt_BR↔en**); placeholders estruturalmente corretos (incluindo os dois `$quantidade$` novos); toda chave usada no código/HTML existe nos dois idiomas; nenhuma chave órfã; textos contratados preservados.

### `ai-worker.test.js` — 9/9 ✅ (inferência de IA REAL; +4 na v1.3.0)
O código de `scripts/ai-worker.js` executado de verdade em Node com a Transformers.js 2.14.0 (a mesma vendada) e os pesos quantizados das revisões fixadas: versão real confirmada; **sumarização real** (~24 s, DistilBART `a6c58857`); **reuso real** sem recarregar (~20 s); **descrição real de imagem** (~3,3 s, ViT-GPT2 `215b4edc`); **transcrição real** (~1,9 s, Whisper-tiny `5332fcc3` sobre o jfk.wav convertido com o REAMOSTRADOR REAL do popup.js — o mesmo caminho da página até o Worker — e reuso real sem recarregar ~0,9 s); **OCR real** (~1,1 s, TrOCR `56c1626e` sobre `texto-ocr.png` servido por http); **tradução real EN→PT** (~5,8 s, opus-mt `9d2ba69a` com prefixo `>>pt<<`, saída auditada em português); mensagens desconhecidas ignoradas e zero referência a CDN.

### `versoes-modelos.test.js` — 7/7 ✅ (+1 na v1.3.0)
Registry **v3** íntegro: biblioteca vendada (bundle 2.14.0 > 500 KB + 4 WASM com cabeçalho `\0asm`); worker sem CDN, com URLs locais injetadas e as revisões dos **5 modelos** fixadas; **novo: registro `tts` declarando a Web Speech API como tecnologia de vozes do sistema — sem modelo e fora do bloco `modelos`**; manifest publicando `vendor/*`; pré-baixa (5 modelos + fixtures jfk.wav/texto-ocr.png), devDependency e **chave de cache do CI embutindo os 5 SHAs curtos** sincronizados.

## Cobertura — camada E2E (Chromium real, Playwright)

Extensão carregada unpacked em Chromium real (contexto persistente, locale pt-BR), service worker MV3 aguardado, página HTTP local real. Adaptações documentadas mantidas: a "aba ativa" aponta para a página de teste nos fluxos do popup, e o idioma é semeado no `chrome.storage`.

### `e2e/carregamento.spec.js` — 3/3 ✅
Manifest aceito, service worker MV3 registrado; **popup com 13 botões** (incluindo os 3 perfis e os 4 de áudio/multimodal com rótulos pt-BR reais do Chrome, voz com `aria-pressed="false"` inicial), status `aria-live`, slider e tema — **zero erros de console**; `vendor/` servido pela própria extensão (bundle 2.14.0 importável + WASM `\0asm`), sem CDN.

### `e2e/popup.spec.js` — 8/8 ✅ (suíte padrão; 9 com o opt-in)
Cliques reais no popup, efeitos verificados no DOM real da página: Leitura Essencial; 3 filtros de daltonismo com anúncio; Perfil TEA aplicado e desligado pelo segundo clique (v1.2.0); Perfil Dislexia com régua provada VISÍVEL por computed style no Chromium (v1.2.0); caminho de erro do resumo; **novo (v1.3.0): tradução sem seleção na página real → mensagem clara de seleção vazia e resultado oculto (nenhum modelo carregado — caminho determinístico)**; IA real opt-in (`CLARIFICA_E2E_IA=1`) — o worker Blob importa o bundle vendado e resume de verdade dentro do navegador.

### `e2e/service-worker.spec.js` — 4/4 ✅
Espelho fiel do listener de `chrome.commands` no service worker real: anúncio assertivo + Leitura Essencial; `TRIGGER_ACTION` do resumo; restauração completa (`reset-all`) contra estado sujo; robustez com ação desconhecida.

## Defeitos e decisões desta revisão

1. **Destino da tradução fixado no Worker (`>>pt<<`):** os modelos Marian multilíngues não expõem parâmetro de idioma no pipeline da Transformers.js 2.14.0 (`src_lang`/`tgt_lang` só existem para M2M100/NLLB/MBart). O português é fixado pelo prefixo convencional `>>pt<< ` no texto de origem — decisão audível nos testes (saída real em português) e documentada no registry.
2. **TTS sem modelo, decisão de produto no registry:** a leitura em voz alta usa a Web Speech API (vozes do sistema) em vez de um modelo neural (~100 MB) — qualidade superior, zero download, offline. A decisão vive no registry (seção 1) e é auditada por teste, garantindo que nenhum modelo de TTS entre "por engano".
3. **Reamostragem 16 kHz na página, não no Worker:** o Whisper exige PCM mono 16 kHz; decodificar e reamostrar ANTES de cruzar a fronteira reduz o `postMessage` (teto de 120 s ≈ 7,7 MB) e mantém a lógica pura (`reamostrarPara16k`) testável numericamente em Node — o teste de inferência real usa o MESMO reamostrador extraído do popup.js, provando o caminho ponta a ponta.
4. **Teto de 120 s por transcrição:** Whisper-tiny custa segundos por janela de 30 s; podcasts longos transcribem o trecho inicial — comportamento documentado nas limitações do README e refletido no código (constante `TETO_16K` com comentário).
5. **OCR encerra por RESPOSTAS, não por textos úteis:** contabilizar apenas textos não vazios deixaria um Worker zumbi quando o OCR não encontrasse texto (imagem sem texto impresso); a contagem por respostas garante encerramento e anúncio em qualquer caso.
6. **Comando de tradução sem atalho sugerido:** o Chrome limita a 4 os atalhos sugeridos por extensão; os 4 originais (accessibility-critical) permanecem e `traduzir-selecao` é publicado sem `suggested_key`, configurável em `chrome://extensions/shortcuts` — fixado por teste.
7. **Fala na PÁGINA, não no popup:** `speechSynthesis` no popup morreria ao perder o foco (popups fecham em qualquer clique fora); na página a fala sobrevive ao fechamento e o `Ctrl+Shift+X` (reset-all) também a interrompe — paridade popup/SW coberta por teste.
8. **Fallbacks de mídia:** `blob:`/`data:` não são fetcháveis e são ignorados silenciosamente; `<source>` filho de `<video>/<audio>` é consultado; sem mídia http(s), código `sem-audio` traduzido — o fluxo nunca deixa o popup em "Processando..." indefinidamente.
9. **Anúncio de OCR com contagem real na página:** o popup não conhece o número de imagens (a descoberta é na página); o modelo de mensagem traduzido no popup leva o `$quantidade$` e a página substitui pelo valor real — o único contexto que conhece o número.
10. **Correção de teste na v1.2.0 herdada:** a asserção de estrutura dos perfis deixou de usar `:last-of-type` (a v1.3.0 adicionou uma seção DEPOIS de "Perfis Neurodivergentes") — o teste agora busca o título entre os presentes, sem alterar produto.

## Escopo e limitações desta bateria

- **IA real opt-in do E2E não executada nesta bateria:** o caminho real ficou integralmente no Node (9/9 com os 5 modelos) — a inferência dentro do navegador segue opt-in (`CLARIFICA_E2E_IA=1`) e será exercitada naturalmente pela próxima bateria em ambiente com rede plena.
- **TTS no E2E:** a leitura em voz alta não é clicada no Chromium headless (disponibilidade de vozes varia por máquina); sua lógica é coberta integralmente na unitária (18 asserções em 4 testes) e o reset integrado no `background.test.js`.
- **Memória em máquinas pequenas:** com os 5 modelos residentes, o pico de RSS da suíte unitária cresce (~3,5 GB com as suítes de DOM em paralelo); em máquinas com menos de ~6 GB pode ser necessário `npm test -- --test-concurrency=1` (mesma observação já documentada na revisão 7 para 2 núcleos). O `npm test` padrão e o CI (runner com 7 GB) permanecem inalterados — duas execuções completas 120/120 com concorrência padrão nesta bateria.
- **Rate limit do Hugging Face:** com o cache aquecido (`tests/.cache`), nenhuma execução baixa pesos; a 1ª execução em máquina nova pode sofrer limitação transitória (HTTP 429) — reexecutar resolve, e o CI tem 3 tentativas no passo dedicado.
- **Stub de mensagens apenas na UI do popup (unitária):** a inferência real fica em `ai-worker.test.js` (Node) e no E2E opt-in (navegador).
- **Disparo de atalhos:** o Chrome automatizado não dispara `chrome.commands` sinteticamente; o E2E invoca o mesmo par de injeções dentro do service worker real.
