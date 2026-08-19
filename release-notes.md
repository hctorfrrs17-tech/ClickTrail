## Clicktrail v0.1.1 — verified local-first hardening

Clicktrail v0.1.1 keeps visual workflow capture on the device and adds a verified hardened release flow. Recording is injected only when the user starts it, recording stops when the active tab moves to a different origin, and export images are rebuilt with redactions applied.

### Verified manually

This build was installed from an extracted ZIP in a clean Chromium profile. It captured a real click on `example.com`, automatically stopped on navigation to `iana.org`, opened the resulting guide in the editor, and exported a self-contained HTML guide. The exported output was checked for executable scripts and unsafe `javascript:` and `file:` URL schemes.

### Install

1. Download the ZIP below.
2. Extract it.
3. Open `chrome://extensions`.
4. Enable **Developer mode**.
5. Click **Load unpacked** and select the extracted folder containing `manifest.json`.

> Chrome cannot load the ZIP directly; extract it first.
