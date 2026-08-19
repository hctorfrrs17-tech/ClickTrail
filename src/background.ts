import { makeGuide, makeStep } from "./shared/guide";
import { cleanText, isRecordableUrl, safeHttpUrl } from "./shared/security";
import { readState, writeState } from "./shared/storage";
import type { RuntimeMessage } from "./shared/types";

const MAX_STEPS_PER_GUIDE = 100;

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

function isExtensionPage(sender: chrome.runtime.MessageSender) {
  return sender.id === chrome.runtime.id && !sender.tab;
}

async function handleMessage(message: RuntimeMessage, sender: chrome.runtime.MessageSender) {
  if (!message || typeof message !== "object") return { ok: false, error: "Invalid extension message." };

  if (message.type === "GET_STATE") return isExtensionPage(sender) ? readState() : { ok: false, error: "Unauthorized state request." };

  if (message.type === "START_RECORDING") {
    if (!isExtensionPage(sender)) return { ok: false, error: "Only Clicktrail can start a recording." };
    const tab = await chrome.tabs.get(message.tabId);
    if (!tab.id || !isRecordableUrl(tab.url)) return { ok: false, error: "Clicktrail does not record browser, sign-in, payment, or sensitive pages." };
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
    const guide = makeGuide(tab.title ? `${cleanText(tab.title, "Untitled")} walkthrough` : "Untitled guide");
    await writeState({ recording: true, recordingTabId: tab.id, recordingOrigin: new URL(tab.url!).origin, guide });
    await updateBadge(true);
    await notifyTab(tab.id, true);
    return { ok: true };
  }

  if (message.type === "STOP_RECORDING") {
    if (!isExtensionPage(sender)) return { ok: false, error: "Only Clicktrail can stop a recording." };
    const state = await readState();
    await writeState({ ...state, recording: false, recordingTabId: undefined, recordingOrigin: undefined });
    await updateBadge(false);
    await notifyTab(state.recordingTabId, false);
    return { ok: true };
  }

  if (message.type === "CAPTURE_STEP") {
    const state = await readState();
    const sourceTab = sender.tab;
    if (!sourceTab || sender.id !== chrome.runtime.id || !state.recording || !state.guide || sourceTab.id !== state.recordingTabId) return { ok: false, error: "Untrusted capture request." };
    if (!isRecordableUrl(sourceTab.url) || state.guide.steps.length >= MAX_STEPS_PER_GUIDE) return { ok: false, error: "This page cannot be captured or the guide step limit was reached." };
    const captureUrl = safeHttpUrl(message.payload?.url ?? "");
    const tabUrl = safeHttpUrl(sourceTab.url ?? "");
    if (!captureUrl || !tabUrl || new URL(captureUrl).origin !== new URL(tabUrl).origin || new URL(captureUrl).origin !== state.recordingOrigin) return { ok: false, error: "The capture URL did not match the recording origin." };

    let screenshot: string | undefined;
    try {
      screenshot = await chrome.tabs.captureVisibleTab(sourceTab.windowId, { format: "png" });
    } catch {
      // Some protected pages do not permit a screenshot. The step remains useful as a link and title.
    }

    const step = makeStep({
      title: cleanText(message.payload.title, "Complete this step"),
      targetLabel: cleanText(message.payload.targetLabel, "Recorded action"),
      url: captureUrl,
      screenshot
    });
    const guide = { ...state.guide, steps: [...state.guide.steps, step], updatedAt: Date.now() };
    await writeState({ ...state, guide });
    return { ok: true, step };
  }

  if (message.type === "UPDATE_GUIDE") {
    if (!isExtensionPage(sender)) return { ok: false, error: "Only the local editor can update a guide." };
    const state = await readState();
    if (!message.guide || !Array.isArray(message.guide.steps) || message.guide.steps.length > MAX_STEPS_PER_GUIDE) return { ok: false, error: "Invalid guide data." };
    await writeState({ ...state, guide: { ...message.guide, updatedAt: Date.now() } });
    return { ok: true };
  }

  if (message.type === "CLEAR_GUIDE") {
    if (!isExtensionPage(sender)) return { ok: false, error: "Only Clicktrail can clear local data." };
    const state = await readState();
    await writeState({ ...state, guide: undefined });
    return { ok: true };
  }

  if (message.type === "OPEN_EDITOR") {
    if (!isExtensionPage(sender)) return { ok: false, error: "Only Clicktrail can open the editor." };
    await chrome.tabs.create({ url: chrome.runtime.getURL("editor.html") });
    return { ok: true };
  }
}

chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse).catch((error) => sendResponse({ ok: false, error: String(error) }));
  return true;
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "loading") return;
  const state = await readState();
  if (!state.recording || state.recordingTabId !== tabId) return;
  const nextUrl = safeHttpUrl(tab.url ?? "");
  if (nextUrl && new URL(nextUrl).origin === state.recordingOrigin) return;
  await writeState({ ...state, recording: false, recordingTabId: undefined, recordingOrigin: undefined });
  await updateBadge(false);
  await notifyTab(tabId, false);
});

chrome.runtime.onInstalled.addListener(() => updateBadge(false));
