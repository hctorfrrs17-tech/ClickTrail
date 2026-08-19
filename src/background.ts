import { makeGuide, makeStep } from "./shared/guide";
import { readState, writeState } from "./shared/storage";
import type { RuntimeMessage } from "./shared/types";

async function updateBadge(recording: boolean) {
  await chrome.action.setBadgeText({ text: recording ? "REC" : "" });
  await chrome.action.setBadgeBackgroundColor({ color: "#4b7bff" });
}

async function notifyTab(tabId: number | undefined, recording: boolean) {
  if (!tabId) return;
  try {
    await chrome.tabs.sendMessage(tabId, { type: "SET_RECORDING_STATE", recording });
  } catch {
    // Browser internal pages cannot receive a content script. Capture remains safely disabled there.
  }
}

async function handleMessage(message: RuntimeMessage, sender: chrome.runtime.MessageSender) {
  if (message.type === "GET_STATE") return readState();

  if (message.type === "START_RECORDING") {
    const guide = makeGuide(message.tabTitle ? `${message.tabTitle} walkthrough` : "Untitled guide");
    await writeState({ recording: true, recordingTabId: message.tabId, guide });
    await updateBadge(true);
    await notifyTab(message.tabId, true);
    return { ok: true };
  }

  if (message.type === "STOP_RECORDING") {
    const state = await readState();
    await writeState({ ...state, recording: false, recordingTabId: undefined });
    await updateBadge(false);
    await notifyTab(state.recordingTabId, false);
    return { ok: true };
  }

  if (message.type === "CAPTURE_STEP") {
    const state = await readState();
    const sourceTab = sender.tab;
    if (!sourceTab || !state.recording || !state.guide || sourceTab.id !== state.recordingTabId) return { ok: false };

    let screenshot: string | undefined;
    try {
      screenshot = await chrome.tabs.captureVisibleTab(sourceTab.windowId, { format: "png" });
    } catch {
      // Some protected pages do not permit a screenshot. The step remains useful as a link and title.
    }

    const step = makeStep({ ...message.payload, screenshot });
    const guide = { ...state.guide, steps: [...state.guide.steps, step], updatedAt: Date.now() };
    await writeState({ ...state, guide });
    return { ok: true, step };
  }

  if (message.type === "UPDATE_GUIDE") {
    const state = await readState();
    await writeState({ ...state, guide: { ...message.guide, updatedAt: Date.now() } });
    return { ok: true };
  }

  if (message.type === "CLEAR_GUIDE") {
    const state = await readState();
    await writeState({ ...state, guide: undefined });
    return { ok: true };
  }

  if (message.type === "OPEN_EDITOR") {
    await chrome.tabs.create({ url: chrome.runtime.getURL("editor.html") });
    return { ok: true };
  }
}

chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse).catch((error) => sendResponse({ ok: false, error: String(error) }));
  return true;
});

chrome.runtime.onInstalled.addListener(() => updateBadge(false));
