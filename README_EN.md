# 🧠 Clarifica.ai

> Universal accessibility with local Artificial Intelligence: **live CC captions**, automatic summaries, image description, audio transcription, OCR, EN→PT translation, read aloud, Essential Reading Mode, color blindness filters and neurodivergent profiles (ASD, ADHD, Dyslexia) — right in the browser, 100% offline.

**License:** Apache-2.0 · **Version:** 1.4.0 · **Manifest:** V3 · **Browsers:** Chrome 116+, Edge, Brave and other Chromium browsers · **AI:** Edge AI (local), no data leaves the device · **CI:** unit tests + E2E on a real Chromium

**Repository:** <https://github.com/eliezer-tavares/clarifica-ai>

![CI](https://github.com/eliezer-tavares/clarifica-ai/actions/workflows/ci.yml/badge.svg)

---

## 📖 About the project

Clarifica.ai is a browser extension that turns any web page into a clearer, more understandable and more inclusive experience. All the intelligence runs on the user's own device (Edge AI): the language and vision models are downloaded once, stored in the browser cache and executed locally, guaranteeing full privacy — no text, image or browsing data ever leaves the user's computer. The extension was designed for people who use screen readers (NVDA, JAWS), people with color blindness and anyone who needs less visual and cognitive noise on the web. Every action produces immediate feedback through `aria-live` regions, in compliance with the WCAG 2.1 guidelines and with the Brazilian Inclusion Law (Law No. 13,146/2015). v1.4.0 extends the product to deaf users and to English speakers: **live CC captions generated on-device** over the page's videos and **bilingual content delivery** (original language or English).

## ✨ What you can do

| # | Feature | What happens | How to trigger |
|---|---------|--------------|----------------|
| 1 | 📖 **Essential Reading Mode** | Silences navigation, footers, sidebars (`aside`), ads (`.ads`) and headers through `aria-hidden` + `inert`; moves focus to the main content (`main`/`article`). Ideal for NVDA and JAWS. | `Ctrl+Shift+L` or popup button |
| 2 | ✨ **Summarize text with AI** | Extracts the page's main text and generates a summary with the quantized DistilBART model (int8), executed in a dedicated Web Worker — the page never freezes. The result appears in the popup in a scrollable ARIA region. | `Ctrl+Shift+R` or popup button |
| 3 | 🖼️ **Describe images** | Finds all images without `alt` (or with empty/generic `alt` such as `"image"`) and generates descriptions with ViT-GPT2; applies `alt`, `aria-label` ("AI-generated description: …") and a green confirmation outline on each processed image. | `Ctrl+Shift+A` or popup button |
| 4 | 🔴🟢🔵 **Color blindness filters** | Applies chromatic correction matrices (SVG `feColorMatrix`) to the whole page, with one click and an **adjustable intensity (0–100%, mathematically interpolated)**, for **protanopia**, **deuteranopia** and **tritanopia** (covers WCAG 1.4.1 — Use of Color). | Buttons + control in the popup |
| 5 | ♻️ **Restore page** | Removes every applied effect: color filters, silenced regions and elements created by the extension. The page returns exactly to its original state. | `Ctrl+Shift+X` |
| 6 | 🔊 **Feedback for screen readers** | Every action injects a `role="status"` announcement with `aria-live="assertive"` and `aria-atomic="true"`, read immediately by the screen reader (WCAG 4.1.3 — Status Messages). | Automatic |
| 7 | 🖥️ **Accessible popup** | Live status bar (`aria-live="polite"`), seventeen native buttons navigable with `TAB`, caption language selector, labeled intensity control, result area with `role="region"` and a "Close" button. | Click the extension icon |
| 8 | 🌗 **Light/dark theme + persisted settings** | The popup follows the system (automatic mode) or pins light/dark; theme, last filter, active profile and intensity are persisted via `chrome.storage` and restored on reopen (every color pair of both themes validated at AA). | "Theme" button in the popup |
| 9 | 🌐 **pt-BR/en interface** | The interface and screen reader announcements follow the browser language (Portuguese or English), with messages versioned in `_locales` and audited by a parity test. | Automatic |
| 10 | 🧩🎯🔤 **Neurodivergent Profiles (v1.2.0)** | Three ready-made, mutually exclusive profiles with no AI/network at all: **ASD** (pauses animations, transitions and smooth scrolling, converts animated GIFs into a static canvas frame and removes shadows/blur); **ADHD** (spotlight that darkens the page around the cursor and progressive reading-block navigation with `Alt+↓/↑`); **Dyslexia** (letter, word and line spacing, system reading font with monospace code preserved, and a reading ruler that follows the mouse). Click the active profile again to turn it off; `Ctrl+Shift+X` also undoes it. | Profile buttons in the popup |
| 11 | 🎙️ **Audio transcription (v1.3.0)** | Finds the first `<video>`/`<audio>` on the page with an http(s) source, decodes and resamples the audio to mono 16 kHz PCM (deterministic linear interpolation) and transcribes with **quantized Whisper-tiny** (multilingual, automatic language detection) in a dedicated Web Worker. The transcript appears in the popup and can be read aloud. CORS-protected media gets a clear message, without freezing. | `🎙️ Transcribe Page Audio` in the popup |
| 12 | 📄 **Image OCR (v1.3.0)** | Extracts the **printed text** from images without `alt` with the quantized TrOCR-small model and applies it as `alt`/`aria-label` (WCAG 1.4.5 — images of text become readable by screen readers), with a green confirmation outline and a completion announcement on the page. | `📄 OCR — Text in Images` in the popup |
| 13 | 🌍 **EN → PT translation (v1.3.0)** | Instantly translates the **selected passage** on the page with the quantized opus-mt model (destination pinned to Portuguese), showing the result in the popup and announcing completion via `aria-live`. Up to 1,500 characters per translation. | `🌍 Translate Selection (EN → PT)` in the popup (or a user-configurable shortcut in `chrome://extensions/shortcuts`) |
| 14 | 🔊 **Read aloud (v1.3.0)** | Reads the selected passage — or the page's main content — with the **system voices** (Web Speech API: no model, no download, offline). Toggle with `aria-pressed`: click again to stop; `Ctrl+Shift+X` also interrupts. Speech continues even with the popup closed, because it lives on the page itself. | `🔊 Read Aloud` in the popup |
| 15 | 💬 **Live CC captions (v1.4.0)** | **The flagship of v1.4.0**: captures the ACTIVE TAB's audio (`chrome.tabCapture` + an offscreen document — works with `blob:`/YouTube and media without CORS), transcribes continuous 7-second windows (with 1 s of overlap) using the **100% local Whisper-tiny** and delivers each partial transcript as a caption over the video: a `<track kind="captions">` with WebVTT (the native channel, respected by screen readers and by the player's CC control), with an **overlay fallback** when the page blocks the track (CSP). A discreet "Captions active — capturing audio" chip and a single screen reader announcement. No duration cap and no audio sent to servers. Toggle with `aria-pressed`; clean teardown via a second click and `Ctrl+Shift+X`. | `💬 Live Captions (CC)` in the popup |
| 16 | 🌍 **English captions — bilingualism (v1.4.0)** | A selector in the popup switches the Whisper task: **Original** (caption in the spoken language) or **English** (speech in any detected language becomes an English caption via `task: translate`). No new model — the multilingual whisper-tiny already pinned in the project. The tiny model's translation quality is approximate (declared limitation). | `Caption language` selector in the popup |
| 17 | 🔍 **WCAG 1.2.2 checker (v1.4.0)** | An injected read-only function (no AI, no network) inventories the page's `<video>` elements and counts how many have `<track kind="captions">` or `subtitles` — for example, "2 of 3 videos lack captions" — with a direct action: generate them right there with the live captions. A minimal version of the audit-and-act cycle (the full real-time audit panel is planned for v2.0). | `🔍 Check captions (WCAG 1.2.2)` in the popup |

### What you get in practice

- **Less noise:** dense pages (news portals, dashboards) stay focused on the relevant content.
- **Understandable images:** photos and charts without descriptions get AI-generated `alt` text.
- **Shorter texts:** long articles become summaries in seconds, without copying and pasting into external sites.
- **Corrected colors:** the three most common types of color blindness covered instantly.
- **A web without overload:** the ASD, ADHD and Dyslexia profiles reduce stimulation, keep focus and make reading easier — each in one click.
- **Understandable audio:** embedded videos and podcasts become locally transcribed text, readable by screen readers and re-read aloud.
- **Watchable videos:** CC captions generated on-device, synced over the video while it plays — including `blob:` sources (YouTube) that the one-shot transcription cannot reach.
- **English speakers served:** English interface, captions in the original language and speech translated to English — the content is now bilingual too.
- **Caption-less videos discovered:** the WCAG 1.2.2 checker points out videos without a captions track and offers to generate them right there.
- **Decipherable images with text:** screenshots and infographics with printed text gain a textual alternative via OCR.
- **No English barrier for Brazilians:** selected passages are translated into Portuguese on the spot, without leaving the page or sending anything to third parties.
- **Full privacy:** zero own servers, zero telemetry, zero cookies.

## ⚙️ Requirements

- A Chromium-based browser, version **116 or higher** (Chrome, Edge, Brave, Opera) — v1.4.0 raised the minimum from 102 to 116 because `chrome.tabCapture.getMediaStreamId` in the service worker requires Chrome 116+ (the offscreen document exists since 109).
- About **800 MB** of free disk space for the AI models, downloaded once on the first use of each feature (~300 MB for summarization, ~250 MB for vision, ~115 MB for translation, ~60 MB for OCR, ~45 MB for transcription/captions — read aloud uses the system voices and downloads nothing). **v1.4.0 adds no model**: whoever already used the transcription downloads **zero bytes** to use live captions.
- An internet connection **only** on the first use of each model; afterwards everything works 100% offline.

## 📥 Installation

1. Clone the repository (or download the ZIP through **Code → Download ZIP**):

   ```bash
   git clone https://github.com/eliezer-tavares/clarifica-ai.git
   ```

2. Open `chrome://extensions/` in the browser.
3. Enable **Developer mode** (top right corner).
4. Click **Load unpacked** and select the `clarifica-ai` folder.
5. (Optional) Pin the extension icon to the toolbar for quick access.

## 🕹️ How to use

**By keyboard (recommended for screen readers):**

| Shortcut | Action | Expected screen reader feedback |
|----------|--------|---------------------------------|
| `Ctrl+Shift+L` | Essential Reading Mode | "Clarifica.ai: Essential Reading Mode activated. Noise silenced." |
| `Ctrl+Shift+R` | Summarize page with AI | "Clarifica.ai: Summarizing the page with artificial intelligence." |
| `Ctrl+Shift+A` | Describe images | "Clarifica.ai: Starting image description. Please wait." |
| `Ctrl+Shift+X` | Restore original page | "Clarifica.ai: Deactivated. Page restored to the original." |

**From the popup:**

1. Click the Clarifica.ai icon and navigate with `TAB` to the desired button; press `ENTER`.
2. For color blindness, choose **Protanopia**, **Deuteranopia** or **Tritanopia** — the color change is instant and announced via `aria-live`.
3. Summaries appear in the "Result:" box; press "Close" to return to the initial state.
4. The status bar at the top of the popup reports each step ("Processing...", "Done!", errors and warnings).
5. **Neurodivergent Profiles:** choose the **ASD profile** (less stimulation), the **ADHD profile** (focus, with reading navigation via `Alt+↓/↑`) or the **Dyslexia profile** (spaced reading with a ruler). Clicking the active profile again turns it off; profiles are mutually exclusive and the choice is remembered.
6. In the ADHD profile, move the mouse to position the spotlight and use `Alt+↓`/`Alt+↑` to advance/return one reading block; in the Dyslexia profile, the ruler follows the cursor so you never lose your line.
7. **Audio and Multimodal:** `🎙️ Transcribe Page Audio` transcribes the page's first video/audio (the result appears in "Result:"); `📄 OCR` extracts printed text from images and applies it as a description; `🌍 Translate Selection` translates the passage you selected on the page; `🔊 Read Aloud` reads the selected passage or the main content — click again to stop (or use `Ctrl+Shift+X`).
8. **Live Captions (v1.4.0):** open a page with video (YouTube included) and click `💬 Live Captions (CC)`. Tab audio capture starts with the click gesture, the "Captions active — capturing audio" chip appears on the page and the captions start following the video (near real-time: typical delay of 5 to 15 s). For pages with only `<audio>` (podcasts), the live transcript appears in the popup itself. Clean stop: click the button again or use `Ctrl+Shift+X`. Navigating the tab ends the capture with a clear message.
9. **Caption language (v1.4.0):** the `Caption language` selector switches between **Original** (caption in the spoken language) and **English (translation)** — speech in any language detected by Whisper becomes an English caption. Switching while captions run restarts the capture with the new task.
10. **Check captions (v1.4.0):** `🔍 Check captions (WCAG 1.2.2)` inventories the page's videos and reports how many lack captions (for example, "2 of 3 videos lack captions") — with Live Captions one click away to generate them right there.

## 🏗️ Architecture

```text
.                            (repository root)
├── .github/
│   └── workflows/ci.yml   # CI: unit suite (with real AI) + E2E on a real Chromium
├── README.md              # Full documentation (pt-BR) — kept in lockstep
├── README_EN.md           # Full documentation (English) — this file
├── LICENSE                # Apache-2.0 license
└── clarifica-ai/          # Folder loaded in Chrome ("Load unpacked")
    ├── manifest.json      # Manifest V3: shortcuts, minimal permissions (incl. tabCapture/offscreen), CSP, icon, default_locale, Chrome 116+
    ├── background.js      # Service Worker: keyboard commands + ARIA announcements + offscreen lifecycle and live-captions bridge
    ├── offscreen/         # Offscreen document (v1.4.0): tab capture, continuous windows, Whisper worker, WebVTT assembly
    │   ├── offscreen.html
    │   └── offscreen.js
    ├── _locales/          # pt-BR/en interface messages (pt_BR is the default; 91 keys in parity)
    │   ├── pt_BR/messages.json
    │   └── en/messages.json
    ├── popup/
    │   ├── popup.html     # Semantic, accessible UI (__MSG__ i18n placeholders)
    │   ├── popup.css      # Light/dark themes (AA in both) + slider + profiles + audio/multimodal + caption language selector
    │   ├── popup.js       # Orchestrates injection, filters, profiles, audio/multimodal, live captions, theme, storage, i18n
    ├── scripts/
    │   ├── ai-worker.js   # Web Worker: vendored Transformers.js (no CDN), pinned versions; accepts task/language (v1.4.0)
    │   └── clarifica-puro.js  # Shared pure logic (v1.4.0): resampling, window plan, WebVTT, video selection, 1.2.2 audit
    ├── vendor/            # Vendored library: transformers.min.js + 4 onnxruntime WASM binaries
    ├── assets/
    │   └── icon.png       # 128×128 icon
    ├── VERSOES_MODELOS.md # Registry of pinned library/model versions (pt-BR)
    └── tests/             # Complete suite: Node (unit + real AI) and Playwright (E2E)
```

**Technical flow:** keyboard shortcut → Service Worker (`chrome.commands`) → `chrome.scripting.executeScript` injects functions into the page → DOM manipulation (ARIA, filters, profiles) or postMessage to the popup. AI inference runs in an isolated Web Worker with the Transformers.js library **vendored in the package itself** (`vendor/transformers.min.js` + local WASM binaries — zero CDN since v1.1.0) and quantized models pinned by revision (`distilbart-cnn-12-6` for summarization, `vit-gpt2-image-captioning` for vision, `whisper-tiny` for transcription/captions, `trocr-small-printed` for OCR and `opus-mt-en-ROMANCE` for EN→PT translation), shrinking float32 weights to int8 and making execution viable on modest hardware. The neurodivergent profiles (v1.2.0) need no AI: each profile's CSS is generated by testable pure logic in the popup and crosses the boundary as an argument. Audio (v1.3.0) is decoded and resampled to 16 kHz mono on the page itself (testable pure logic) before crossing into the Worker; read aloud uses the native Web Speech API on the page. Live captions (v1.4.0) follow the recommended MV3 pattern: popup → service worker (`chrome.tabCapture.getMediaStreamId` + offscreen document supervisor) → offscreen (`getUserMedia` with `chromeMediaSource 'tab'`, 7 s windows with 1 s of overlap, Whisper worker via Blob, WebVTT from the pure module) → service worker (`chrome.scripting`) → page (`<track kind="captions">` with a Blob WebVTT and the overlay fallback) and popup (live transcript). The shared pure logic lives in `scripts/clarifica-puro.js` (imported by the offscreen and extracted by markers for the Node tests, with source parity guaranteed by tests for the inline copies in the popup and the service worker).

## 🔧 Engineering notes

Adjustments applied over the original specification, identified during test batteries:

- Added `web_accessible_resources` for `scripts/ai-worker.js` — a Chrome requirement for pages to create Workers from extension resources.
- Programmatic focus on the main content now sets `tabindex="-1"` before `main.focus()` — without it the browser ignores focus on non-interactive elements and the screen reader never jumps to the content (found by the accessibility tests).
- The popup's **Essential Reading** and **Color Blindness** flows now handle injection failures with a clear user message (previously success was assumed even when injection failed).
- **Found by the E2E tests in a real browser:** Chrome blocks `new Worker('chrome-extension://...')` from a web page with `SecurityError` — even with the resource in `web_accessible_resources` — and the `ai-worker.js` used `import` from a CDN (ES module syntax, invalid in a classic worker). The popup now fetches the worker code and creates the Worker from a Blob as an ES module, revoking the Blob on termination, with graceful cache degradation on insecure origins. Without this fix, summarization and image description would **never have worked** in real use.
- **Found by the E2E tests in a real browser:** when the injected function rejects, `chrome.scripting.executeScript` returns `result: null` (it does not propagate the error) — the popup used to display "Done!" with empty output. All results are now validated before showing success, and the summary only resolves on the worker's final message (`success`/`error`), never on the first progress signal.
- Added `author` (contact e-mail) and `minimum_chrome_version: 116` to the manifest (102 → 116 in v1.4.0: `tabCapture.getMediaStreamId` in the service worker requires Chrome 116+).
- AI library and model versions are **pinned by commit (SHA)** on Hugging Face — no floating branch — with a formal upgrade/rollback procedure described in [`clarifica-ai/VERSOES_MODELOS.md`](clarifica-ai/VERSOES_MODELOS.md) and audited by an automated test.
- **v1.1.0 — Local packaging of Transformers.js:** the official 2.14.0 bundle and the 4 onnxruntime WASM binaries live in `vendor/` (published in `web_accessible_resources`); the `ai-worker.js` receives the local URLs via placeholders injected by the popup and the CDN import was eliminated — the package complies with Manifest V3 with no remote code and inference no longer depends on third parties at runtime.
- **v1.1.0 — Color blindness filter intensity:** linear interpolation between the identity matrix and the filter matrix (`M' = t·M + (1−t)·I`), preserving RGB row sums and the alpha channel at any intensity; 0–100% slider in the popup, re-applied on release and persisted per setting.
- **v1.1.0 — pt-BR/en message engine:** the native `chrome.i18n.getMessage` depends on the browser process's app-locale, which is unreliable in headless builds (E2E) and multilingual installs; the popup resolves the language via `navigator.languages` → `getAcceptLanguages` → pt_BR fallback, loads the `_locales` JSONs from the package itself and publishes the choice to `chrome.storage`, from where the service worker consumes it (reacting to `onChanged`). Errors crossing the page↔popup boundary are codes translated at the destination.
- **v1.1.0 — Latent bug fix:** image description did not handle worker errors — a failure left a zombie Worker running; the Worker is now terminated with Blob cleanup on the first error.
- **v1.2.0 — Neurodivergent Profiles (roadmap delivered):** three ready-made, exclusive profiles with no AI/network/new permission. **ASD:** `animation-play-state: paused` (animations freeze where they are, not skipped to the end), `document.getAnimations()` to cover the Web Animations API, animated GIFs converted to a static canvas frame (restorable; graceful degradation when canvas is unavailable, alternative text preserved via `role="img"` + `aria-label` on the canvas — `alt` has no effect on canvas) and shadow/blur removal — with `documentElement` excluded so the color blindness filter (which lives on `html`) is not erased. **ADHD:** spotlight with a `radial-gradient` mask positioned by CSS variables (`--clarifica-x/y`) updated on `mousemove` with `requestAnimationFrame` throttling, and progressive reading navigation via `Alt+↓/↑` over `p/li/h1–h6/blockquote/pre` (empty blocks ignored, 400-block cap, `scrollIntoView` with an existence guard). **Dyslexia:** letter/word/line spacing and the system reading font applied to text selectors, with a final rule restoring `code/pre/kbd/samp/textarea/input` to normal spacing and the monospace font (indentation is significant), and a reading ruler as a fixed 48 px strip (`position: fixed`, `pointer-events: none`, translucent-background borders) that the cursor positions 24 px above itself. All profiles are toggleable, exclusive, persisted (`perfilAtivo`) and torn down by both the toggle and `Ctrl+Shift+X` — the service worker's `reset-all` mirrors the popup cleanup (elements, classes, restored GIFs and listeners), parity guaranteed by tests.
- **v1.3.0 — Local transcription (Whisper-tiny, ~45 MB):** the popup finds the first `<video>`/`<audio>` with an http(s) `src` (blob:/data: are ignored — not fetchable), fetches the media in the PAGE's context (relative URLs resolve against the site origin), decodes with `AudioContext.decodeAudioData` and resamples to **mono 16 kHz PCM** by linear interpolation — a pure function (`reamostrarPara16k`) extracted by markers and numerically tested in Node. The PCM crosses the boundary as a `Float32Array` (120 s cap ≈ 7.7 MB) to the Worker, which runs Whisper in 30 s windows (`chunk_length_s`/`stride_length_s`) with automatic language detection. Network/CORS failures produce translated error codes in the popup (`media-bloqueado`, `audio-indisponivel`, `audio-muito-curto`) — the page never gets stuck on "Processing".
- **v1.3.0 — OCR as textual alternative (TrOCR-small-printed, ~60 MB):** the OCR runs on the SAME images as description (no `alt`, empty or the generic "image"), and the extracted text is applied as `alt` + `aria-label` with the i18n prefix "Image text (OCR): " — images of text become readable by screen readers (WCAG 1.4.5). Worker termination is counted by RESPONSES (not useful texts), so there is never a zombie Worker when the OCR comes back empty; completion is announced on the page with the real count (`$quantidade$` replaced on the page — the only context that knows the image count).
- **v1.3.0 — EN→PT translation with pinned destination (opus-mt-en-ROMANCE, ~115 MB):** multilingual Marian models have no language parameter in the Transformers.js 2.14.0 pipeline — the Portuguese destination is pinned by the conventional `>>pt<< ` prefix on the source text, in the Worker, and validated with real inference (audited output: "A acessibilidade digital garante que os sites possam ser usados por todos."). Input: the page's `window.getSelection()`, 1,500-character cap; empty selection returns its own code (`selecao-vazia`) without creating a Worker.
- **v1.3.0 — TTS without a model (Web Speech API):** product decision documented in the version registry: read aloud uses `speechSynthesis` with SYSTEM voices (better quality than a quantized neural model, zero download, offline). Synthesis lives on the PAGE (survives the popup closing), the button is a toggle with `aria-pressed`, the voice follows the interface language (pt-BR/en-US) and the service worker's `reset-all` also interrupts speech — covered by tests.
- **v1.3.0 — Translation command without a suggested shortcut:** Chrome accepts at most 4 suggested shortcuts per extension; the 4 originals remain and the new `traduzir-selecao` command ships WITHOUT `suggested_key`, configurable by the user at `chrome://extensions/shortcuts` — documented decision pinned by a test in `manifest.test.js`.
- **v1.4.0 — Live CC captions (recommended MV3 capture pattern with an offscreen document):** the popup click is the user gesture; the service worker guarantees EXACTLY one offscreen document (`chrome.runtime.getContexts` + idempotent recreation — the documented `setupOffscreenDocument` pattern) and obtains the stream id via `chrome.tabCapture.getMediaStreamId` (with a **5-second safety cap**: in limited environments the API may stay pending forever — the UI never gets stuck on "Starting..."). The M1 risk-plan fallback is implemented in the popup (also an extension page with a gesture): if the SW is refused, the popup obtains the id and re-sends it. The offscreen (`offscreen/offscreen.js`, the only fully new module in the stack) exchanges the id for a real `MediaStream` (`getUserMedia` with `chromeMediaSource 'tab'` — works for `blob:`/YouTube and media without CORS), reconnects the stream to the `AudioContext` destination to keep listeners able to hear, and feeds continuous 7 s windows with 1 s of overlap (scheduler driven by the pure `planoDeJanelas`). Each window is resampled to 16 kHz (`reamostrarPara16k`) and sent to the Whisper worker through the SAME Blob pattern as the popup; each partial transcript becomes a caption and the WebVTT is assembled by the pure module (`montadorVtt`, with dedupe and ordering). Honest latency: **near real-time, typical 5–15 s delay** (window + inference), declared in the interface and in this README.
- **v1.4.0 — Page delivery: native track with detection-based fallback:** the preferred form is a `<track kind="captions">` with a Blob URL of the incremental WebVTT (the standard captions channel, respected by screen readers and the player's CC control); when the track fails (restrictive CSP, cross-origin track), the `error` event triggers the overlay fallback — a fixed box over the video with `aria-hidden` (the caption is visible text; the state announcement is unique). The target video is chosen by the pure `seletorDeVideoAlvo` (largest visible video; ties broken by document order). Audio-only pages get no track: the same pipeline feeds the live transcript in the popup. States and errors cross the boundary as translated codes (`captura-negada`, `aba-sem-midia`, `captura-encerrada`, `falha-legendas`).
- **v1.4.0 — Shared pure logic module (`scripts/clarifica-puro.js`):** the css-filters/profiles extraction pattern moves into a single file consumed at runtime (the offscreen imports it as an ES module) and by the Node tests (marker extraction). Functions that also run INSIDE injected functions (`reamostrarPara16k` and `auditoriaLegendas` in the popup, `seletorDeVideoAlvo` in the service worker) remain as marked inline copies — source parity with the canonical module is guaranteed by three tests in `legendas.test.js`, the same discipline as the i18n parity. The v1.3.0 one-shot transcription flow remains untouched (the existing tests are the safety net).
- **v1.4.0 — Content bilingualism with no new model:** the "Caption language" selector switches the speech recognition pipeline's task between transcription and `task: 'translate'` (speech in any detected language → English caption) — the whisper-tiny already pinned in registry v3 is multilingual. `ai-worker.js` accepts `opcoes.tarefa`/`opcoes.idioma` on the `transcribe-audio` message; without options, v1.3.0 behavior is bit-for-bit identical (audited with real inference).
- **v1.4.0 — Minimal WCAG 1.2.2 checker:** an injected read-only function inventories the `<video>` elements and counts those with `<track kind="captions">`/`subtitles` (via DOM and the `textTracks` API — other kinds such as `chapters` do NOT count, covered by tests). Result in the popup with counts (`$sem$`/`$total$`) and a direct action through the live captions — the audit-and-act cycle; the full real-time audit panel stays reserved for v2.0.
- **v1.4.0 — Complementary resources documented (VLibras, NVDA, JAWS):** a section in this README recommends complementary tools, with zero integration code — Manifest V3 offers no supported path for one extension to trigger another (no `externally_connectable`) and VLibras is pt-BR only; coupling would be third-party dependency without technical gain.
- **v1.4.0 — README_EN.md:** English documentation created in lockstep with the README (the v1.4.0 plan already treated it as existing; from this release it lives in the repository for real, kept in content parity on every update).

## 🧪 Tests

Two complementary layers: the **unit suite** (Node, native runner, with real AI inference) and the **E2E tests** (the extension actually loaded in Chromium by Playwright, exercising flows on real HTTP pages).

| Layer | Suite | What it covers |
|-------|-------|----------------|
| Unit (Node) | `manifest.test.js` | Manifest V3 integrity, version 1.4.0, `default_locale` + `_locales` present, 4 valid shortcuts + translation command without a suggested shortcut (Chrome's limit), minimal permissions (3 original + `tabCapture`/`offscreen` from v1.4.0), CSP, real 128×128 PNG icon (binary header), worker and `vendor/*` published as web accessible resources, minimum Chrome 116 |
| Unit (Node) | `background.test.js` | Command listener with i18n announcements (message resolved in the SW and injected as an argument), `aria-live` announcements (WCAG 4.1.3), Essential Reading Mode (ARIA + focus), `reset-all` (including read-aloud cancellation — v1.3.0, and the captions host teardown — v1.4.0), captions lifecycle functions degrading gracefully without Chrome APIs, `TRIGGER_ACTION` messages (including `translate-selection`) |
| Unit (Node) | `legendas.test.js` | **Live Captions and Bilingualism (v1.4.0)** — shared pure logic (`clarifica-puro.js`): `planoDeJanelas` (single window, overlap-contiguous step, short final window, invalid inputs without infinite loops, sanitized options), `montadorVtt` (header/timestamps, ordering, dedupe by start+text, discard and clamp), `seletorDeVideoAlvo` (largest visible area, discards, tie, absence), `auditoriaLegendas` (no track, captions/subtitles, wrong kind, mix); **source parity** of the inline copies (popup/background) with the module; **in-memory message protocol simulation** (the REAL offscreen.js evaluated in Node: capture → windows → fake Whisper → WebVTT → delivery → idempotent teardown); popup flows (toggle start/stop with persistence, translated error, language switch restarting capture, reopen restoring state, checker with counts, live transcript, externally ended capture); manifest/offscreen integration |
| Unit (Node) | `popup.test.js` | Complete flows of the 17 controls, 3 filters with **interpolated intensity**, re-application on slider release, persistence of theme/filter/intensity (`chrome.storage` restored on reopen), light/dark theme cycle, pt-BR interface, summary and image description end to end (Worker replaced by a message stub with translated error codes), injection error handling; v1.4.0 structure (captions toggle, checker without aria-pressed, selector with 2 options and label) |
| Unit (Node) | `accessibility.test.js` | axe-core on the popup in **light AND dark themes** (critical/serious/moderate/minor violations = 0), WCAG 1.4.3 AA contrast for both themes' color pairs, focus/hover states, ARIA semantics |
| Unit (Node) | `css-filters.test.js` | The pure filter logic is extracted and exercised in Node: valid `feColorMatrix` matrices (20 values, RGB rows sum 1, alpha preserved), intensity interpolation (0/25/50/75/100 and out of range) preserving the properties, formatting and data URI construction, both themes' CSS variables |
| Unit (Node) | `i18n.test.js` | Full pt_BR↔en parity (same keys), structurally correct placeholders, every key used in code/HTML exists in both locales, no orphan keys, contracted texts preserved |
| Unit (Node) | `ai-worker.test.js` | **Real AI inference** — no mocks: the worker code really executes with the official Transformers.js 2.14.0 (the same vendored version) and the project's pinned quantized models, producing real summarization (`Xenova/distilbart-cnn-12-6`), real image description (`Xenova/vit-gpt2-image-captioning`), **real speech transcription** (`Xenova/whisper-tiny` on the JFK speech in `jfk.wav`, with the project's real 16 kHz resampler), **real OCR** (`Xenova/trocr-small-printed` on printed-text image), **real EN→PT translation** (`Xenova/opus-mt-en-ROMANCE` with the `>>pt<<` prefix) and the **real Whisper translation task** (v1.4.0: `opcoes.tarefa=traduzir` runs `task: translate` without breaking the pipeline); validates loading, model reuse, message protocol and zero CDN |
| Unit (Node) | `versoes-modelos.test.js` | Version registry integrity: vendored library (`vendor/transformers.min.js` + 4 WASM with a real header), worker with no CDN and locally injected URLs, **the 5 models** with pinned (SHA) revisions, **TTS declared as Web Speech API without a model**, manifest publishing `vendor/*`, pre-download, devDependency and CI cache key synced with [`clarifica-ai/VERSOES_MODELOS.md`](clarifica-ai/VERSOES_MODELOS.md) |
| Unit (Node) | `multimodal.test.js` | **Audio and Multimodal (v1.3.0)** — pure resampling logic (exact linear ramp, preserved endpoints, 48 kHz → 16 kHz, invalid inputs); complete popup flows: transcription with no media/CORS/worker error, 16 kHz PCM crossing the boundary, OCR applied as `alt`/`aria-label` with a count announcement and no zombie Worker, translation with empty selection and with a selected passage, TTS toggle with the interface language's voice and degradation without `speechSynthesis`; injection failure on all four flows |
| Unit (Node) | `perfis.test.js` | **Neurodivergent Profiles (v1.2.0)** — pure CSS logic of the three profiles extracted and exercised in Node (ASD pauses without touching `html`; ADHD spotlight via CSS variables; dyslexia spacing + monospace restoration last); complete popup flows (toggle, exclusive switching, persistence and restoration of `perfilAtivo`, injection error); real state on the target page (styles by id, spotlight following the mouse, `Alt+↓/↑` navigation ignoring empty blocks, ruler following the cursor, no-canvas fallback, idempotent cleanup) |
| **E2E (real Chromium)** | `e2e/carregamento.spec.js` | The extension is accepted by a real Chrome: MV3 service worker registered, popup opens with **15 buttons** (including profiles, audio/multimodal, captions and the checker)/`aria-live`/slider/theme/**caption language selector with 2 options** and **zero console errors**; **the vendor is served by the extension itself and importable** (2.14.0 bundle + valid WASM, no CDN) |
| **E2E (real Chromium)** | `e2e/popup.spec.js` | Real popup clicks apply Essential Reading (ARIA + focus) and color blindness filters on a real HTTP page; **ASD and Dyslexia profiles applied and turned off on the real page (v1.2.0)**; summary error path; **translation with no selection gets a clear error and no model loads (v1.3.0)**; **WCAG 1.2.2 checker on a real page with 3 videos (no track × with captions × wrong kind → "2 of 3 videos lack captions") and on a page with no videos (v1.4.0)**; **captions toggle with clear feedback and captions-host teardown by `reset-all` in the real isolated world (v1.4.0)**; real AI opt-in (`CLARIFICA_E2E_IA=1`) — **the Blob worker imports the vendored bundle and really summarizes inside the browser** |
| **E2E (real Chromium)** | `e2e/service-worker.spec.js` | Keyboard shortcuts (faithful mirror of the listener): assertive `aria-live` announcement with the message-engine text, `TRIGGER_ACTION`, full page restoration and robustness with an unknown action — injection via real `chrome.scripting` |

**How to run:**

```bash
cd clarifica-ai/tests
npm install
npm test            # full unit suite (includes real AI inference)
npm run test:e2e    # extension on a real Chromium via Playwright
```

> **Prerequisites:** the E2E tests require the Playwright browser — install it once with `npx playwright install chromium`. **Real inference:** the AI test runs the real models — on the first run on a new machine the weights (~800 MB) are downloaded from Hugging Face to `clarifica-ai/tests/.cache`. To pre-download: `npm run preparar:modelos`. **Machines with less than ~6 GB of RAM:** run with `npm test -- --test-concurrency=1` (the 5 resident models raise peak memory; documented since TEST_REPORT revision 8).

The consolidated result of the latest run is in [`clarifica-ai/tests/TEST_REPORT.md`](clarifica-ai/tests/TEST_REPORT.md) (in Portuguese).

## 🤖 Continuous integration (CI)

The project keeps an automatic pipeline (`.github/workflows/ci.yml`) with **two independent gates** executed on every push and pull request — runs are public on the repository's [**Actions**](https://github.com/eliezer-tavares/clarifica-ai/actions) tab:

1. **Unit suite + real AI** — runs `npm test` on Node 24 with model weights cached between runs (the cache key embeds the pinned model SHAs, so a model upgrade automatically invalidates the cache and forces validation of the new weights).
2. **E2E on a real Chromium** — Playwright loads the unpacked extension (the same mechanism as Developer Mode), waits for the MV3 service worker and exercises the real flows: popup, injection via `chrome.scripting`, ARIA, filters, captions checker and restoration. On failure, the Playwright HTML report is published as an artifact.

Thus any regression — manifest, accessibility, message protocol or model — breaks the build **before** reaching the user.

## 🔄 Model versioning

The AI library and each model have a version **pinned by commit (SHA)** on Hugging Face — nothing floats. The complete registry, the step-by-step upgrade procedure, acceptance criteria and the rollback policy are in [`clarifica-ai/VERSOES_MODELOS.md`](clarifica-ai/VERSOES_MODELOS.md) (in Portuguese). An automated test (`versoes-modelos.test.js`) confronts the registry with the code and breaks the CI on any divergence: model changes are always deliberate, tested with real inference and documented.

## 🗺️ Roadmap to the final version

| Version | Focus | Planned items |
|---------|-------|---------------|
| **v1.1.0** | **Stability and configuration — ✅ delivered 2026-11-07** | Local packaging of Transformers.js in `vendor/` (CDN eliminated, MV3 compliant); persisted settings with `chrome.storage` (theme, last filter, intensity); color filter intensity fine-tuning (0–100%); light/dark popup theme (AA in both); pt-BR/en internationalization with its own message engine; consolidated report in TEST_REPORT revision 5 |
| **v1.2.0** | **Neurodivergent profiles — ✅ delivered 2026-11-08** | **ASD profile** (animation/transition/smooth-scroll pausing; animated GIFs converted to static canvas frames; shadow and blur removal); **ADHD profile** (focus mode with a spotlight around the cursor; progressive reading blocks with `Alt+↓/↑`); **Dyslexia profile** (letter, word and line spacing; system reading font with monospace code preserved; reading ruler following the mouse); exclusive, toggleable, persisted profiles integrated with `Ctrl+Shift+X`; consolidated report in TEST_REPORT revision 6 |
| **v1.3.0** | **Audio and multimodal — ✅ delivered 2026-11-09** | **Local audio transcription** (quantized Whisper-tiny, multilingual, with deterministic 16 kHz resampling on the page, for videos and podcasts); **OCR** on images without alt (quantized TrOCR-small, text applied as `alt`/`aria-label` — WCAG 1.4.5); **read aloud** with local TTS (Web Speech API — system voices, no model and no download, toggle with `aria-pressed`, integrated with `Ctrl+Shift+X`); **instant passage translation** EN→PT (quantized opus-mt-en-ROMANCE, destination pinned by `>>pt<<`, configurable command without a suggested shortcut); version registry rises to 3 (5 models pinned by SHA + TTS decision) and the CI cache key changes in lockstep; consolidated report in TEST_REPORT revision 8 |
| **v1.4.0** | **Live captions, bilingualism and audiovisual accessibility — ✅ delivered 2026-11-10** | **Live CC captions over the video** (flagship): tab audio capture (`chrome.tabCapture` + offscreen document — closes all three gaps of the one-shot transcription: `blob:`/CORS, sync and the 120 s cap), Whisper in continuous 7 s windows with 1 s of overlap, `<track kind="captions">` with WebVTT and the overlay fallback, state chip and a single announcement, clean teardown via toggle/`Ctrl+Shift+X`/navigation; **content bilingualism** (original × English selector via Whisper's `task: translate` — zero new models); **minimal WCAG 1.2.2 checker** (audit and act); **shared pure logic** in `scripts/clarifica-puro.js` with test-guaranteed parity; **complementary resources documented** (VLibras, NVDA, JAWS); **README_EN.md** created in lockstep; suite 120 → 154 tests, expanded E2E, consolidated report in TEST_REPORT revision 9 |
| **v2.0** | **Final version** | Question-and-answer assistant about the page (local QA); multilingual pt-BR models for summarization and image description (including Plain Portuguese in direct SVO order — model-based, not rule-based); full real-time page accessibility audit panel (WCAG report); profile synchronization; publication on the Chrome Web Store; Firefox support (WebExtensions) |

Each roadmap step keeps the project's principles: local AI execution, privacy by default (Privacy by Design) and accessibility as a requirement, not an accessory.

## ⚠️ Known limitations

- The current summarization, image description and OCR models generate text in **English** (the OCR reproduces the text in the image); EN→PT translation and Whisper transcription cover other languages, but the full switch to multilingual pt-BR models is planned for v2.0.
- The one-shot transcription processes the **first** `<video>`/`<audio>` on the page with an http(s) source and up to **120 seconds** of audio — CORS-protected media (e.g., streaming platforms) gets a clear message and is not transcribed.
- **Live captions (v1.4.0):** they are **near real-time** (typical 5–15 s delay — a 7 s window plus Whisper inference; the model is not streaming); seeking in the video can desync the track — the chip/overlay keep showing the current speech; the **English translation quality** of the tiny model is approximate (improving with whisper-base follows the registry upgrade procedure); **DRM platforms** (Netflix, Prime Video) produce silence in the capture — a limitation of Chrome itself; in some configurations capture may affect the tab's audio (the offscreen reconnects the stream to keep listeners able to hear; hardware-dependent behavior).
- The OCR reads **printed text** (not handwriting) and works best on images with few lines; whole pages are not converted — only images without `alt`.
- Read aloud depends on the **voices installed on the system**; without a compatible voice, the browser uses the default voice.
- Restricted pages (`chrome://`, Chrome Web Store) do not allow script injection — a browser security behavior (live captions report `aba-sem-midia` there).
- Texts under 200 characters are not summarized (protection against context-free results).
- The first use of each AI feature downloads the corresponding model and requires a connection; afterwards it is offline (live captions download nothing for whoever already used transcription).
- Effects applied to pages (profiles, filters, Essential Reading, captions) apply to the current page; after navigating, just re-enable with one click — choices are remembered in the popup.

## 🧰 Recommended complementary tools

Clarifica.ai is a local accessibility layer; for needs beyond the product's scope, these mature tools complement it well (zero code integration — documented recommendation):

- **VLibras** — Brazilian government suite translating content into **Libras** (from Portuguese); distributed as its own extension, which Manifest V3 cannot have another extension trigger in a supported way. Detection and install suggestion may be re-evaluated in v2.0 if demand is registered.
- **NVDA** — free Windows screen reader; the extension's `aria-live` announcements were designed and tested for its flow.
- **JAWS** — commercial screen reader widely used in Brazil; Essential Reading Mode and the keyboard shortcuts follow the patterns it and NVDA navigate best.

## 🤝 Contributing and reporting issues

Found a bug, an accessibility barrier or have a suggestion? Open an [issue](https://github.com/eliezer-tavares/clarifica-ai/issues) describing the visited page, the feature used (shortcut or popup button), the screen reader/browser and the observed versus expected behavior.

Pull requests are welcome. Before submitting, keep the suite green (`npm test` and `npm run test:e2e` inside `tests/`) and preserve the project's principles: 100% local AI, privacy by default and accessibility as a requirement, not an accessory.

## 👤 Authorship and academic context

**Architected by** Eliezer Tavares de Oliveira
✉️ contact@eliezertavaresdeoliveira.com
GitHub: [github.com/eliezer-tavares](https://github.com/eliezer-tavares)

Eliezer Tavares de Oliveira is blind and a screen reader user — lived experience that grounds every accessibility decision of this project, from `aria-live` feedback to keyboard shortcuts designed for NVDA and JAWS. He is a student in the **Computer Engineering** program at **UNIVESP (Universidade Virtual do Estado de São Paulo)**, and this application was architected as the deliverable of the **Projeto Integrador VI** course.

## 📄 License

This project is distributed under the **Apache 2.0 License**. See the [`LICENSE`](LICENSE) file for the full English text, including terms of use, reproduction and distribution.
