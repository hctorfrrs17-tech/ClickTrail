# Clicktrail ⚡

> **Record a browser workflow. Export a visual guide. Keep every screenshot on your device.**

![Real Clicktrail guide-creation demonstration](assets/clicktrail-demo.gif)

Clicktrail is an **open-source, local-first Chrome extension** for turning browser clicks into client-ready visual guides. It captures steps while you work, lets you rename, reorder, redact, and export them, then creates a guide you can share without a hosted account or server.

| ⚡ Capture | ✍️ Refine | 🔒 Protect | 📤 Deliver |
| --- | --- | --- | --- |
| Record clicks in the active browser tab. | Edit every step and add useful notes. | Cover sensitive areas before exporting. | Export interactive HTML, a print-ready guide, or a ZIP package. |

## ✨ Why Clicktrail?

Most workflow-documentation tools put your screenshots in a workspace or cloud account. Clicktrail starts from a different principle:

> **Your guide stays on your device until you decide to export it.**

There is no Clicktrail account, remote database, telemetry dashboard, or hosted workspace. A guide lives in your Chrome local storage and can be deleted with one click.

## 🧭 Install from the ZIP 

Clicktrail is distributed as a normal folder inside a ZIP archive. Chrome **cannot load the ZIP file itself**: first extract it, then load the extracted folder.

| Step | What to do |
| --- | --- |
| **1. Download** | Download `clicktrail-chrome-extension-v0.1.1.zip` from this repository’s **Releases** page. |
| **2. Extract** | Unzip it to a folder that you will not move or delete, such as `Documents/Clicktrail`. |
| **3. Open Extensions** | In Chrome or Edge, type `chrome://extensions` in the address bar. |
| **4. Enable Developer mode** | Turn on the **Developer mode** switch in the top-right corner. |
| **5. Load the folder** | Click **Load unpacked** and choose the extracted `clicktrail` folder — the one that contains `manifest.json`. |
| **6. Pin Clicktrail** | Use the extensions puzzle icon in Chrome, then pin Clicktrail to your toolbar. |

> **Tip:** “Developer mode” is a Chrome setting on the Extensions page. It does **not** mean that you need to open a terminal or write code.

## 🎬 Use Clicktrail

1. Open any regular website in Chrome or Edge.
2. Click the **Clicktrail** toolbar icon and select the blue record button.
3. Complete your workflow. Every click is recorded as a private guide step.
4. Choose **Stop and review**, then open the guide editor.
5. Rename a step, add a note, move steps, or select **Redact sensitive area** before you export.
6. Export a single interactive HTML file, print to PDF, or download a ZIP containing the guide and its source data.

### ✅ Manual end-to-end check — v0.1.1

The animation above is a **real capture from a clean Chromium profile**, not a mock-up. Clicktrail was installed by extracting the release ZIP, enabling Developer mode at `chrome://extensions`, and choosing **Load unpacked** on the folder containing `manifest.json`. The recording then captured a click on `example.com`, stopped automatically when the tab moved to the different `iana.org` origin, opened the saved guide in the editor, and exported a self-contained HTML guide.

The exported HTML was inspected after the manual run: it contained the captured PNG and the expected guide structure, with no executable `<script>` tags and no `javascript:` or `file:` URLs. The recorded GIF deliberately focuses on the product flow after installation; full written installation instructions remain below.

## 🔐 Privacy by design

| Clicktrail does | Clicktrail does not do |
| --- | --- |
| Stores the active guide, screenshots, and redactions in Chrome local storage. | Create an account, send screenshots to a server, or use analytics. |
| Lets you redact a selected area before any export. | Capture Chrome internal pages such as `chrome://extensions`. |
| Keeps an export entirely on your computer until you choose to share it. | Offer multi-user cloud collaboration in the first version. |

Clicktrail uses Chrome’s temporary active-tab permission and injects the recorder only after you choose **Record guide**. It does not request broad, always-on access to every website.

### 🛡️ Safety guardrails

Clicktrail refuses to start on browser-internal pages and common sign-in, password, payment, checkout, banking, verification, and wallet surfaces. It also stops a capture if a password, card, one-time-code, secret, or token input is present. The recorder keeps only structural element labels such as an accessible label, control name, or element ID; it does not copy page text into a step title.

For this first release, a recording is limited to the **origin on which it started**. If you navigate the active tab to a different website, Clicktrail stops the recording and clears its REC badge. This prevents a workflow from silently continuing onto an unrelated domain.

Before every HTML, print, or ZIP export, Clicktrail writes redactions directly into a new image. The original, unredacted screenshot is **not** included in any exported file. Exports also discard unsafe URLs and do not contain executable scripts.



## ⚠️ Current limitations

Clicktrail is intentionally a first local-first release. It works in Chrome and Chromium-based browsers such as Edge. It does not record browser-internal pages, cross-device workflows, native desktop applications, or video. “PDF export” uses the browser print dialog, where you choose **Save as PDF**.

## 🤝 Contributing

Contributions and issue reports are welcome. Please keep the project’s core promise intact: **no forced cloud account, no background tracking, and no server required for the basic workflow**.

## 📜 License

Clicktrail is released under the [MIT License](LICENSE).
