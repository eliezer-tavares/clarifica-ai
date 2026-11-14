# 🔐 Política de Privacidade — Clarifica.ai

**Versão:** 2.0.0 · **Data:** 12 de novembro de 2026 · **Autor:** Eliezer Tavares de Oliveira (contact@eliezertavaresdeoliveira.com)

---

## Português (Brasil)

### Resumo em uma frase

O Clarifica.ai **não coleta, não transmite e não armazena nenhum dado pessoal** — toda a inteligência artificial executa no próprio dispositivo do usuário (Edge AI) e nenhum texto, imagem, áudio ou dado de navegação sai do computador.

### O que a extensão processa (apenas localmente)

1. **Texto da página** — quando você pede um resumo, faz uma pergunta ou traduz um trecho, o texto é lido no seu navegador e enviado apenas ao **Web Worker local** da própria extensão, que executa o modelo de IA no seu dispositivo. Nada é enviado a servidores.
2. **Imagens** — quando você pede descrição de imagens ou OCR, as imagens da página são processadas pelo modelo de visão/OCR local, em cache no seu navegador.
3. **Áudio** — quando você usa a transcrição ou as legendas ao vivo, o áudio da aba é capturado (`chrome.tabCapture`) e processado pelo modelo Whisper local, em um documento offscreen da própria extensão. O áudio **nunca é gravado nem enviado** para fora do dispositivo.
4. **Preferências** — tema, último filtro, perfil ativo, intensidade, idiomas e a opção de sincronização ficam no `chrome.storage.local` do seu navegador (armazenamento local da extensão, apagável em `chrome://extensions`).

### O que NÃO acontece

- **Nenhum servidor próprio** — o projeto não tem backend; não há para onde enviar dados.
- **Nenhuma telemetria, analytics ou rastreamento** — não há contadores, cookies ou pixels.
- **Nenhuma venda ou compartilhamento de dados** — não há dados para vender ou compartilhar.
- **Nenhuma CDN em runtime** — a biblioteca de IA é vendada no pacote e os modelos são baixados diretamente do Hugging Face (um único download por modelo, fixado por commit) para o cache local do navegador.

### Downloads de modelos

Na primeira execução de cada recurso, o modelo correspondente (total de ~865 MB para os seis) é baixado do **Hugging Face** (huggingface.co) para o cache do seu navegador. Esses downloads são de **pesos de modelo públicos** e não contêm nenhum dado seu. Depois, tudo funciona 100% offline.

### Controle do usuário

- Todas as funções são acionadas manualmente (nada roda sem seu pedido).
- `Ctrl+Shift+X` restaura a página ao estado original.
- Remover a extensão apaga as preferências locais; o cache de modelos pode ser apagado limpando os dados de navegação em cache do navegador.

### Base legal e conformidade

O processamento acontece exclusivamente no dispositivo do usuário, sem tratamento de dados pessoais por terceiros — alinhado à **LGPD (Lei nº 13.709/2018)** no que se refere à extensão não ser controladora de dados, à **LBI (Lei nº 13.146/2015)** no que se refere ao compromisso com a acessibilidade, e às diretrizes **WCAG 2.1** para acessibilidade do próprio produto.

---

## English

### One-sentence summary

Clarifica.ai **does not collect, transmit, or store any personal data** — all artificial intelligence runs on the user's own device (Edge AI), and no text, image, audio, or browsing data ever leaves the user's computer.

### What the extension processes (locally only)

1. **Page text** — when you request a summary, ask a question, or translate a selection, the text is read in your browser and sent only to the extension's **local Web Worker**, which runs the AI model on your device. Nothing is sent to servers.
2. **Images** — when you request image descriptions or OCR, page images are processed by the local vision/OCR model, cached in your browser.
3. **Audio** — when you use transcription or live captions, the tab audio is captured (`chrome.tabCapture`) and processed by the local Whisper model in the extension's own offscreen document. The audio is **never recorded or uploaded**.
4. **Preferences** — theme, last filter, active profile, intensity, languages, and the sync option live in your browser's `chrome.storage.local` (local extension storage, deletable at `chrome://extensions`).

### What NEVER happens

- **No backend servers** — the project has no server infrastructure; there is nowhere to send data.
- **No telemetry, analytics, or tracking** — no counters, cookies, or pixels.
- **No data selling or sharing** — there is no data to sell or share.
- **No CDN at runtime** — the AI library is vendored in the package and models are downloaded directly from Hugging Face (one download per model, pinned by commit) to the browser's local cache.

### Model downloads

On the first use of each feature, the corresponding model (~865 MB total for all six) is downloaded from **Hugging Face** (huggingface.co) to your browser's cache. These downloads are public model weights and contain none of your data. Afterwards, everything works 100% offline.

### User control

- Every feature is user-initiated (nothing runs without your request).
- `Ctrl+Shift+X` restores the page to its original state.
- Removing the extension deletes local preferences; the model cache can be cleared via the browser's cached site data.

### Legal basis and compliance

Processing happens exclusively on the user's device, with no personal data handling by third parties — aligned with the **Brazilian General Data Protection Law (LGPD, Lei nº 13.709/2018)**, under which this extension is not a data controller, with the **Brazilian Inclusion Law (LBI, Lei nº 13.146/2015)** with regard to the commitment to accessibility, and with **WCAG 2.1** guidelines for the accessibility of the product itself.
