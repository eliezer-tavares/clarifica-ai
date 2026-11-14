# 🦊 Suporte a Firefox — Clarifica.ai v2.0.0

A partir da v2.0.0 o Clarifica.ai atende também ao **Firefox 115+** por meio de
um manifesto espelho em Manifest V2. Este documento lista as diferenças, a
limitação declarada e o roteiro de teste manual.

## 1. O que muda no Firefox

| Aspecto | Chrome (MV3) | Firefox (MV2) |
|---------|--------------|----------------|
| Manifesto | `manifest.json` (service worker) | `manifest.firefox.json` (event page, `persistent: false`) |
| Background | Service Worker | Script de background em event page — **o MESMO `background.js`**, cujas APIs de captura degradam graciosamente |
| Legendas ao vivo | ✅ (tabCapture + offscreen) | ❌ **indisponível** — `chrome.tabCapture` e `chrome.offscreen` não existem no Firefox |
| Demais recursos | ✅ | ✅ (QA, resumo, português, descrição de imagens, OCR, tradução, TTS, filtros, perfis, auditoria WCAG, sincronização por navegação) |
| Permissões | `activeTab, scripting, storage, tabCapture, offscreen` + `<all_urls>` | `activeTab, scripting, storage, <all_urls>` (host permissions dentro de `permissions` — padrão MV2) |
| CSP | Objeto `content_security_policy.extension_pages` | String `content_security_policy` (com `wasm-unsafe-eval` para a inferência) |
| `web_accessible_resources` | Array de objetos `{resources, matches}` | Array simples de strings |
| Identidade | — | `browser_specific_settings.gecko.id: clarifica-ai@eliezertavaresdeoliveira.com` |

## 2. Como a limitação é apresentada ao usuário

O popup detecta o Firefox pelo `navigator.userAgent` e:

- **oculta** o botão de legendas ao vivo, o seletor de idioma das legendas e a
  nota de latência (`display: none`) — os controles indisponíveis não ficam
  visíveis para confundir;
- mantém uma **defesa em profundidade**: mesmo se acionado por teclado, o fluxo
  de legendas não envia mensagem de captura e informa no idioma da interface:
  "As legendas ao vivo não são suportadas no Firefox (limitação da plataforma).
  Demais recursos funcionam normalmente."
- a nota é honesta: é uma **limitação da plataforma Firefox** (sem captura de
  aba na WebExtensions API), não uma omissão do projeto.

Os testes automatizados cobrem a estrutura (manifest MV2 íntegro) e a
ocultação/guarda (`tests/firefox.test.js` — 7 testes).

## 3. Instalação no Firefox (Modo de desenvolvedor)

1. `about:debugging#/runtime/this-firefox`
2. **Load Temporary Add-on...**
3. Selecione o arquivo **`manifest.firefox.json`** dentro da pasta `clarifica-ai/`
   (atenção: não é o `manifest.json` do Chrome).

Instalação permanente exige assinatura/AMO (addons.mozilla.org) — fora do
escopo desta release; o guia da Chrome Web Store (`docs/CHROME_WEB_STORE.md`)
não cobre o AMO.

**Nota para publicação futura no AMO:** caso a extensão seja submetida ao
addons.mozilla.org, verifique os requisitos vigentes na data da submissão —
desde **3 de novembro de 2025** o AMO exige que novas submissões declarem
`browser_specific_settings.gecko.data_collection_permissions`; para uma
extensão que não coleta dados, o valor é:

```json
"data_collection_permissions": { "required": ["none"] }
```

A instalação temporária em Modo de desenvolvedor (passo 3 acima) não exige
esse campo — nenhum impacto nesta release.

## 4. Roteiro de teste manual no Firefox (executar antes de distribuir)

1. Carregar temporariamente (passo 3) e conferir que o popup abre sem erros de
   console (Ctrl+Shift+J → console).
2. Verificar que os controles de legendas ao vivo **não aparecem** no popup.
3. Exercitar os recursos principais em uma página pública:
   `Resumir` → resultado no popup; `Descrever imagens` → alt aplicado;
   `OCR` → texto aplicado como alt; `Perguntar à IA` → resposta no popup;
   `Ler em Voz Alta` → fala do sistema.
4. Aplicar `Perfil Dislexia` → régua visível; navegar para outra página →
   estilo reaplicado automaticamente (sincronização por navegação).
5. `Ctrl+Shift+X` → página restaurada.
6. Tema claro/escuro → alternância e persistência.

## 5. Notas técnicas

- O `background.js` é compartilhado: todas as chamadas a `chrome.offscreen` e
  `chrome.tabCapture` vivem em blocos com captura de erro — em Firefox os
  erros de API ausente são absorvidos e o estado permanece coerente
  (legendas nunca ativas).
- A sincronização multi-aba (propagação para abas já abertas) fica desabilitada
  no Firefox (`sincronizarOutrasAbas` retorna cedo); a aplicação por navegação
  (`tabs.onUpdated`) continua funcionando.
- O worker de IA é idêntico nos dois navegadores (Blob + módulo ES + vendor
  local) — a Transformers.js 2.14.0 com WASM roda no Firefox 115+ normalmente.
