---
title: 'Clarifica.ai: a privacy-first browser extension for on-device accessibility AI'
tags:
  - JavaScript
  - accessibility
  - edge AI
  - browser extension
  - WebExtensions
  - screen readers
  - WCAG
authors:
  - name: Eliezer Tavares de Oliveira
    orcid: 0009-0007-2577-8635
    affiliation: 1
affiliations:
  - name: Universidade Virtual do Estado de São Paulo (UNIVESP), Brazil
    index: 1
date: 12 November 2026
bibliography: paper.bib
---

# Summary

Clarifica.ai is a browser extension that brings a full suite of accessibility features to the web with all artificial intelligence running **on-device** (Edge AI). It is delivered as a WebExtensions package (Manifest V3 for Chromium browsers and Manifest V2 for Firefox) whose single intelligence core — a vendored Transformers.js build with SHA-pinned quantized models — performs extractive question answering over the current page, text summarization, image captioning, printed-text OCR, speech recognition (including live captions with a bilingual mode), and English-to-Portuguese translation. Non-AI features include three neurodivergent profiles (autism, ADHD, dyslexia), color-blindness filters with adjustable intensity, a screen-reader-oriented Essential Reading mode, a real-time WCAG audit panel, and profile/filter synchronization across tabs and navigations. Every action provides immediate feedback through `aria-live` regions designed for screen reader users (NVDA, JAWS), in conformance with WCAG 2.1 success criteria and the Brazilian Inclusion Law (Lei nº 13.146/2015). No text, image, or audio ever leaves the user's device: there are no backend servers, no telemetry, and no third-party runtime dependencies (the inference library is vendored into the package, and every model is pinned to a specific Hugging Face commit).

# Statement of need

Web accessibility tooling overwhelmingly depends on cloud services: summarizers, image describers, and transcription APIs process user content on remote servers, which raises privacy barriers for the exact populations that depend on them and prevents offline use. At the same time, blind and low-vision users — and users with cognitive disabilities — need immediate, localized feedback in the interface they already operate with a screen reader, not dashboards to interpret.

Clarifica.ai was designed from this lived position: the author is blind, a screen reader user, and a computer engineering student, and every product decision is exercised by an automated test suite (199 unit tests with real model inference plus 25 end-to-end tests — 23 in the standard suite and 2 opt-in tests with real AI — loading the extension in a real Chromium). The project fills a concrete gap: a **single, privacy-first browser extension** that combines generation-capable local models (extractive QA, summarization, captioning, ASR) with rule-free, model-assisted accessibility features, that is auditable (model revisions pinned by SHA, vendored library, reproducible CI) and that is engineered around screen reader feedback as a first-class requirement. Extractive question answering in particular was chosen over generative models so that answers are always substrings of the page's own text — hallucination is eliminated by construction, a property proven by the test suite.

The software is also an academic deliverable (Projeto Integrador VI, UNIVESP), where reproducibility is a requirement: pinned model revisions guarantee that a reviewer can reproduce every presented result months later.

# State of the field

Transformers.js [@wolf-transformers] brought Hugging Face transformer models to JavaScript runtimes, and its WebAssembly/ONNX backend makes quantized (int8) inference viable in a browser tab. On top of it, accessible-AI research and products have mostly followed two paths: server-mediated assistive tools (which sacrifice privacy and offline use) or single-feature local tools. Browser-based accessibility extensions commonly address one dimension — automatic alt text, color adjustment, or reading aids — but do not combine local generation, screen reader feedback, and standards auditing in one auditable package.

For each capability, Clarifica.ai builds on established open models: DistilBART [@shleifer-rush-2020] for abstractive summarization; ViT [@dosovitskiy-2021] encoder with a GPT-2 decoder [@radford-gpt2] for image captioning; Whisper [@whisper] for multilingual speech recognition (used both for on-demand transcription and for continuous live captions through Chrome's tab capture with an offscreen document); TrOCR [@trocr] for printed-text OCR; opus-mt Marian models [@opusmt] [@marian] for English-to-Portuguese translation (target fixed by the `>>pt<<` multilingual convention); and a distilled SQuAD model [@distilbert] for extractive question answering. The WebVTT delivery of live captions and the `aria-live` feedback follow W3C specifications and WCAG 2.1 [@wcag21]. To the author's knowledge, no open-source browser extension combines this set of on-device capabilities with SHA-pinned model versioning and a screen reader-first testing methodology.

# Usage

After loading the `clarifica-ai/` folder as an unpacked extension (Chrome 116+; Firefox 115+ via the provided MV2 manifest), the popup exposes all features with keyboard navigation; global shortcuts are available for the most frequent actions (`Ctrl+Shift+L` Essential Reading, `Ctrl+Shift+R` Summarize, `Ctrl+Shift+A` Describe Images, `Ctrl+Shift+X` Reset). First use of each AI feature downloads the corresponding model (~865 MB in total for all six models); afterwards the extension works fully offline.

Representative workflows:

- **Ask the page** (`question-answering`): type a question in the popup; the answer is a substring of the page's main content (up to 4,000 characters of context).
- **Summarize / describe images in Portuguese**: select the output language in the popup; English model output is translated in the same Web Worker by the pinned opus-mt model (model-to-model chain, no new weights), with an optional Plain Portuguese mode (short sentences, direct word order) driven by generation parameters rather than text-rewriting rules.
- **Live captions**: press the captions toggle; the click gesture enables tab audio capture, a dedicated offscreen document feeds 7-second overlapping windows to Whisper, and captions are delivered as a native `<track kind="captions">` WebVTT stream with an overlay fallback.
- **WCAG audit panel**: opens a non-modal accessible dialog listing barriers across seven success criteria (1.1.1, 1.2.2, 1.3.1, 2.4.1, 2.4.4, 3.1.1, 4.1.2) with counts and fix hints, re-audited on page mutations (debounced `MutationObserver`).
- **Neurodivergent profiles and color filters**: three exclusive profiles (autism, ADHD, dyslexia) and three color-blindness filters with mathematical intensity interpolation; the active state is re-applied automatically on navigation and propagated to open tabs.

# Implementation and architecture

The extension is organized around an isolated **Web Worker** (`scripts/ai-worker.js`) that loads the vendored Transformers.js bundle with WASM binaries served from the extension package (no CDN since v1.1.0, satisfying Manifest V3 CSP without exceptions). The worker exposes a message protocol (`summarize`, `describe-image`, `transcribe-audio`, `ocr-image`, `translate-text`, `question-answering`) with error codes that are translated in the destination context, since injected functions have no access to `chrome.i18n`.

Shared, context-crossing logic lives in a pure module (`scripts/clarifica-puro.js`): audio resampling to 16 kHz mono, windowing plans for continuous transcription, WebVTT assembly, target-video selection, the 1.2.2 caption audit, the full WCAG audit, and generation parameters for Plain Portuguese. Functions that must run inside injected functions (which Chrome serializes without closure scope) exist as marked inline copies whose parity with the canonical source is proven by automated tests — the same discipline applied to the pt-BR/en message dictionaries.

Live captions follow the recommended MV3 pattern: the popup click provides the user gesture; the service worker ensures exactly one offscreen document and obtains the stream identifier via `chrome.tabCapture.getMediaStreamId` (with a 5-second safety ceiling and a popup fallback); the offscreen document acquires the tab `MediaStream`, feeds overlapping windows to Whisper, and returns partial transcripts that the service worker delivers to the page and broadcasts to the popup.

Profile/filter synchronization uses `chrome.storage.local` as the single source of truth: the service worker re-reads state and injects it on every completed navigation (`tabs.onUpdated`) and propagates it to up to 20 open http(s) tabs on demand; cleanup reuses the same reset routine as the global shortcut. Canonical copies of the filter and profile style logic in the service worker are kept identical to the popup's by source-level parity tests.

Quality is enforced by two CI gates (GitHub Actions): a Node suite (`node --test`, 199 tests, including real inference with all six pinned models) and an end-to-end suite (Playwright 1.57 loading the unpacked extension in real Chromium, 23 tests in the standard battery plus 2 opt-in real-AI-in-browser tests — 25 in total). Model revisions are pinned by commit SHA in a version registry (`VERSOES_MODELOS.md`) that is itself validated by a dedicated test, and the CI model cache key embeds the SHAs so that model upgrades invalidate the cache deliberately.

# Acknowledgements

The author thanks the UNIVESP faculty and the Projeto Integrador VI mentoring process, the open-source communities behind the pinned models (Hugging Face, Xenova, ONNX Runtime, Mozilla), and the NVDA community for decades of accessibility guidance that shaped this project's feedback patterns.

# References
