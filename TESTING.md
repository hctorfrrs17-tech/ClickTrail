# ClickTrail validation notes

The v0.2.0 unpacked extension was loaded manually in a clean Chromium profile on 19 August 2026. Chrome displayed the expected **ClickTrail 0.2.0** name and local-Ollama description after a developer-mode update.

| Check | Result |
| --- | --- |
| Manifest identity | Passed: Chrome displayed **ClickTrail 0.2.0**. |
| Local endpoint scope | Passed: the package requests only `http://127.0.0.1:11434/*` for Ollama. |
| Missing Ollama behaviour | Passed: recording did not begin and the popup instructed the user to install/start Ollama and run `ollama pull gemma3:1b`. |
| Local instruction model | Prepared: Ollama `0.32.14` and `gemma3:1b` were installed locally in the isolated test environment for the real action-to-PDF check. |
| Local analysis response | Passed: `gemma3:1b` returned a structured JSON title and note through the local Ollama chat endpoint. |
| Clean browser action | Recorded: a real click on the Example Domain heading was submitted from the isolated Chromium profile for local analysis. |
| Active-tab access | Passed: Chrome displayed ClickTrail with access limited to the active Example Domain test tab. |
| Real guide output | Passed: the local model created a guide step from an actual Example Domain click, and the editor displayed the captured screenshot with a pointer at the recorded coordinate. |
| Chrome-extension origin | Passed after enabling `OLLAMA_ORIGINS=chrome-extension://*`; the local Ollama endpoint accepted the extension origin and generated the live step. |
| PDF-only path | Passed: the editor opened the print-ready visual document with the pointer and provided no HTML or ZIP download option. |

> When testing an unpacked update in Chrome, use the extension card’s **Reload** control and then refresh the recorded tab. Updating the files alone does not replace a content script already injected into an open page.
| TypeScript and unit tests | Passed: `pnpm check` and five Vitest tests completed successfully. |

> A full action-to-PDF manual recording requires a running local Ollama instance with `gemma3:1b`. Ollama receives only the allowed action context; the visible pointer comes from the exact recorded click coordinate rather than an imprecise AI estimate. No remote or cloud model is used by ClickTrail.
