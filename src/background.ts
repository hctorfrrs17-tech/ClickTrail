import { makeGuide, makeNavigationStep, makeStep } from "./shared/guide";
import { analyseLocally, ensureOllamaReady } from "./shared/ollama";
import { createSerialQueue } from "./shared/serial";
import { cleanText, isRecordableUrl, safeHttpUrl } from "./shared/security";
import { readState, writeState } from "./shared/storage";
import type { RuntimeMessage } from "./shared/types";

const MAX_STEPS_PER_GUIDE = 100;
const queueCapture = createSerialQueue();

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
    try {
      await ensureOllamaReady();
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Ollama local is required before recording." };
    }
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
    const guide = makeGuide(tab.title ? `${cleanText(tab.title, "Untitled")} walkthrough` : "Untitled guide");
    const navigationStep = makeNavigationStep(tab.url ?? "");
    if (navigationStep) guide.steps.push(navigationStep);
    await writeState({ recording: true, recordingTabId: tab.id, recordingOrigin: new URL(tab.url!).origin, guide, lastError: undefined });
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

    let analysis;
    try {
      analysis = await analyseLocally({ ...message.payload, url: captureUrl }, screenshot);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Ollama could not analyse this action.";
      await writeState({ ...state, recording: false, recordingTabId: undefined, recordingOrigin: undefined, lastError: errorMessage });
      await updateBadge(false);
      await notifyTab(sourceTab.id, false);
      return { ok: false, error: errorMessage };
    }
    const step = makeStep({
      title: analysis.title,
      note: analysis.note,
      targetLabel: cleanText(message.payload.targetLabel, "Recorded action"),
      actionKind: message.payload.actionKind,
      clickX: message.payload.clickX,
      clickY: message.payload.clickY,
      url: captureUrl,
      screenshot,
      autoRedactions: message.payload.autoRedactions
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
  const task = message?.type === "CAPTURE_STEP"
    ? queueCapture(() => handleMessage(message, sender))
    : handleMessage(message, sender);
  task.then(sendResponse).catch((error) => sendResponse({ ok: false, error: String(error) }));
  return true;
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const state = await readState();
  if (!state.recording || state.recordingTabId !== tabId) return;

  const nextUrl = safeHttpUrl(tab.url ?? "");
  const remainsOnRecordingOrigin = Boolean(nextUrl && new URL(nextUrl).origin === state.recordingOrigin);

  if (changeInfo.status === "loading") {
    if (remainsOnRecordingOrigin) return;
    await writeState({ ...state, recording: false, recordingTabId: undefined, recordingOrigin: undefined });
    await updateBadge(false);
    await notifyTab(tabId, false);
    return;
  }

  if (changeInfo.status !== "complete" || !remainsOnRecordingOrigin) return;
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
    await notifyTab(tabId, true);
  } catch {
    // A navigation can complete on a surface that no longer accepts content scripts; recording remains safely inert.
  }
});

chrome.runtime.onInstalled.addListener(() => updateBadge(false));
