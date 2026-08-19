## ClickTrail v0.2.1 — automatic privacy pixelation

ClickTrail requires **Ollama running locally** to turn safe recorded actions into clear guide instructions. Every PDF step includes a permanent pointer at the exact recorded click coordinate, while redactions are baked into a new image before the document opens.

### What changed

| Area | v0.2.1 update |
| --- | --- |
| Local AI | Requires Ollama at `127.0.0.1` with `gemma3:1b`; no remote AI API exists. |
| Privacy | Screenshots stay in Chrome storage. Only permitted action context is sent to the local model. |
| Visual quality | Each step includes an exact click arrow and marker. |
| Export | PDF only; raw HTML and ZIP export paths were removed. |
| Privacy masks | Detected visible personal emails, phone numbers, token-like values, and sensitive field regions are pixelated directly into the PDF image. |
| Safety | Password, payment, OTP, token, email, phone, and personal field values remain excluded from recording and Ollama. |

### Before recording

1. Install Ollama and run `ollama pull gemma3:1b`.
2. Start Ollama with `OLLAMA_ORIGINS=chrome-extension://*` configured for Chrome extension access.
3. Extract the ZIP, open `chrome://extensions`, enable **Developer mode**, and select **Load unpacked** on the folder containing `manifest.json`.

> Chrome cannot load the ZIP directly; extract it first. ClickTrail works entirely on the computer where Ollama runs.
