# Install ClickTrail in Chrome or Edge 🧩

ClickTrail is a local Chrome extension. It needs an unpacked folder in Chrome **and** a local Ollama service; it never sends a guide to a hosted server.

## 1. Install the extension

1. Download `clicktrail-chrome-extension-v0.2.0.zip` from **Releases**.
2. Extract the ZIP to a permanent folder. Do not select the ZIP itself.
3. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select the extracted folder that directly contains `manifest.json`.
7. Pin the **ClickTrail** icon from the extensions menu.

## 2. Install local Ollama

Install Ollama from [ollama.com](https://ollama.com), then download the required local model:

```bash
ollama pull gemma3:1b
```

Allow Chrome-extension origins when starting the local Ollama service:

```text
OLLAMA_ORIGINS=chrome-extension://*
```

On Linux with systemd, add that variable under `[Service]` in `sudo systemctl edit ollama`, then reload and restart the service. ClickTrail will show an actionable message if Ollama is unavailable, the origin setting is missing, or the model has not yet been downloaded.

## If Chrome shows an error

| Message or problem | What to check |
| --- | --- |
| “Manifest file is missing or unreadable” | You selected the ZIP or a parent folder. Select the extracted folder containing `manifest.json`. |
| ClickTrail asks for access to the page | Select ClickTrail from the puzzle menu. This grants temporary access only to the active tab. |
| Ollama local is required | Start Ollama and run `ollama pull gemma3:1b`. |
| Ollama cannot analyse an action | Confirm `OLLAMA_ORIGINS=chrome-extension://*` is set for the Ollama service, then restart it. |
| Recording does not start | Open a normal `http://` or `https://` website. Internal, sign-in, payment, and other sensitive pages are intentionally blocked. |
| A step has no screenshot | Some protected pages prevent screenshots. Remove the step or use a normal website instead. |

## Updating ClickTrail

Download the new ZIP, extract it to a new permanent folder, select **Reload** on the ClickTrail card in `chrome://extensions`, and refresh any already-open page before recording again.
