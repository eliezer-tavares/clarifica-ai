# Security Policy — Clarifica.ai

> Em português: [`SECURITY.md`](SECURITY.md)

Security and privacy are the core of the project: all AI runs locally on the user's device, with no data transmission, no CDN and no external dependency at runtime.

## Supported versions

| Version | Supported |
|---------|-----------|
| 2.0.x | ✅ Yes |
| 1.x | ❌ No — upgrade to 2.0.0 |

## How to report a vulnerability

**Do not open a public issue.** Vulnerabilities must be reported through one of the private channels below:

1. **GitHub — private report (recommended):** the repository's **Security** tab → **Report a vulnerability**. The report is visible only to the maintainers until the fix is published.
2. **E-mail:** contact@eliezertavaresdeoliveira.com — subject line starting with `[security] clarifica-ai` followed by the description.

When possible, include: browser and operating system version, steps to reproduce, observed versus expected behavior and, if available, a proof of concept.

### Response commitment

- Acknowledgment of receipt within **5 business days**.
- Impact assessment and fix estimate communicated through the same reporting channel.
- **Coordinated disclosure:** the flaw is only published after being fixed (or with the reporter's agreement).

## Scope

**In scope:** the extension code (service worker, content scripts, popup, AI workers), the permissions declared in the manifests (MV3 and MV2), the vendor files bundled in the package (Transformers.js) and the data flow between these parts.

**Out of scope (report to the party responsible):** vulnerabilities in third-party AI libraries (Transformers.js, ONNX Runtime and the Hugging Face models — report upstream); vulnerabilities in the test suite's devDependencies, which are never packaged in the extension (the 5 known high-severity ones are accepted and documented in revision 15 of [`TEST_REPORT_EN.md`](clarifica-ai/tests/TEST_REPORT_EN.md)); the behavior of the sites visited; flaws that require physical access to the user's computer.

## Threat model in one line

There is no server, telemetry or network request at runtime: the models are downloaded once from Hugging Face on the first use of each feature, pinned by commit SHA in the [model registry](clarifica-ai/VERSOES_MODELOS.md), and all inference happens on the device. The full privacy policy is in [`docs/PRIVACY_POLICY.md`](docs/PRIVACY_POLICY.md).
