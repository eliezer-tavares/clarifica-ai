# 🗺️ Clarifica.ai versions and history

> Detailed record of what was planned and delivered in each project version. Principles constant across all steps: local AI execution, privacy by default (Privacy by Design) and accessibility as a requirement, not an accessory. The technical registry of the AI library and model versions (pinned by SHA, with an upgrade/rollback procedure) is in [`clarifica-ai/VERSOES_MODELOS.md`](clarifica-ai/VERSOES_MODELOS.md) (in Portuguese). Portuguese mirror: [`VERSOES.md`](VERSOES.md).

## v1.0.0 — Initial release (✅ delivered on 2026-11-06)

The first functional version of the extension: **Essential Reading Mode** (silences page noise and moves focus to the main content), **AI summarization** (quantized DistilBART), **image description** (ViT-GPT2 applying `alt`/`aria-label`), **color blindness filters** (protanopia, deuteranopia and tritanopia), **page restoration**, **screen reader feedback** via `aria-live` announcements and an **accessible popup** fully navigable by keyboard — all already 100% local (Edge AI) under Manifest V3.

## v1.1.0 — Stability and configuration (✅ delivered on 2026-11-07)

Local packaging of Transformers.js in `vendor/` (CDN eliminated, MV3 compliant); persisted settings with `chrome.storage` (theme, last filter, intensity); color filter intensity fine-tuning (0–100%); light/dark popup theme (AA in both); pt-BR/en internationalization with its own message engine; consolidated report in TEST_REPORT revision 5.

## v1.2.0 — Neurodivergent profiles (✅ delivered on 2026-11-08)

**ASD profile** (pauses animations, transitions and smooth scrolling; animated GIFs converted to static canvas frames; shadow and blur removal); **ADHD profile** (focus mode with a spotlight around the cursor; progressive reading blocks with `Alt+↓/↑`); **Dyslexia profile** (letter, word and line spacing; system reading font with monospace code preserved; reading ruler following the mouse); exclusive, toggleable, persisted profiles integrated with `Ctrl+Shift+X`; consolidated report in TEST_REPORT revision 6.

## v1.3.0 — Audio and multimodal (✅ delivered on 2026-11-09)

**Local audio transcription** (quantized Whisper-tiny, multilingual, with deterministic 16 kHz resampling on the page, for videos and podcasts); **OCR** on images without alt (quantized TrOCR-small, text applied as `alt`/`aria-label` — WCAG 1.4.5); **read aloud** with local TTS (Web Speech API — system voices, no model and no download, toggle with `aria-pressed`, integrated with `Ctrl+Shift+X`); **instant passage translation** EN→PT (quantized opus-mt-en-ROMANCE, destination pinned by `>>pt<<`, configurable command without a suggested shortcut); version registry rises to 3 (5 models pinned by SHA + the TTS decision) and the CI cache key changes in lockstep; consolidated report in TEST_REPORT revision 8.

## v1.4.0 — Live captions, bilingualism and audiovisual accessibility (✅ delivered on 2026-11-10)

**Live CC captions over the video** (flagship): tab audio capture (`chrome.tabCapture` + offscreen document — closes all three gaps of the one-shot transcription: `blob:`/CORS, sync and the 120 s cap), Whisper in continuous 7 s windows with 1 s of overlap, `<track kind="captions">` with WebVTT and the overlay fallback, state chip and a single announcement, clean teardown via toggle/`Ctrl+Shift+X`/navigation; **content bilingualism** (original × English selector via Whisper's `task: translate` — zero new models); **minimal WCAG 1.2.2 checker** (audit and act); **shared pure logic** in `scripts/clarifica-puro.js` with test-guaranteed parity; **complementary resources documented** (VLibras, NVDA, JAWS); **README_EN.md** created in lockstep; suite 120 → 154 tests, expanded E2E, consolidated report in TEST_REPORT revision 9.

## v2.0.0 — Final release (✅ delivered on 2026-11-12)

**Page Q&A assistant (local QA)** — extractive distilbert-squad pinned by SHA (registry rises to v4), the answer is always contained in the page text (hallucination eliminated by construction); **Portuguese output** for summaries and image descriptions via the model-to-model chain (already-pinned opus-mt — zero new models) with **model-assisted Plain Portuguese** (short sentences and direct word order via generation parameters); **real-time page accessibility audit panel** (WCAG report, 7 criteria, accessible dialog with Esc); **profile synchronization** (state re-applied on every navigation and propagated to open tabs, with canonical parity-tested copies and cleanup through the same reset-all); **Chrome Web Store preparation** (publishing guide + privacy policy in `docs/`, zip ready for upload); **Firefox support** (MV2 mirror manifest, Firefox 115+, live captions honestly declared unavailable); **academic layer** (`paper.md` as the technical paper + `CITATION.cff` for DOI archiving on Zenodo, at the root); suite 154 → 199 tests, E2E 20 → 25 (23 in the standard suite + 2 real-AI opt-ins), consolidated report in TEST_REPORT revision 10.

## After v2.0.0 — next steps

- **Chrome Web Store publication** — the step-by-step guide is ready in [`docs/CHROME_WEB_STORE.md`](docs/CHROME_WEB_STORE.md), with the store-required privacy policy in [`docs/PRIVACY_POLICY.md`](docs/PRIVACY_POLICY.md).
- **Firefox Add-ons (AMO) listing** — packaging and platform particulars documented in [`docs/FIREFOX.md`](docs/FIREFOX.md).
- **Concise documentation** — slim READMEs linking to the detailed documentation in `docs/` (this restructuring).

The consolidated reports of every test battery (revisions 1 to 15) are in [`clarifica-ai/tests/TEST_REPORT.md`](clarifica-ai/tests/TEST_REPORT.md) and its English mirror [`clarifica-ai/tests/TEST_REPORT_EN.md`](clarifica-ai/tests/TEST_REPORT_EN.md).
