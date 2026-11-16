# 🧠 Clarifica.ai

> Universal accessibility with local Artificial Intelligence: **questions and answers about the page**, summaries in **Portuguese**, image description, **live CC captions**, audio transcription, OCR, EN→PT translation, read aloud, Essential Reading Mode, color blindness filters, synchronized neurodivergent profiles (ASD, ADHD, Dyslexia) and a **real-time WCAG audit panel** — right in the browser, 100% offline.

**License:** Apache-2.0 · **Version:** 2.0.0 (final release) · **Manifest:** V3 (Chromium) + MV2 (Firefox) · **Browsers:** Chrome 116+, Edge, Brave and other Chromium browsers · Firefox 115+ (without live captions) · **AI:** Edge AI (local), no data leaves the device

![CI](https://github.com/eliezer-tavares/clarifica-ai/actions/workflows/ci.yml/badge.svg)

**Quick links:**

- **Repository:** <https://github.com/eliezer-tavares/clarifica-ai>
- **Releases:** <https://github.com/eliezer-tavares/clarifica-ai/releases>
- **Citation:** [`CITATION.cff`](CITATION.cff) — machine-readable metadata (Citation File Format 1.2.0), enabling the "Cite this repository" button and the Zenodo DOI
- **Technical paper:** [`paper.md`](paper.md) (English) and [`paper.pt-BR.md`](paper.pt-BR.md) (Portuguese), with the bibliography in [`paper.bib`](paper.bib) — basis for the PDF and DOI archiving on Zenodo
- **Tests:** consolidated report in [`clarifica-ai/tests/TEST_REPORT_EN.md`](clarifica-ai/tests/TEST_REPORT_EN.md) (English) and [`clarifica-ai/tests/TEST_REPORT.md`](clarifica-ai/tests/TEST_REPORT.md) (pt-BR)
- **Contributing and security:** [`CONTRIBUTING_EN.md`](CONTRIBUTING_EN.md) (environment, conventions and PR process) · [`SECURITY_EN.md`](SECURITY_EN.md) (private channel for vulnerabilities) · [`CODE_OF_CONDUCT_EN.md`](CODE_OF_CONDUCT_EN.md) (community code of conduct)
- **ORCID:** [0009-0007-2577-8635](https://orcid.org/0009-0007-2577-8635)
- **Detailed documentation:** [features and usage](docs/FEATURES.md) · [architecture and engineering notes](docs/ARCHITECTURE.md) · [limitations and complementary tools](docs/LIMITATIONS.md) · [test suite](docs/TESTING.md) · [versions and history](VERSIONS.md) · [model registry](clarifica-ai/VERSOES_MODELOS.md) · [Firefox](docs/FIREFOX.md) · [Chrome Web Store](docs/CHROME_WEB_STORE.md) · [privacy policy](docs/PRIVACY_POLICY.md)

---

## 📖 About the project

Clarifica.ai is a browser extension that turns any web page into a clearer, more understandable and more inclusive experience. All the intelligence runs on the user's own device (Edge AI): the language and vision models are downloaded once, stored in the browser cache and executed locally, guaranteeing full privacy — no text, image or browsing data ever leaves the user's computer. The extension was designed for people who use screen readers (NVDA, JAWS), people with color blindness and anyone who needs less visual and cognitive noise on the web. Every action produces immediate feedback through `aria-live` regions, in compliance with the WCAG 2.1 guidelines and with the Brazilian Inclusion Law (Law No. 13,146/2015). v1.4.0 extends the product to deaf users and to English speakers: **live CC captions generated on-device** over the page's videos and **bilingual content delivery** (original language or English).

## ✨ Features

- 📖 **Essential Reading Mode** — silences navigation, footers and ads and moves focus to the main content (`Ctrl+Shift+L`).
- ✨ **AI summarization** — quantized DistilBART in a dedicated Web Worker (`Ctrl+Shift+R`).
- 🖼️ **Image description** — ViT-GPT2 generates `alt`/`aria-label` for undescribed images (`Ctrl+Shift+A`).
- ❓ **Page Q&A (extractive QA)** — the answer is always a passage of the page's own text: hallucination eliminated by construction (distilbert-squad).
- 🇧🇷 **Portuguese output + Plain Portuguese** — model-to-model chain in the same worker; short sentences and direct word order via generation parameters.
- 💬 **Live CC captions** — tab audio capture + local Whisper in continuous 7 s windows; WebVTT `<track>` with an overlay fallback; no duration cap.
- 🌍 **Caption bilingualism** — original language or English (Whisper's `task: translate` — zero new models).
- 🎙️ **Audio transcription** — the page's first video/audio with Whisper-tiny (16 kHz resampling; 120 s cap).
- 📄 **Image OCR** — TrOCR-small applies printed text as `alt`/`aria-label` (WCAG 1.4.5).
- 🌍 **EN→PT passage translation** — opus-mt with the destination pinned by `>>pt<<` (up to 1,500 characters).
- 🔊 **Read aloud** — Web Speech API with the system voices (no model, no download).
- 🔴🟢🔵 **Color blindness filters** — protanopia, deuteranopia and tritanopia with intensity interpolated from 0 to 100% (WCAG 1.4.1).
- 🧩 **Neurodivergent profiles** — ASD (less stimulation), ADHD (spotlight and reading blocks) and Dyslexia (spacing and ruler), exclusive, persisted and synchronized across tabs.
- 🧪 **Real-time WCAG audit panel** — 7 criteria with counts and fix hints; accessible dialog that closes with `Esc` and updates with the page.
- 🔍 **WCAG 1.2.2 checker** — inventories caption-less videos and generates the captions right there.
- 🔄 **Synchronization** — filter and profile re-applied on every navigation and propagated to already-open tabs (20-tab cap).
- ♻️ **Restore page** — `Ctrl+Shift+X` turns everything off and returns the page to its original state.

What exactly happens in each feature, how to trigger it from the popup and what you get in practice: [`docs/FEATURES.md`](docs/FEATURES.md).

## ⚙️ Requirements

- A Chromium-based browser, version **116 or higher** (Chrome, Edge, Brave, Opera) — v1.4.0 raised the minimum from 102 to 116 because `chrome.tabCapture.getMediaStreamId` in the service worker requires Chrome 116+ (the offscreen document exists since 109). **Firefox 115+** is supported via Manifest V2 (`manifest.firefox.json`) with every feature except live captions (tab capture does not exist on Firefox — declared limitation).
- About **865 MB** of free disk space for the AI models, downloaded once on the first use of each feature (~300 MB for summarization, ~250 MB for vision, ~115 MB for translation, ~70 MB for Q&A, ~60 MB for OCR, ~45 MB for transcription/captions — read aloud uses the system voices and downloads nothing). **v2.0.0 adds only the QA model (~70 MB)**: Portuguese output adds NO model (model-to-model chain with the already-pinned opus-mt).
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

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+L` | Essential Reading Mode |
| `Ctrl+Shift+R` | Summarize page with AI |
| `Ctrl+Shift+A` | Describe images |
| `Ctrl+Shift+X` | Restore original page |

**From the popup:** click the Clarifica.ai icon, navigate with `TAB` to the desired button and press `ENTER`. The status bar reports each step ("Processing...", "Done!", errors and warnings) and results appear in the "Result:" box. The ASD, ADHD and Dyslexia profiles are popup buttons (clicking again turns them off); live captions, Q&A and the WCAG panel also start from the popup.

The step-by-step guide for each feature, with the expected screen reader feedback: [`docs/FEATURES.md`](docs/FEATURES.md).

## 🧪 Tests

**224 tests: 199 unit** (Node, native runner, including real AI inference with the 6 pinned models) **and 25 E2E** (23 in the standard suite + 2 real-AI opt-ins) with the extension actually loaded in Chromium by Playwright.

```bash
cd clarifica-ai/tests
npm install
npm test            # full unit suite (includes real AI inference)
npm run test:e2e    # extension on a real Chromium via Playwright
```

> **Prerequisites:** the E2E tests require the Playwright browser (`npx playwright install chromium`, once); the first run downloads the model weights (~865 MB); machines with less than ~6 GB of RAM: `npm test -- --test-concurrency=1`; real AI inside the browser (opt-in): `CLARIFICA_E2E_IA=1 npm run test:e2e`.

- **Consolidated reports of the latest run:** [`clarifica-ai/tests/TEST_REPORT_EN.md`](clarifica-ai/tests/TEST_REPORT_EN.md) (English) · [`clarifica-ai/tests/TEST_REPORT.md`](clarifica-ai/tests/TEST_REPORT.md) (pt-BR)
- **What each suite file covers:** [`docs/TESTING.md`](docs/TESTING.md) (English) · [`docs/TESTES.md`](docs/TESTES.md) (pt-BR)
- **CI:** two independent gates on every push and pull request — the unit suite with real AI (Node 24, weights cached by SHA) and E2E on a real Chromium; runs are public on the [**Actions**](https://github.com/eliezer-tavares/clarifica-ai/actions) tab. Any regression breaks the build **before** reaching the user.

## 🔄 Model versioning

The AI library and each model have a version **pinned by commit (SHA)** on Hugging Face — nothing floats. The complete registry, the step-by-step upgrade procedure, acceptance criteria and the rollback policy are in [`clarifica-ai/VERSOES_MODELOS.md`](clarifica-ai/VERSOES_MODELOS.md). An automated test (`versoes-modelos.test.js`) confronts the registry with the code and breaks the CI on any divergence: model changes are always deliberate, tested with real inference and documented.

## 🗺️ Versions

| Version | Focus | Delivered |
|---------|-------|-----------|
| **v1.0.0** | Initial release | ✅ 2026-11-06 |
| **v1.1.0** | Stability and configuration | ✅ 2026-11-07 |
| **v1.2.0** | Neurodivergent profiles | ✅ 2026-11-08 |
| **v1.3.0** | Audio and multimodal | ✅ 2026-11-09 |
| **v1.4.0** | Live captions, bilingualism and audiovisual accessibility | ✅ 2026-11-10 |
| **v2.0.0** | Final release — local QA, Portuguese output, WCAG panel, synchronization, Firefox | ✅ 2026-11-12 |

What was planned and delivered in each version, in detail: [`VERSIONS.md`](VERSIONS.md).

Each step keeps the project's principles: local AI execution, privacy by default (Privacy by Design) and accessibility as a requirement, not an accessory.

## ⚠️ Limitations and complementary tools

The most relevant limitations: Q&A works best on **English** pages (the model was trained on English); live captions are **near real-time** (typical 5–15 s delay) and **DRM** platforms produce silence in the capture; **Firefox** has no live captions (platform APIs are missing); the OCR reads only **printed text**. The complete, honest list of limitations and the recommended complementary tools (VLibras, NVDA, JAWS): [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md).

## 🤝 Contributing and reporting issues

Found a bug, an accessibility barrier or have a suggestion? Open an [issue](https://github.com/eliezer-tavares/clarifica-ai/issues) describing the visited page, the feature used (shortcut or popup button), the screen reader/browser and the observed versus expected behavior.

Pull requests are welcome: the development environment, conventions and the full process are in [`CONTRIBUTING_EN.md`](CONTRIBUTING_EN.md) — which also documents contribution licensing under Section 5 of Apache-2.0 (this project does not use a CLA; there is nothing to sign). Before submitting, keep the suite green (`npm test` and `npm run test:e2e` inside `tests/`) and preserve the project's principles: 100% local AI, privacy by default and accessibility as a requirement, not an accessory. **Security vulnerabilities must not be opened as public issues:** use the private channel described in [`SECURITY_EN.md`](SECURITY_EN.md).

Community interactions — issues, pull requests and the project's official spaces — follow the [`CODE_OF_CONDUCT_EN.md`](CODE_OF_CONDUCT_EN.md).

## 👤 Authorship and academic context

**Architected by** Eliezer Tavares de Oliveira
✉️ contact@eliezertavaresdeoliveira.com
GitHub: [github.com/eliezer-tavares](https://github.com/eliezer-tavares)
ORCID: [0009-0007-2577-8635](https://orcid.org/0009-0007-2577-8635)

Eliezer Tavares de Oliveira is blind and a screen reader user — lived experience that grounds every accessibility decision of this project, from `aria-live` feedback to keyboard shortcuts designed for NVDA and JAWS. He is a student in the **Computer Engineering** program at **UNIVESP (Universidade Virtual do Estado de São Paulo)**, and this application was architected as the deliverable of the **Projeto Integrador VI** course.

**Academic layer (v2.0.0):** the repository includes [`paper.md`](paper.md) (a short technical paper with bibliography in `paper.bib`) and its identical Portuguese version ([`paper.pt-BR.md`](paper.pt-BR.md)), plus [`CITATION.cff`](CITATION.cff) (Citation File Format 1.2.0) for machine-readable citation and immediate DOI generation via the GitHub–Zenodo integration when the release is published.

## 📄 License

This project is distributed under the **Apache 2.0 License**. See the [`LICENSE`](LICENSE) file for the full English text, including terms of use, reproduction and distribution.
