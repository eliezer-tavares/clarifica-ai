# Política de Segurança — Clarifica.ai

> Em English: [`SECURITY_EN.md`](SECURITY_EN.md)

Segurança e privacidade são o núcleo do projeto: toda a inteligência artificial executa localmente no dispositivo do usuário, sem envio de dados, sem CDN e sem qualquer dependência externa em tempo de execução.

## Versões suportadas

| Versão | Suportada |
|--------|-----------|
| 2.0.x | ✅ Sim |
| 1.x | ❌ Não — atualize para a 2.0.0 |

## Como reportar uma vulnerabilidade

**Não abra uma issue pública.** Vulnerabilidades devem ser reportadas por um dos canais privados abaixo:

1. **GitHub — relatório privado (recomendado):** aba **Security** do repositório → **Report a vulnerability**. O relatório fica visível apenas para os mantenedores até a correção ser publicada.
2. **E-mail:** contact@eliezertavaresdeoliveira.com — assunto iniciado com `[security] clarifica-ai` seguido da descrição.

Inclua, quando possível: versão do navegador e do sistema operacional, passos para reproduzir, comportamento observado versus esperado e, se houver, um proof of concept.

### Compromisso de resposta

- Confirmação de recebimento em até **5 dias úteis**.
- Avaliação de impacto e estimativa de correção comunicadas no mesmo canal do reporte.
- **Divulgação coordenada:** a falha só é publicada depois de corrigida (ou com acordo do reportador).

## Escopo

**Dentro do escopo:** o código da extensão (service worker, content scripts, popup, workers de IA), as permissões declaradas nos manifests (MV3 e MV2), os arquivos vendor incluídos no pacote (Transformers.js) e o fluxo de dados entre essas partes.

**Fora do escopo (reporte a quem compete):** vulnerabilidades das bibliotecas de IA de terceiros (Transformers.js, ONNX Runtime e os modelos do Hugging Face — reporte ao projeto upstream); vulnerabilidades das devDependencies da suíte de testes, que jamais são empacotadas na extensão (as 5 de severidade high conhecidas estão aceitas e documentadas na revisão 15 do [`TEST_REPORT.md`](clarifica-ai/tests/TEST_REPORT.md)); o comportamento dos sites visitados; falhas que exijam acesso físico ao computador do usuário.

## Modelo de ameaça em uma linha

Não há servidor, telemetria ou requisição de rede em tempo de execução: os modelos são baixados uma única vez do Hugging Face na primeira execução de cada recurso, fixados por SHA de commit no [registry de modelos](clarifica-ai/VERSOES_MODELOS.md), e toda inferência acontece no dispositivo. A política de privacidade completa está em [`docs/PRIVACY_POLICY.md`](docs/PRIVACY_POLICY.md).
