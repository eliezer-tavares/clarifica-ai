# ⚠️ Known limitations and complementary resources — Clarifica.ai

> Companion to [`README_EN.md`](../README_EN.md): the complete, honest list of the product's declared limitations and the recommended complementary tools. Documentation state: v2.0.0.

## Known limitations

- The **question answering** model is distilbert-squad (trained on English): pages in **English** get the best answers; on Portuguese pages the extracted passages are less reliable (a model limitation, declared in the interface and in the release notes).
- **Plain Portuguese** is model-assisted (generation with simplicity parameters + neural translation) and **does not replace human review**.
- The **summarization and image description models generate English text**; with the selector set to "Portuguese", the model-to-model translation is automatic and approximate (the OCR reproduces the text in the image).
- The one-shot transcription processes the **first** `<video>`/`<audio>` on the page with an http(s) source and up to **120 seconds** of audio — CORS-protected media (e.g., streaming platforms) gets a clear message and is not transcribed.
- **Live captions:** they are **near real-time** (typical 5–15 s delay); seeking in the video can desync the track — the chip/overlay keep showing the current speech; the **English translation quality** of the tiny model is approximate; **DRM platforms** (Netflix, Prime Video) produce silence in the capture — a limitation of Chrome itself; in some configurations capture may affect the tab's audio.
- **Firefox:** every feature works, **except live captions** — tab capture (`chrome.tabCapture`) and the offscreen document do not exist on Firefox; the corresponding controls are hidden with a clear message (see [`FIREFOX.md`](FIREFOX.md)).
- The **WCAG audit panel** is STATIC detection (DOM state reading): it covers 7 objective criteria and does not replace screen reader testing nor a complete human evaluation (WCAG has ~87 success criteria).
- The OCR reads **printed text** (not handwriting) and works best on images with few lines; whole pages are not converted — only images without `alt`.
- Read aloud depends on the **voices installed on the system**; without a compatible voice, the browser uses the default voice.
- Restricted pages (`chrome://`, Chrome Web Store) do not allow script injection — a browser security behavior.
- Texts under 200 characters are not summarized and pages under 50 characters receive no questions (protection against context-free results).
- The first use of each AI feature downloads the corresponding model and requires a connection; afterwards it is offline.
- **Synchronization** applies the filter and profile (full style layer + essential elements and listeners); dynamic pages that rebuild their body after loading may need one click to re-apply — the state stays saved.

## Recommended complementary tools

Clarifica.ai is a local accessibility layer; for needs beyond the product's scope, these mature tools complement it well (zero code integration — documented recommendation):

- **VLibras** — Brazilian government suite translating content into **Libras** (from Portuguese); distributed as its own extension, which Manifest V3 cannot have another extension trigger in a supported way. Detection and install suggestion did not make it into v2.0.0; they may be re-evaluated in a future version if demand is registered.
- **NVDA** — free Windows screen reader; the extension's `aria-live` announcements were designed and tested for its flow.
- **JAWS** — commercial screen reader widely used in Brazil; Essential Reading Mode and the keyboard shortcuts follow the patterns it and NVDA navigate best.
