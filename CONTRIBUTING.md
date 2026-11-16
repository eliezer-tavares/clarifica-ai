# Contribuindo com o Clarifica.ai

> In English: [`CONTRIBUTING_EN.md`](CONTRIBUTING_EN.md)

Obrigado por considerar contribuir! Este documento cobre o ambiente de desenvolvimento, as convenções do projeto e o processo para pull requests.

## Princípios não negociáveis

Toda contribuição precisa preservar:

1. **IA 100% local** — nenhum texto, imagem ou dado de navegação sai do dispositivo; zero CDN, zero chamada de rede em tempo de execução.
2. **Privacidade por padrão** — nenhuma coleta, nenhuma telemetria; a [`política de privacidade`](docs/PRIVACY_POLICY.md) é a referência.
3. **Acessibilidade como requisito** — feedback por `aria-live`, operação completa por teclado, conformidade WCAG 2.1; mudanças de interface são validadas com axe-core.
4. **Idioma de saída** — os recursos geradores de texto respeitam o idioma selecionado no popup (português ou inglês) e o modo Português Claro.

## Ambiente de desenvolvimento

Requisitos: **Node.js 24** e Git. Em um terminal, um comando por vez:

```bash
git clone https://github.com/eliezer-tavares/clarifica-ai.git
cd clarifica-ai/tests
npm ci
npm test            # 199 testes unitários (inclui inferência de IA real)
npm run test:e2e    # 25 testes E2E: 23 na suíte padrão + 2 opt-in de IA real
```

Notas importantes:

- Os E2E exigem o navegador do Playwright: `npx playwright install chromium` (apenas uma vez).
- A primeira execução da suíte baixa os pesos dos 6 modelos de IA (~865 MB, fixados por SHA de commit).
- Máquinas com menos de ~6 GB de RAM: `npm test -- --test-concurrency=1`.
- IA real dentro do navegador (opt-in): `CLARIFICA_E2E_IA=1 npm run test:e2e`.
- Windows: se `npm run` não encontrar os executáveis, verifique `npm config get bin-links` — deve responder `true`; o diagnóstico completo está na revisão 15 do [`TEST_REPORT.md`](clarifica-ai/tests/TEST_REPORT.md).

## Estrutura do repositório

- `clarifica-ai/` — a extensão (manifest, service worker, content scripts, popup, workers de IA).
- `clarifica-ai/tests/` — a suíte completa (199 unitários + 25 E2E) e os relatórios consolidados.
- `docs/` — documentação detalhada (funcionalidades, arquitetura, limitações, guias de publicação, política de privacidade).
- Raiz — READMEs, papers (`paper.md`, `paper.pt-BR.md`), `CITATION.cff` e o histórico de versões (`VERSOES.md` / `VERSIONS.md`).

## Convenções

- **Modelos de IA:** qualquer mudança de modelo passa pelo [registry fixado por SHA](clarifica-ai/VERSOES_MODELOS.md) (atualmente v4) e é confrontada pelo teste automatizado `versoes-modelos.test.js`, que quebra o CI em caso de divergência. Padrão do projeto: **novos modelos = novo arquivo de inferência** (decisão de memória documentada no TEST_REPORT).
- **Commits:** mensagem em inglês, sem acentos ou emojis, primeira linha curta resumindo a mudança.
- **Idioma dos documentos:** os documentos vivem em pares pt-BR/English espelhados (`README.md`/`README_EN.md`, `docs/FUNCIONALIDADES.md`/`docs/FEATURES.md` e assim por diante); ao criar ou alterar um documento, atualize os dois lados.
- **Contagens de testes:** os números citados em documentos devem bater com a suíte real; os relatórios [`TEST_REPORT.md`](clarifica-ai/tests/TEST_REPORT.md) e [`TEST_REPORT_EN.md`](clarifica-ai/tests/TEST_REPORT_EN.md) são a fonte da verdade.

## Processo para pull requests

1. Abra uma issue primeiro (exceto correções triviais) descrevendo o problema e a abordagem proposta.
2. Crie um branch a partir de `main` com nome descritivo.
3. Faça as mudanças mantendo a suíte verde: `npm test` e `npm run test:e2e` dentro de `clarifica-ai/tests/`.
4. Envie o pull request descrevendo **o que** mudou, **por quê** e como foi validado, referenciando a issue (`Fixes #N`).

Pull requests pequenos e focados são revisados mais rápido do que mudanças amplas.

## Licenciamento das contribuições (sem CLA)

Este projeto **não usa CLA** (Contributor License Agreement). A Seção 5 da licença Apache-2.0 já estabelece o licenciamento das contribuições de forma explícita:

> "Unless You explicitly state otherwise, any Contribution intentionally submitted for inclusion in the Work by You to the Licensor shall be under the terms and conditions of this License, without any additional terms or conditions."

Em outras palavras: ao abrir um pull request, sua contribuição é licenciada sob a Apache-2.0, nos termos do arquivo [`LICENSE`](LICENSE). Não é preciso assinar nada.

## Reportando bugs e vulnerabilidades

- **Bugs e barreiras de acessibilidade:** abra uma [issue](https://github.com/eliezer-tavares/clarifica-ai/issues) com a página visitada, o recurso utilizado (atalho ou botão do popup), o leitor de tela/navegador e o comportamento observado versus o esperado.
- **Vulnerabilidades de segurança:** NUNCA em issue pública — use o canal privado descrito no [`SECURITY.md`](SECURITY.md).
