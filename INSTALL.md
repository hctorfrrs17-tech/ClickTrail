# Install Clicktrail in Chrome or Edge 🧩

Clicktrail is an unpacked extension. It is designed to run entirely on your computer, so the installation process is different from clicking “Add to Chrome” in the Chrome Web Store.

## Quick installation

1. Download `clicktrail-chrome-extension-v0.1.1.zip` from **Releases**.
2. Right-click the ZIP and select **Extract All** on Windows, or double-click it on macOS.
3. Keep the extracted folder somewhere permanent. Do not select the ZIP itself.
4. Open `chrome://extensions` in Chrome. In Microsoft Edge, open `edge://extensions`.
5. Turn on **Developer mode**.
6. Click **Load unpacked**.
7. Choose the extracted folder containing `manifest.json`.
8. Pin the Clicktrail icon from Chrome’s extensions menu.

## If Chrome shows an error

| Message or problem | What to check |
| --- | --- |
| “Manifest file is missing or unreadable” | You selected the ZIP or a parent folder. Select the extracted folder that directly contains `manifest.json`. |
| The extension disappears after a restart | The extracted folder was moved or deleted. Extract it again to a permanent location and load it once more. |
| Recording does not start | Open a normal `https://` website. Chrome does not allow extensions to record internal `chrome://` pages. |
| A step has no screenshot | Some protected browser pages prevent screenshots. Clicktrail keeps the step title and URL so you can still edit or remove it. |

## Updating Clicktrail

Download the new ZIP, extract it into a new permanent folder, remove the old Clicktrail extension from `chrome://extensions`, then use **Load unpacked** again with the new folder.
