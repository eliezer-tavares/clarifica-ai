# ✨ Detailed features — Clarifica.ai

> Companion to [`README_EN.md`](../README_EN.md): the complete feature table, the practical gains for each user profile and the step-by-step usage guide. Documentation state: v2.0.0.

## What you can do

| # | Feature | What happens | How to trigger |
|---|---------|--------------|----------------|
| 1 | 📖 **Essential Reading Mode** | Silences navigation, footers, sidebars (`aside`), ads (`.ads`) and headers through `aria-hidden` + `inert`; moves focus to the main content (`main`/`article`). Ideal for NVDA and JAWS. | `Ctrl+Shift+L` or popup button |
| 2 | ✨ **Summarize text with AI** | Extracts the page's main text and generates a summary with the quantized DistilBART model (int8), executed in a dedicated Web Worker — the page never freezes. The result appears in the popup in a scrollable ARIA region. | `Ctrl+Shift+R` or popup button |
| 3 | 🖼️ **Describe images** | Finds all images without `alt` (or with empty/generic `alt` such as `"image"`) and generates descriptions with ViT-GPT2; applies `alt`, `aria-label` ("AI-generated description: …") and a green confirmation outline on each processed image. | `Ctrl+Shift+A` or popup button |
| 4 | 🔴🟢🔵 **Color blindness filters** | Applies chromatic correction matrices (SVG `feColorMatrix`) to the whole page, with one click and an **adjustable intensity (0–100%, mathematically interpolated)**, for **protanopia**, **deuteranopia** and **tritanopia** (covers WCAG 1.4.1 — Use of Color). | Buttons + control in the popup |
| 5 | ♻️ **Restore page** | Removes every applied effect: color filters, silenced regions and elements created by the extension. The page returns exactly to its original state. | `Ctrl+Shift+X` |
| 6 | 🔊 **Feedback for screen readers** | Every action injects a `role="status"` announcement with `aria-live="assertive"` and `aria-atomic="true"`, read immediately by the screen reader (WCAG 4.1.3 — Status Messages). | Automatic |
| 7 | 🖥️ **Accessible popup** | Live status bar (`aria-live="polite"`), nineteen native buttons navigable with `TAB`, question input, caption and AI-output language selectors, labeled intensity control, result area with `role="region"` and a "Close" button. | Click the extension icon |
| 8 | 🌗 **Light/dark theme + persisted settings** | The popup follows the system (automatic mode) or pins light/dark; theme, last filter, active profile and intensity are persisted via `chrome.storage` and restored on reopen (every color pair of both themes validated at AA). | "Theme" button in the popup |
| 9 | 🌐 **pt-BR/en interface** | The interface and screen reader announcements follow the browser language (Portuguese or English), with messages versioned in `_locales` and audited by a parity test. | Automatic |
| 10 | 🧩🎯🔤 **Neurodivergent Profiles (v1.2.0)** | Three ready-made, mutually exclusive profiles with no AI/network at all: **ASD** (pauses animations, transitions and smooth scrolling, converts animated GIFs into a static canvas frame and removes shadows/blur); **ADHD** (spotlight that darkens the page around the cursor and progressive reading-block navigation with `Alt+↓/↑`); **Dyslexia** (letter, word and line spacing, system reading font with monospace code preserved, and a reading ruler that follows the mouse). Click the active profile again to turn it off; `Ctrl+Shift+X` also undoes it. | Profile buttons in the popup |
| 11 | 🎙️ **Audio transcription (v1.3.0)** | Finds the first `<video>`/`<audio>` on the page with an http(s) source, decodes and resamples the audio to mono 16 kHz PCM (deterministic linear interpolation) and transcribes with **quantized Whisper-tiny** (multilingual, automatic language detection) in a dedicated Web Worker. The transcript appears in the popup and can be read aloud. CORS-protected media gets a clear message, without freezing. | `🎙️ Transcribe Page Audio` in the popup |
| 12 | 📄 **Image OCR (v1.3.0)** | Extracts the **printed text** from images without `alt` with the quantized TrOCR-small model and applies it as `alt`/`aria-label` (WCAG 1.4.5 — images of text become readable by screen readers), with a green confirmation outline and a completion announcement on the page. | `📄 OCR — Text in Images` in the popup |
| 13 | 🌍 **EN → PT translation (v1.3.0)** | Instantly translates the **selected passage** on the page with the quantized opus-mt model (destination pinned to Portuguese), showing the result in the popup and announcing completion via `aria-live`. Up to 1,500 characters per translation. | `🌍 Translate Selection (EN → PT)` in the popup (or a user-configurable shortcut in `chrome://extensions/shortcuts`) |
| 14 | 🔊 **Read aloud (v1.3.0)** | Reads the selected passage — or the page's main content — with the **system voices** (Web Speech API: no model, no download, offline). Toggle with `aria-pressed`: click again to stop; `Ctrl+Shift+X` also interrupts. Speech continues even with the popup closed, because it lives on the page itself. | `🔊 Read Aloud` in the popup |
| 15 | 💬 **Live CC captions (v1.4.0)** | **The flagship of v1.4.0**: captures the ACTIVE TAB's audio (`chrome.tabCapture` + an offscreen document — works with `blob:`/YouTube and media without CORS), transcribes continuous 7-second windows (with 1 s of overlap) using the **100% local Whisper-tiny** and delivers each partial transcript as a caption over the video: a `<track kind="captions">` with WebVTT (the native channel, respected by screen readers and by the player's CC control), with an **overlay fallback** when the page blocks the track (CSP). A discreet "Captions active — capturing audio" chip and a single screen reader announcement. No duration cap and no audio sent to servers. Toggle with `aria-pressed`; clean teardown via a second click and `Ctrl+Shift+X`. | `💬 Live Captions (CC)` in the popup |
| 16 | 🌍 **English captions — bilingualism (v1.4.0)** | A selector in the popup switches the Whisper task: **Original** (caption in the spoken language) or **English** (speech in any detected language becomes an English caption via `task: translate`). No new model — the multilingual whisper-tiny already pinned in the project. The tiny model's translation quality is approximate (declared limitation). | `Caption language` selector in the popup |
| 17 | 🔍 **WCAG 1.2.2 checker (v1.4.0)** | An injected read-only function (no AI, no network) inventories the page's `<video>` elements and counts how many have `<track kind="captions">` or `subtitles` — for example, "2 of 3 videos lack captions" — with a direct action: generate them right there with the live captions. A minimal version of the audit-and-act cycle (the full panel is item 20). | `🔍 Check captions (WCAG 1.2.2)` in the popup |
| 18 | ❓ **Page Q&A assistant (v2.0.0)** | You type a question and the EXTRACTIVE QA model (quantized distilbert-squad, ~70 MB) answers with a substring of the page's own text — no free-form generation, hallucination eliminated by construction. The context is the page's main content (4,000-character cap). | `❓ Ask the Page AI` + input in the popup |
| 19 | 🇧🇷 **Portuguese output + Plain Portuguese (v2.0.0)** | Summaries and image descriptions can come out in **Portuguese** through a model-to-model chain (English model output is translated in the same worker by the already-pinned opus-mt — zero new models). The **Plain Portuguese** option generates short sentences and direct word order, model-assisted (generation parameters, not text-rewriting rules). | `AI response language` selector + checkbox in the popup |
| 20 | 🧪 **Real-time WCAG audit panel (v2.0.0)** | An accessible panel (non-modal dialog, managed focus, closes with Esc) injected into the page that audits **7 WCAG criteria**: images without alt (1.1.1), videos without captions (1.2.2), heading hierarchy (1.3.1), iframes without title (2.4.1), generic links (2.4.4), html without lang (3.1.1) and controls without an accessible name (4.1.2) — with counts, fix hints and **automatic updates as the page changes** (pure state reading, no AI, no network). | `🧪 WCAG Audit Panel` in the popup |
| 21 | 🔄 **Profile/filter synchronization (v2.0.0)** | The color filter and the active profile are **re-applied automatically on every navigation** and propagated to open http(s) tabs (20-tab cap) — state lives in `chrome.storage` as the single source of truth. A user control lives in the popup; `Ctrl+Shift+X` clears all synchronized tabs. | `Apply automatically when navigating` checkbox in the popup |

## What you get in practice

- **Less noise:** dense pages (news portals, dashboards) stay focused on the relevant content.
- **Understandable images:** photos and charts without descriptions get AI-generated `alt` text.
- **Shorter texts:** long articles become summaries in seconds, without copying and pasting into external sites.
- **Corrected colors:** the three most common types of color blindness covered instantly.
- **A web without overload:** the ASD, ADHD and Dyslexia profiles reduce stimulation, keep focus and make reading easier — each in one click.
- **Understandable audio:** embedded videos and podcasts become locally transcribed text, readable by screen readers and re-read aloud.
- **Watchable videos:** CC captions generated on-device, synced over the video while it plays — including `blob:` sources (YouTube) that the one-shot transcription cannot reach.
- **English speakers served:** English interface, captions in the original language and speech translated to English — the content is now bilingual too.
- **Caption-less videos discovered:** the WCAG 1.2.2 checker points out videos without a captions track and offers to generate them right there.
- **Audited pages:** the real-time WCAG panel points out every barrier by criterion with a fix hint — while you browse.
- **Answers extracted from the page itself:** ask in natural language and get the exact passage from the content — without leaving the page, without hallucination.
- **Content in Portuguese:** summaries and image descriptions can come straight out in Portuguese (with a Plain Portuguese mode for easy reading).
- **Preferences that follow you:** the chosen filter and profile reappear on the pages you open — no re-configuring on every click.
- **Decipherable images with text:** screenshots and infographics with printed text gain a textual alternative via OCR.
- **No English barrier for Brazilians:** selected passages are translated into Portuguese on the spot, without leaving the page or sending anything to third parties.
- **Full privacy:** zero own servers, zero telemetry, zero cookies.

## How to use

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
10. **Page Q&A (v2.0.0):** type your question in the `Your question about this page` field and click `❓ Ask the Page AI` — the answer appears in "Result:" with the prefix "Answer (extracted from the page text):". On pages with little text, the assistant clearly says so.
11. **AI response language (v2.0.0):** the `AI response language` selector switches between **English (models' original)** and **Portuguese (automatic translation)** — it applies to summaries and image descriptions. Check **Plain Portuguese** to generate summaries with short sentences and direct word order. Choices are remembered.
12. **WCAG audit panel (v2.0.0):** click `🧪 WCAG Audit Panel (real-time)` to open the panel on the page — it lists every barrier by WCAG criterion with a count and a hint, and updates itself as the page changes. Close it with the panel button, a second popup click, or the `Esc` key.
13. **Synchronization (v2.0.0):** with the `Apply automatically when navigating and to open tabs` checkbox checked (default), the active filter and profile reappear on the pages you open and on already-open tabs. Unchecking stops synchronization (the current state remains on open pages).
14. **Check captions (v1.4.0):** `🔍 Check captions (WCAG 1.2.2)` inventories the page's videos and reports how many lack captions (for example, "2 of 3 videos lack captions") — with Live Captions one click away to generate them right there.
