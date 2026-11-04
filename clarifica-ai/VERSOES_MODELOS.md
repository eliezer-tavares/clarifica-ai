# 🔄 Estratégia de versionamento dos modelos (Edge AI)

O Clarifica.ai executa modelos de terceiros **no dispositivo do usuário**. Isso torna o versionamento uma decisão de produto, não um detalhe técnico: um modelo que muda silenciosamente em produção altera o comportamento da extensão para todas as pessoas que já confiaram nela — sem deploy, sem aviso e sem teste. Por isso, **nenhuma dependência de IA deste projeto flutua**: versão da biblioteca e revisão (commit) de cada modelo são fixadas, auditadas por teste automatizado e sincronizadas com o cache do CI.

## 1. Registry atual (fonte única de verdade)

O bloco abaixo é a única fonte autorizada de versões. Ele é **lido por teste automatizado** (`tests/versoes-modelos.test.js`), que falha se `ai-worker.js`, o script de pré-baixa ou as dependências divergirem daqui. Alterações de versão começam sempre por este bloco.

```json
{
  "registry_versao": 1,
  "atualizado_em": "2026-10-27",
  "transformers_js": {
    "pacote_npm": "@xenova/transformers",
    "versao": "2.14.0",
    "cdn": "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.14.0"
  },
  "modelos": {
    "sumarizacao": {
      "id": "Xenova/distilbart-cnn-12-6",
      "revisao": "a6c58857723a89bde6162f7cd64a80fd644711f6",
      "tarefa": "summarization",
      "quantizacao": "int8 (quantized: true)",
      "tamanho_aproximado": "~300 MB",
      "revisao_verificada_em": "2026-10-27"
    },
    "visao": {
      "id": "Xenova/vit-gpt2-image-captioning",
      "revisao": "215b4edcb7ec1fad5905a18a03f7b2007f6fabd0",
      "tarefa": "image-to-text",
      "quantizacao": "int8 (quantized: true)",
      "tamanho_aproximado": "~250 MB",
      "revisao_verificada_em": "2026-10-27"
    }
  }
}
```

**Como fixar uma revisão:** a revisão é o SHA do commit do repositório no Hugging Face (obtido via `https://huggingface.co/api/models/<id>`, campo `sha`). Fixar o SHA — e não a branch `main` — garante que os pesos baixados hoje são bit a bit os mesmos daqui a um ano, condição necessária para reproducibilidade acadêmica, auditoria de comportamento e diagnóstico de regressões.

## 2. Onde cada versão vive no código

| Artefato | O que fixa |
|----------|------------|
| `scripts/ai-worker.js` | Versão da Transformers.js no import do CDN **e** `revision` (SHA) em cada `pipeline(...)` |
| `tests/setup/preparar_modelos_ia.mjs` | As mesmas revisões, para pré-baixar exatamente os pesos de produção |
| `tests/package.json` (`devDependencies`) | `@xenova/transformers@2.14.0` — a mesma versão do CDN, usada pelo teste real |
| `.github/workflows/ci.yml` | Chave do cache de modelos embute os SHAs curtos — upgrade muda a chave, o CI re-baixa |

O teste `tests/versoes-modelos.test.js` lê o registry deste arquivo e confronta os quatro artefatos acima. Qualquer divergência quebra o CI **antes** de uma inconsistência chegar ao usuário.

## 3. Por que fixar (as quatro razões)

1. **Reproducibilidade acadêmica** — a entrega do Projeto Integrador VI precisa permitir que o avaliador reproduza exatamente os resultados apresentados, mesmo meses depois.
2. **Estabilidade do usuário** — o modelo roda no navegador do usuário, cacheado após a primeira execução. Sem revisão fixa, uma atualização no repositório do Hugging Face mudaria o comportamento silenciosamente e forçaria um novo download de centenas de megabytes para todos.
3. **Diagnóstico de regressões** — se a qualidade de um resumo piorar, o primeiro suspeito é a mudança de modelo. Com revisões fixas, essa hipótese é eliminável em segundos (o SHA baixado é conhecido), transformando depuração em verificação.
4. **Cache previsível no CI** — a chave do cache embute os SHAs: execuções de CI baixam os pesos uma única vez por versão, mantendo o ciclo de feedback rápido sem sacrificar inferência real.

## 4. Procedimento de upgrade de modelo

Execute na ordem, sempre em um branch com PR — o CI é o porteiro:

1. **Escolher o candidato** — novo SHA do repositório do modelo (ou nova versão da Transformers.js). Leia as notas de lançamento e confirme compatibilidade com a API usada (`pipeline`, opções `quantized`/`revision`).
2. **Atualizar o registry** — edite o bloco JSON da seção 1 (novo `revisao`/`versao`, atualize `atualizado_em` e `revisao_verificada_em`).
3. **Propagar** — `ai-worker.js` (import + `revision`), `preparar_modelos_ia.mjs` e, se for o caso da biblioteca, `package.json`/CDN.
4. **Rodar localmente** — `npm run preparar:modelos` (pré-baixa os novos pesos) e depois `npm test`: a suíte executa **inferência real** com os novos pesos.
5. **Avaliar qualidade, não só verde** — inspecione o resumo e a descrição gerados no teste: texto coerente, no idioma esperado (inglês, hoje), tamanho plausível. Teste verde com modelo degradado é falso positivo.
6. **Rodar o E2E** — `npm run test:e2e` (extensão no Chromium real). Para validar a IA dentro do navegador: `CLARIFICA_E2E_IA=1 npm run test:e2e`.
7. **Atualizar o CI** — troque os SHAs curtos na chave do cache em `.github/workflows/ci.yml` (passo 2 invalida o cache antigo de propósito).
8. **Documentar** — registre em `tests/TEST_REPORT.md` a nova execução e o motivo do upgrade.

**Critérios de aceite:** CI verde nos dois jobs; outputs reais revisados por humano; tamanho do download compatível com o limite declarado no README (~600 MB); tempo de inferência aceitável em hardware modesto.

## 5. Rollback

Reverta o PR (ou aponte o `revision` de volta ao SHA anterior). O cache do navegador do usuário é endereçado pela URL dos arquivos do modelo — que inclui a revisão —, então **versões antigas e novas coexistem** no cache sem conflito: o rollback não força re-download de quem já tem a versão anterior. Nenhum dado do usuário é afetado (a extensão não persiste conteúdo além do cache de pesos).

## 6. Política resumida

- **Sem floating versions** — nenhum import de CDN sem `@versão`, nenhum `pipeline` sem `revision`.
- **Mudança de modelo só via PR** — com CI verde e revisão humana dos outputs.
- **Ciclo recomendado** — revisão semestral dos modelos (calendário acadêmico), ou imediata em caso de correção de segurança relevante na Transformers.js.
- **Registry é lei** — o JSON da seção 1 prevalece sobre qualquer menção a versão em outro documento; os testes garantem isso na prática.
