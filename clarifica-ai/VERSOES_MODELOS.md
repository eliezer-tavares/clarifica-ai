# 🔄 Estratégia de versionamento dos modelos (Edge AI)

O Clarifica.ai executa modelos de terceiros **no dispositivo do usuário**. Isso torna o versionamento uma decisão de produto, não um detalhe técnico: um modelo que muda silenciosamente em produção altera o comportamento da extensão para todas as pessoas que já confiaram nela — sem deploy, sem aviso e sem teste. Por isso, **nenhuma dependência de IA deste projeto flutua**: versão da biblioteca e revisão (commit) de cada modelo são fixadas, auditadas por teste automatizado e sincronizadas com o cache do CI.

## 1. Registry atual (fonte única de verdade)

O bloco abaixo é a única fonte autorizada de versões. Ele é **lido por teste automatizado** (`tests/versoes-modelos.test.js`), que falha se `ai-worker.js`, o popup, o `manifest.json`, os binários vendados, o script de pré-baixa ou as dependências divergirem daqui. Alterações de versão começam sempre por este bloco.

```json
{
  "registry_versao": 3,
  "atualizado_em": "2026-11-09",
  "transformers_js": {
    "pacote_npm": "@xenova/transformers",
    "versao": "2.14.0",
    "origem": "pacote vendado (sem CDN)",
    "arquivo_local": "vendor/transformers.min.js",
    "binarios_wasm": [
      "vendor/ort-wasm.wasm",
      "vendor/ort-wasm-simd.wasm",
      "vendor/ort-wasm-threaded.wasm",
      "vendor/ort-wasm-simd-threaded.wasm"
    ],
    "cdn_removido_em": "2026-11-07 (v1.1.0)"
  },
  "modelos": {
    "sumarizacao": {
      "id": "Xenova/distilbart-cnn-12-6",
      "revisao": "a6c58857723a89bde6162f7cd64a80fd644711f6",
      "tarefa": "summarization",
      "quantizacao": "int8 (quantized: true)",
      "tamanho_aproximado": "~300 MB",
      "revisao_verificada_em": "2026-11-07"
    },
    "visao": {
      "id": "Xenova/vit-gpt2-image-captioning",
      "revisao": "215b4edcb7ec1fad5905a18a03f7b2007f6fabd0",
      "tarefa": "image-to-text",
      "quantizacao": "int8 (quantized: true)",
      "tamanho_aproximado": "~250 MB",
      "revisao_verificada_em": "2026-10-27",
      "vigilancia": "em 2026-11-07 a HEAD do repositório upstream avançou para 077550ae0729f9af280c9d885ea9b0380fc8e815; a revisão fixada (215b4edc) permanece a versão validada do projeto — migração só via procedimento de upgrade, com avaliação de qualidade dos outputs"
    },
    "transcricao": {
      "id": "Xenova/whisper-tiny",
      "revisao": "5332fcc35e32a33b86612b9a57a89be7906102b1",
      "tarefa": "automatic-speech-recognition",
      "quantizacao": "int8 (quantized: true)",
      "tamanho_aproximado": "~45 MB",
      "revisao_verificada_em": "2026-11-09",
      "nota": "versão multilíngue (não .en): o idioma do áudio é detectado pelo próprio modelo — vídeos e podcasts em qualquer língua; a entrada chega como PCM mono 16 kHz reamostrado na página"
    },
    "ocr": {
      "id": "Xenova/trocr-small-printed",
      "revisao": "56c1626ea0b4aab378f3228235be2e824d4256bd",
      "tarefa": "image-to-text",
      "quantizacao": "int8 (quantized: true)",
      "tamanho_aproximado": "~60 MB",
      "revisao_verificada_em": "2026-11-09",
      "nota": "leitura de TEXTO IMPRESSO; o texto extraído é aplicado como alt/aria-label da imagem (WCAG 1.4.5)",
      "vigilancia": "em 2026-11-09 a HEAD do upstream não foi avaliada para migração; a revisão fixada (56c1626e) é a versão validada por inferência real (fixture texto-ocr.png)"
    },
    "traducao": {
      "id": "Xenova/opus-mt-en-ROMANCE",
      "revisao": "9d2ba69ac80c8e8453c3d9a1e2323a0e7b8ca3cd",
      "tarefa": "translation",
      "quantizacao": "int8 (quantized: true)",
      "tamanho_aproximado": "~115 MB",
      "revisao_verificada_em": "2026-11-09",
      "nota": "modelo Marian multilíngue EN→línguas românicas; o produto fixa o destino em português pelo prefixo '>>pt<< ' no texto de origem (convenção dos modelos Marian multilíngues), aplicado no ai-worker.js"
    }
  },
  "tts": {
    "tecnologia": "Web Speech API (speechSynthesis)",
    "origem": "vozes do sistema operacional (sem modelo, sem download, offline)",
    "decisao": "v1.3.0 — a leitura em voz alta usa a API nativa do navegador em vez de um modelo neural (ex.: SpeechT5, ~100 MB): as vozes do sistema têm qualidade superior, não custam download e já são as que o usuário usa em todo o sistema; a síntese roda na PÁGINA (sobrevive ao fechamento do popup) e o Ctrl+Shift+X a interrompe",
    "sem_revisao": true
  }
}
```

**Como fixar uma revisão:** a revisão é o SHA do commit do repositório do modelo no Hugging Face (obtido via `https://huggingface.co/api/models/<id>`, campo `sha`). Fixar o SHA — e não a branch `main` — garante que os pesos baixados hoje são bit a bit os mesmos daqui a um ano, condição necessária para reproducibilidade acadêmica, auditoria de comportamento e diagnóstico de regressões.

**Por que o campo `vigilancia` existe:** fixar por SHA torna a divergência upstream visível e inofensiva. O teste não exige que a HEAD coincida com a revisão fixada; exige que o projeto continue baixando EXATAMENTE a revisão validada — que permanece acessível no Hugging Face mesmo depois de a upstream avançar.

**Por que a TTS vive no registry sem ser modelo:** a seção 1 também documenta decisões de dependência de IA que NÃO resultam em download — a leitura em voz alta (v1.3.0) usa a Web Speech API nativa. O teste automatizado garante que essa decisão permanece declarada (e que nenhum modelo de TTS entre por engano).

## 2. Onde cada versão vive no código

| Artefato | O que fixa |
|----------|------------|
| `vendor/transformers.min.js` | O bundle oficial da Transformers.js 2.14.0, versionado no repositório — a extensão nunca mais importa de CDN |
| `vendor/ort-*.wasm` | Os 4 binários WASM do onnxruntime-web 1.14.0 (comuns, SIMD, threaded, SIMD+threaded) — o runtime escolhe por suporte do hardware |
| `scripts/ai-worker.js` | Placeholders `__CLARIFICA_BIBLIOTECA__` / `__CLARIFICA_VENDOR_BASE__` (URLs locais injetadas pelo popup) **e** `revision` (SHA) em cada `pipeline(...)` |
| `popup/popup.js` | Substituição dos placeholders com `chrome.runtime.getURL('vendor/...')` antes da criação do Worker via Blob |
| `manifest.json` | `vendor/*` publicado em `web_accessible_resources` para o Worker importar os recursos da própria extensão |
| `tests/setup/preparar_modelos_ia.mjs` | As mesmas revisões, para pré-baixar exatamente os pesos de produção |
| `tests/package.json` (`devDependencies`) | `@xenova/transformers@2.14.0` — a mesma versão vendada, usada pela inferência real em Node |
| `.github/workflows/ci.yml` | Chave do cache de modelos embute os SHAs curtos — upgrade muda a chave, o CI re-baixa |

O teste `tests/versoes-modelos.test.js` lê o registry deste arquivo e confronta todos os artefatos acima (incluindo a presença e a integridade dos binários vendados). Qualquer divergência quebra o CI **antes** de uma inconsistência chegar ao usuário.

> **v1.3.0 — registry sobe para 3 (Áudio e Multimodal):** três modelos novos entram por este registry, na revisão fixada e auditada por inferência real: `Xenova/whisper-tiny` (transcrição de áudio 16 kHz de vídeos e podcasts), `Xenova/trocr-small-printed` (OCR de texto impresso aplicado como alt/aria-label) e `Xenova/opus-mt-en-ROMANCE` (tradução EN→PT com destino fixado por `>>pt<<`). A leitura em voz alta NÃO adiciona modelo: usa a Web Speech API (vozes do sistema), decisão declarada no próprio registry (`tts`). A chave de cache do CI mudou em lockstep (agora embute os 5 SHAs) e o total de pesos sobe de ~580 MB para ~800 MB — README e `ci.yml` atualizados na mesma revisão.

## 3. Por que fixar (as quatro razões)

1. **Reproducibilidade acadêmica** — a entrega do Projeto Integrador VI precisa permitir que o avaliador reproduza exatamente os resultados apresentados, mesmo meses depois.
2. **Estabilidade do usuário** — o modelo roda no navegador do usuário, cacheado após a primeira execução. Sem revisão fixa, uma atualização no repositório do Hugging Face mudaria o comportamento silenciosamente e forçaria um novo download de centenas de megabytes para todos.
3. **Diagnóstico de regressões** — se a qualidade de um resumo piorar, o primeiro suspeito é a mudança de modelo. Com revisões fixas, essa hipótese é eliminável em segundos (o SHA baixado é conhecido), transformando depuração em verificação.
4. **Cache previsível no CI** — a chave do cache embute os SHAs: execuções de CI baixam os pesos uma única vez por versão, mantendo o ciclo de feedback rápido sem sacrificar inferência real.

**Por que vendear a biblioteca (novidade da v1.1.0):** além dos quatro motivos acima, a carga via CDN era o único código remoto restante no pacote — e podia ser bloqueada pela política de código do Manifest V3 em algumas configurações, além de tornar a inferência dependente de um terceiro (jsdelivr) em runtime. Com o bundle em `vendor/`, a extensão passa a cumprir MV3 sem exceção: tudo que roda é o que está no repositório.

## 4. Procedimento de upgrade de modelo ou biblioteca

Execute na ordem, sempre em um branch com PR — o CI é o porteiro:

1. **Escolher o candidato** — novo SHA do repositório do modelo (ou nova versão da Transformers.js). Leia as notas de lançamento e confirme compatibilidade com a API usada (`pipeline`, opções `quantized`/`revision`).
2. **Atualizar o registry** — edite o bloco JSON da seção 1 (novo `revisao`/`versao`, atualize `atualizado_em` e `revisao_verificada_em`; incremente `registry_versao`).
3. **Propagar** — `ai-worker.js` (revisões) e `preparar_modelos_ia.mjs`. Para mudança da BIBLIOTECA: baixar o novo `dist/` (`npm pack @xenova/transformers@X.Y.Z`), substituir `vendor/transformers.min.js` e os binários WASM correspondentes, e atualizar `devDependencies` em `tests/package.json` para a mesma versão.
4. **Rodar localmente** — `npm run preparar:modelos` (pré-baixa os novos pesos) e depois `npm test`: a suíte executa **inferência real** com os novos pesos.
5. **Avaliar qualidade, não só verde** — inspecione o resumo e a descrição gerados no teste: texto coerente, no idioma esperado (inglês, hoje), tamanho plausível. Teste verde com modelo degradado é falso positivo.
6. **Rodar o E2E** — `npm run test:e2e` (extensão no Chromium real). Para validar a IA dentro do navegador: `CLARIFICA_E2E_IA=1 npm run test:e2e`.
7. **Atualizar o CI** — troque os SHAs curtos na chave do cache em `.github/workflows/ci.yml` (passo 2 invalida o cache antigo de propósito).
8. **Documentar** — registre em `tests/TEST_REPORT.md` a nova execução e o motivo do upgrade.

**Critérios de aceite:** CI verde nos dois jobs; outputs reais revisados por humano; tamanho do download compatível com o limite declarado no README (~600 MB); tempo de inferência aceitável em hardware modesto.

## 5. Rollback

Reverta o PR (ou aponte o `revision` de volta ao SHA anterior; para a biblioteca, restaure o `vendor/` anterior do histórico do git). O cache do navegador do usuário é endereçado pela URL dos arquivos do modelo — que inclui a revisão —, então **versões antigas e novas coexistem** no cache sem conflito: o rollback não força re-download de quem já tem a versão anterior. Nenhum dado do usuário é afetado (a extensão não persiste conteúdo além do cache de pesos).

## 6. Política resumida

- **Sem floating versions** — nenhuma import sem fonte fixada: a biblioteca vem de `vendor/`, os modelos de revisões (SHA) explícitas; nada aponta para CDN ou para a branch `main` de terceiros.
- **Mudança de modelo ou biblioteca só via PR** — com CI verde e revisão humana dos outputs.
- **Ciclo recomendado** — revisão semestral dos modelos (calendário acadêmico), ou imediata em caso de correção de segurança relevante na Transformers.js.
- **Registry é lei** — o JSON da seção 1 prevalece sobre qualquer menção a versão em outro documento; os testes garantem isso na prática.
