# 🏪 Guia de publicação na Chrome Web Store (v2.0.0)

Este guia documenta EXATAMENTE o que o Clarifica.ai já tem pronto e os passos
que dependem da conta do desenvolvedor (a publicação em si é feita pela conta
pessoal do autor — o projeto entrega todo o material preparado).

## 1. O que já está pronto no repositório

| Material | Onde está | Estado |
|----------|-----------|--------|
| Pacote da extensão (Manifest V3) | `clarifica-ai/` ou o zip da release | ✅ pronto (mesma pasta carregada no Chrome) |
| Versão fixada no manifest | `clarifica-ai/manifest.json` (`"version": "2.0.0"`) | ✅ |
| Política de privacidade (pt-BR/en) | [`docs/PRIVACY_POLICY.md`](PRIVACY_POLICY.md) | ✅ pronta para publicar em URL pública |
| Justificativas das permissões | Seção 3 deste guia | ✅ textos prontos para colar |
| Licença | Apache-2.0 (`LICENSE`) | ✅ |
| Material de divulgação | GIF das legendas ao vivo recomendado no README (a produzir) | ✏️ pendência conhecida |

## 2. Conta de desenvolvedor (uma única vez)

1. Criar/entrar com a conta Google que ficará associada à extensão.
2. Acessar https://chrome.google.com/webstore/devconsole e aceitar os termos.
3. Pagar a **taxa única de registro de US$ 5,00** (cartão de crédito).
4. Preencher os dados de "Conta" (nome público do editor, ex.: "Eliezer Tavares de Oliveira") e e-mail de contato para usuários (sugerido: `contact@eliezertavaresdeoliveira.com` — o mesmo do manifest).

## 3. Justificativas das permissões (colar no formulário da loja)

A loja exige uma justificativa por permissão. Textos prontos (em inglês — o
time de revisão da loja lê inglês):

- **activeTab** — "Applies accessibility effects (filters, reading mode, profiles) and injects on-device AI outputs (captions, alt text) into the tab the user explicitly activated from the extension popup or keyboard shortcut."
- **scripting** — "Injects the accessibility transformations and the AI worker into the active tab, as requested by the user."
- **storage** — "Stores the user's preferences locally (theme, last filter, active profile, output language, caption language). No data leaves the device."
- **tabCapture** — "Captures the audio of the tab the user is viewing to generate live captions locally with a speech recognition model running on the user's own device. The audio stream is processed entirely on-device and never uploaded."
- **offscreen** — "Maintains a dedicated offscreen document that performs the local speech recognition for live captions without interfering with the page."
- **host_permissions (`<all_urls>`)** — "The extension must be able to apply its accessibility features and inject on-device AI outputs on any page the user visits by their own action. No page content is transmitted anywhere."

## 4. Cadastro do item

1. Em "Nova página do item", carregar o **zip da extensão** (a pasta
   `clarifica-ai/` compactada — o mesmo zip da release do GitHub, que já
   passa pelos testes E2E carregando essa pasta como extensão unpacked).
2. Idioma principal: **português (Brasil)**; adicionar segunda listagem em inglês.
3. **Nome:** `Clarifica.ai` · **Resumo curto** (máx. 132 caracteres):
   `Acessibilidade com IA 100% local: QA da página, resumo em português, legendas ao vivo, perfis e auditoria WCAG — offline.`
4. **Descrição detalhada:** reaproveitar a seção "O que é possível fazer" do
   README (as 21 funcionalidades).
5. **Categoria:** Acessibilidade. **Idiomas:** português e inglês.
6. **Práticas de privacidade (obrigatório):**
   - Declarar "não coleta nenhum dado do usuário" — verdadeiro para este projeto: nenhum dado sai do dispositivo (documentado em `docs/PRIVACY_POLICY.md`).
   - Colar as justificativas do passo 3 nos campos correspondentes.
   - Link da política de privacidade: publicar `docs/PRIVACY_POLICY.md` como URL pública (a loja aceita URL do GitHub — o arquivo renderizado no repositório).
7. **Capturas de tela:** mínimo de 1, recomendado 3–5 (1280×800): popup com os
   19 controles, página com o painel de auditoria WCAG aberto, vídeo com
   legendas ao vivo, página com filtro de daltonismo aplicado.
8. **Imagem 440×280:** produzir com o logotipo/ícone (alternativa: captura do
   popup com o tema claro).

## 5. Revisão e status

- Envie para **revisão**; a Google costuma revisar extensões em poucos dias
  (prazos variam). O `minimum_chrome_version: 116` e as permissões de captura
  (`tabCapture`) podem gerar perguntas — as justificativas do passo 3 são a
  resposta padrão.
- **Distribuição:** sugerido "Público" (o público-alvo inclui qualquer pessoa
  com deficiência que encontre a extensão por busca).

## 6. Pós-publicação

- Cada nova versão: subir `"version"` no manifest, re-compactar, carregar o
  novo zip na aba "Pacote" do item (a revisão da loja é re-executada).
- O registro de mudanças de cada release já existe nas **notas da release**
  no GitHub (modelo bilíngue desde a v1.3.0).
- Monitorar a aba "Estatísticas" para métricas de usuários — números citáveis
  que fortalecem o registro científico no Zenodo e futuras publicações
  acadêmicas (`paper.md`).
