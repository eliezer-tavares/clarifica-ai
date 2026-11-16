# Contributing to Clarifica.ai

> Em português: [`CONTRIBUTING.md`](CONTRIBUTING.md)

Thank you for considering contributing! This document covers the development environment, the project's conventions and the pull request process.

## Non-negotiable principles

Every contribution must preserve:

1. **100% local AI** — no text, image or browsing data ever leaves the device; zero CDN, zero network calls at runtime.
2. **Privacy by default** — no collection, no telemetry; the [`privacy policy`](docs/PRIVACY_POLICY.md) is the reference.
3. **Accessibility as a requirement** — `aria-live` feedback, full keyboard operation, WCAG 2.1 compliance; interface changes are validated with axe-core.
4. **Output language** — text-generating features respect the language selected in the popup (Portuguese or English) and the Plain Portuguese mode.

## Development environment

Requirements: **Node.js 24** and Git. In a terminal, one command at a time:

```bash
git clone https://github.com/eliezer-tavares/clarifica-ai.git
cd clarifica-ai/tests
npm ci
npm test            # 199 unit tests (includes real AI inference)
npm run test:e2e    # 25 E2E tests: 23 in the standard suite + 2 real-AI opt-ins
```

Important notes:

- The E2E tests require the Playwright browser: `npx playwright install chromium` (once).
- The first suite run downloads the weights of the 6 AI models (~865 MB, pinned by commit SHA).
- Machines with less than ~6 GB of RAM: `npm test -- --test-concurrency=1`.
- Real AI inside the browser (opt-in): `CLARIFICA_E2E_IA=1 npm run test:e2e`.
- Windows: if `npm run` cannot find the executables, check `npm config get bin-links` — it must answer `true`; the full diagnosis is in revision 15 of [`TEST_REPORT_EN.md`](clarifica-ai/tests/TEST_REPORT_EN.md).

## Repository structure

- `clarifica-ai/` — the extension (manifest, service worker, content scripts, popup, AI workers).
- `clarifica-ai/tests/` — the full suite (199 unit + 25 E2E) and the consolidated reports.
- `docs/` — detailed documentation (features, architecture, limitations, publishing guides, privacy policy).
- Root — READMEs, papers (`paper.md`, `paper.pt-BR.md`), `CITATION.cff` and the version history (`VERSIONS.md` / `VERSOES.md`).

## Conventions

- **AI models:** any model change goes through the [SHA-pinned registry](clarifica-ai/VERSOES_MODELOS.md) (currently v4) and is confronted by the automated test `versoes-modelos.test.js`, which breaks the CI on any divergence. Project pattern: **new models = new inference file** (memory decision documented in the TEST_REPORT).
- **Commits:** message in English, no accents or emojis, short first line summarizing the change.
- **Document language:** documents live in mirrored pt-BR/English pairs (`README.md`/`README_EN.md`, `docs/FUNCIONALIDADES.md`/`docs/FEATURES.md` and so on); when creating or changing a document, update both sides.
- **Test counts:** the numbers quoted in documents must match the real suite; the [`TEST_REPORT_EN.md`](clarifica-ai/tests/TEST_REPORT_EN.md) and [`TEST_REPORT.md`](clarifica-ai/tests/TEST_REPORT.md) reports are the source of truth.

## Pull request process

1. Open an issue first (except trivial fixes) describing the problem and the proposed approach.
2. Create a branch from `main` with a descriptive name.
3. Make the changes keeping the suite green: `npm test` and `npm run test:e2e` inside `clarifica-ai/tests/`.
4. Submit the pull request describing **what** changed, **why** and how it was validated, referencing the issue (`Fixes #N`).

Small, focused pull requests are reviewed faster than broad ones.

## Contribution licensing (no CLA)

This project **does not use a CLA** (Contributor License Agreement). Section 5 of the Apache-2.0 license already establishes contribution licensing explicitly:

> "Unless You explicitly state otherwise, any Contribution intentionally submitted for inclusion in the Work by You to the Licensor shall be under the terms and conditions of this License, without any additional terms or conditions."

In other words: by opening a pull request, your contribution is licensed under Apache-2.0, per the [`LICENSE`](LICENSE) file. There is nothing to sign.

## Reporting bugs and vulnerabilities

- **Bugs and accessibility barriers:** open an [issue](https://github.com/eliezer-tavares/clarifica-ai/issues) with the visited page, the feature used (shortcut or popup button), the screen reader/browser and the observed versus expected behavior.
- **Security vulnerabilities:** NEVER as a public issue — use the private channel described in [`SECURITY_EN.md`](SECURITY_EN.md).
